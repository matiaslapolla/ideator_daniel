import type { BaseSource, SourceOptions } from "./base";
import type { SourceResult } from "../types";
import { logger } from "../utils/logger";

export class SourceRegistry {
  private sources = new Map<string, BaseSource>();

  register(source: BaseSource): void {
    this.sources.set(source.type, source);
    logger.debug(`Registered source: ${source.name} (${source.type})`);
  }

  get(type: string): BaseSource | undefined {
    return this.sources.get(type);
  }

  list(): Array<{ name: string; type: string }> {
    return Array.from(this.sources.values()).map((s) => ({
      name: s.name,
      type: s.type,
    }));
  }

  /**
   * Fetch from specified sources (or all) concurrently.
   */
  async fetchAll(
    options: SourceOptions,
    sourceTypes?: string[]
  ): Promise<SourceResult[]> {
    const targets = sourceTypes
      ? sourceTypes
          .map((t) => this.sources.get(t))
          .filter((s): s is BaseSource => !!s)
      : Array.from(this.sources.values());

    if (targets.length === 0) {
      logger.warn("No sources to fetch from");
      return [];
    }

    logger.info(
      `Fetching from ${targets.length} sources: ${targets.map((s) => s.name).join(", ")}`
    );

    const results = await Promise.allSettled(
      targets.map((source) =>
        source.fetch(options).then((r) => {
          logger.info(`${source.name}: fetched ${r.length} results`);
          return r;
        })
      )
    );

    const allResults: SourceResult[] = [];
    for (const [i, result] of results.entries()) {
      if (result.status === "fulfilled") {
        allResults.push(...result.value);
      } else {
        logger.error(
          `Source ${targets[i].name} failed: ${result.reason}`
        );
      }
    }

    return allResults;
  }
}
