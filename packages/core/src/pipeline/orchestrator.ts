import type { Idea, PipelineEvent, PipelinePhase, PipelineRun } from "../types";
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
      sources: config.sources ?? this.registry.list().map((s) => s.type),
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
      // Phase 1: Discovery (no LLM)
      this.updatePhase(run, "discovery");
      const discovery = await runDiscovery(
        {
          query: config.query,
          sources: run.sources,
          limit: config.limit ?? 30,
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
      const research = await runResearch(discovery.results, config.query, emit);
      run.phaseOutputs.research = research;

      // Phase 3: Analysis (LLM)
      this.updatePhase(run, "analysis");
      const analysis = await runAnalysis(research, config.query, emit);
      run.phaseOutputs.analysis = analysis;

      // Phase 4: Validation (LLM)
      this.updatePhase(run, "validation");
      const validation = await runValidation(analysis.ideas, emit);
      run.phaseOutputs.validation = validation;

      // Phase 5: Output (LLM)
      this.updatePhase(run, "output");
      const ideas = await runOutput(
        analysis.ideas,
        validation,
        discovery.results,
        emit
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

// Allow running directly: bun run packages/core/src/pipeline/orchestrator.ts
if (import.meta.main) {
  const query = process.argv[2] ?? "B2B SaaS tools for small businesses";
  logger.info(`Running pipeline with query: "${query}"`);

  const orchestrator = new PipelineOrchestrator();
  orchestrator.onEvent((event) => {
    console.log(`[${event.phase}] ${event.message}`);
  });

  const result = await orchestrator.run({ query });
  console.log("\n=== RESULTS ===");
  console.log(JSON.stringify(result.results, null, 2));
}
