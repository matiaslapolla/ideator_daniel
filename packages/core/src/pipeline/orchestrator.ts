import type { Idea, PipelineEvent, PipelinePhase, PipelineRun, Domain, CustomSources } from "../types";
import { SourceRegistry } from "../sources/registry";
import { HackerNewsSource } from "../sources/hackernews";
import { RedditSource } from "../sources/reddit";
import { GoogleTrendsSource } from "../sources/google-trends";
import { RSSSource } from "../sources/rss";
import { WebScraperSource } from "../sources/web-scraper";
import { DevToSource } from "../sources/devto";
import { LobstersSource } from "../sources/lobsters";
import { GitHubSource } from "../sources/github";
import { StackExchangeSource } from "../sources/stackexchange";
import { HNFirebaseSource } from "../sources/hn-firebase";
import { WikipediaSource } from "../sources/wikipedia";
import { NpmDownloadsSource } from "../sources/npm-downloads";
import { ProductHuntSource } from "../sources/producthunt";
import { BetaListSource } from "../sources/betalist";
import { AlternativeToSource } from "../sources/alternativeto";
import { BLSSource } from "../sources/bls";
import { IdeaRepository } from "../storage/repository";
import { initDb } from "../storage/db";
import { logger } from "../utils/logger";
import { runDiscovery } from "./phases/discovery";
import { runResearch } from "./phases/research";
import { runAnalysis } from "./phases/analysis";
import { runValidation } from "./phases/validation";
import { runOutput } from "./phases/output";

export type PipelineEventHandler = (event: PipelineEvent) => void;

export interface PipelineConfig {
  query: string;
  sources?: string[];
  limit?: number;
  runId?: string;
  domain?: Domain;
  creativity?: number; // 0-100, maps to LLM temperature
  customSources?: CustomSources;
  onlyCustomSources?: boolean;
}

function creativityToTemperature(creativity: number): number {
  // 0 → 0.3, 50 → 0.9, 100 → 1.5
  const clamped = Math.max(0, Math.min(100, creativity));
  return 0.3 + (clamped / 100) * 1.2;
}

export class PipelineOrchestrator {
  private registry: SourceRegistry;
  private repo: IdeaRepository;
  private handlers: PipelineEventHandler[] = [];

  constructor() {
    this.registry = new SourceRegistry();
    this.repo = new IdeaRepository();

    // Register all sources
    this.registry.register(new HackerNewsSource());
    this.registry.register(new RedditSource());
    this.registry.register(new GoogleTrendsSource());
    this.registry.register(new RSSSource());
    this.registry.register(new WebScraperSource());
    this.registry.register(new DevToSource());
    this.registry.register(new LobstersSource());
    this.registry.register(new GitHubSource());
    this.registry.register(new StackExchangeSource());
    this.registry.register(new HNFirebaseSource());
    this.registry.register(new WikipediaSource());
    this.registry.register(new NpmDownloadsSource());
    if (process.env.PRODUCTHUNT_TOKEN) {
      this.registry.register(new ProductHuntSource());
    }
    this.registry.register(new BetaListSource());
    this.registry.register(new AlternativeToSource());
    if (process.env.BLS_API_KEY) {
      this.registry.register(new BLSSource());
    }
  }

  onEvent(handler: PipelineEventHandler): void {
    this.handlers.push(handler);
  }

  getRegistry(): SourceRegistry {
    return this.registry;
  }

  getRepository(): IdeaRepository {
    return this.repo;
  }

