import { BaseSource, type SourceOptions } from "./base";
import type { SourceResult } from "../types";
import { logger } from "../utils/logger";

export class GoogleTrendsSource extends BaseSource {
  readonly name = "Google Trends";
  readonly type = "google-trends";

  constructor() {
    super(10);
  }

  async fetch(options: SourceOptions): Promise<SourceResult[]> {
    const { query, limit = 10 } = options;

    try {
      const googleTrends = await import("google-trends-api");

      // Get related queries
      const relatedData = await googleTrends.default.relatedQueries({
        keyword: query,
        startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // last 90 days
        geo: "US",
      });

      const parsed = JSON.parse(relatedData);
      const results: SourceResult[] = [];

      const rankedQueries =
        parsed?.default?.rankedList?.[0]?.rankedKeyword ?? [];
      const risingQueries =
        parsed?.default?.rankedList?.[1]?.rankedKeyword ?? [];

      for (const item of [...risingQueries, ...rankedQueries].slice(
        0,
        limit
      )) {
        results.push({
          sourceType: this.type,
          title: `Trending: ${item.query}`,
          content: `Related search query "${item.query}" with value ${item.value} (${item.formattedValue}). ${item.hasData ? "Has search data." : ""}`,
          score: item.value ?? 0,
          timestamp: new Date().toISOString(),
          metadata: { formattedValue: item.formattedValue, link: item.link },
        });
      }

      return results;
    } catch (e) {
      logger.warn(`Google Trends fetch failed: ${e}`);
      return [];
    }
  }
}