  async run(config: PipelineConfig): Promise<PipelineRun> {
    initDb();

    const runId = config.runId ?? crypto.randomUUID();
    const run: PipelineRun = {
      id: runId,
      status: "running",
      currentPhase: "discovery",
      query: config.query,
      sources: config.sources ?? (() => {
        if (config.onlyCustomSources && config.customSources) {
          const types: string[] = [];
          if (config.customSources.redditSubreddits?.length) types.push("reddit");
          if (config.customSources.rssFeeds?.length) types.push("rss");
          if (types.length > 0) return types;
        }
        return this.registry.list().map((s) => s.type);
      })(),
      results: [],
      phaseOutputs: {},
      createdAt: new Date().toISOString(),
    };

    this.repo.createPipelineRun(run);

    const emit = (partial: Partial<PipelineEvent>) => {
      const event: PipelineEvent = {
        runId,
        phase: partial.phase ?? run.currentPhase ?? "discovery",
        status: partial.status ?? "running",
        message: partial.message ?? "",
        data: partial.data,
        timestamp: new Date().toISOString(),
      };
      for (const h of this.handlers) {
        try {
          h(event);
        } catch (e) {
          logger.error("Event handler error", e);
        }
      }
    };

    try {
      // Apply custom sources (reset first to avoid accumulation across runs)
      const redditSource = this.registry.get("reddit") as RedditSource | undefined;
      const rssSource = this.registry.get("rss") as RSSSource | undefined;
      redditSource?.resetToDefaults();
      rssSource?.resetToDefaults();
      if (config.customSources?.redditSubreddits?.length) {
        redditSource?.addSubreddits(config.customSources.redditSubreddits);
      }
      if (config.customSources?.rssFeeds?.length) {
        rssSource?.addFeeds(config.customSources.rssFeeds);
      }

      // Compute temperature from creativity (default 50 → 0.9)
      const temperature = creativityToTemperature(config.creativity ?? 50);
      const phaseOptions = { temperature, domain: config.domain };

      // Phase 1: Discovery (no LLM)
      this.updatePhase(run, "discovery");
      const discovery = await runDiscovery(
        {
          query: config.query,
          sources: run.sources,
          limit: config.limit ?? 50,
        },
        this.registry,
        emit
      );
      run.phaseOutputs.discovery = discovery;

      if (discovery.results.length === 0) {
        throw new Error("No data found from any source. Try a different query or enable more sources.");
      }

      // Phase 2: Research (LLM)
      this.updatePhase(run, "research");
      const research = await runResearch(discovery.results, config.query, emit, phaseOptions);
      run.phaseOutputs.research = research;

      // Phase 3: Analysis (LLM)
      this.updatePhase(run, "analysis");
      const analysis = await runAnalysis(research, config.query, emit, phaseOptions);
      run.phaseOutputs.analysis = analysis;

      // Phase 4: Validation (LLM)
      this.updatePhase(run, "validation");
      const validation = await runValidation(analysis.ideas, emit, phaseOptions);
      run.phaseOutputs.validation = validation;

      // Phase 5: Output (LLM)
      this.updatePhase(run, "output");
      const ideas = await runOutput(
        analysis.ideas,
        validation,
        discovery.results,
        emit,
        phaseOptions
      );
      run.results = ideas;

      // Persist ideas
      for (const idea of ideas) {
        this.repo.createIdea(idea);
      }

      // Mark complete
      run.status = "completed";
      run.completedAt = new Date().toISOString();
      this.repo.updatePipelineRun(run.id, {
        status: "completed",
        results: run.results,
        phaseOutputs: run.phaseOutputs,
        completedAt: run.completedAt,
      });

      emit({ message: "Pipeline complete!", status: "completed" });
      logger.info(`Pipeline ${runId} completed with ${ideas.length} ideas`);

      return run;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      run.status = "failed";
      run.error = msg;
      this.repo.updatePipelineRun(run.id, {
        status: "failed",
        error: msg,
        phaseOutputs: run.phaseOutputs,
      });
      emit({ message: `Pipeline failed: ${msg}`, status: "failed" });
      logger.error(`Pipeline ${runId} failed: ${msg}`);
      return run;
    }
  }

  private updatePhase(run: PipelineRun, phase: PipelinePhase): void {
    run.currentPhase = phase;
    this.repo.updatePipelineRun(run.id, { currentPhase: phase });
  }
}

// Allow running directly: bun run packages/core/src/pipeline/orchestrator.ts "query" [--domain X] [--creativity N] [--subreddits a,b] [--feeds url1,url2]
if (import.meta.main) {
  const args = process.argv.slice(2);
  let query = "B2B SaaS tools for small businesses";
  let domain: string | undefined;
  let creativity: number | undefined;
  let subreddits: string[] | undefined;
  let feeds: string[] | undefined;

  // First non-flag arg is the query
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--domain" && args[i + 1]) {
      domain = args[++i];
    } else if (args[i] === "--creativity" && args[i + 1]) {
      creativity = Number(args[++i]);
    } else if (args[i] === "--subreddits" && args[i + 1]) {
      subreddits = args[++i].split(",").map(s => s.trim()).filter(Boolean);
    } else if (args[i] === "--feeds" && args[i + 1]) {
      feeds = args[++i].split(",").map(s => s.trim()).filter(Boolean);
    } else if (!args[i].startsWith("--")) {
      positional.push(args[i]);
    }
  }

  if (positional.length > 0) query = positional.join(" ");

  // Validate domain if provided
  if (domain) {
    const { DomainSchema } = await import("../types");
    const parsed = DomainSchema.safeParse(domain);
    if (!parsed.success) {
      console.error(`Invalid domain "${domain}". Valid: SaaS, Fintech, Health, Education, E-commerce, DevTools, AI/ML, Marketplace, Social, Gaming, Sustainability`);
      process.exit(1);
    }
    domain = parsed.data;
  }

  // Validate creativity if provided
  if (creativity !== undefined && (isNaN(creativity) || creativity < 0 || creativity > 100)) {
    console.error("Creativity must be a number between 0 and 100");
    process.exit(1);
  }

  const customSources = (subreddits?.length || feeds?.length)
    ? { redditSubreddits: subreddits, rssFeeds: feeds }
    : undefined;

  logger.info(`Running pipeline with query: "${query}"`);
  if (domain) logger.info(`  Domain: ${domain}`);
  if (creativity !== undefined) logger.info(`  Creativity: ${creativity}`);
  if (customSources) logger.info(`  Custom sources: ${JSON.stringify(customSources)}`);

  const orchestrator = new PipelineOrchestrator();
  orchestrator.onEvent((event) => {
    console.log(`[${event.phase}] ${event.message}`);
  });

  const result = await orchestrator.run({
    query,
    domain: domain as Domain | undefined,
    creativity,
    customSources,
  });
  console.log("\n=== RESULTS ===");
  console.log(JSON.stringify(result.results, null, 2));
}
