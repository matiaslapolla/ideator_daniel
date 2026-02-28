import { BaseSource, type SourceOptions } from "./base";
import type { SourceResult } from "../types";
import { retry } from "../utils/retry";

interface PageviewData {
  items: Array<{
    article: string;
    views: number;
    timestamp: string;
  }>;
}

export class WikipediaSource extends BaseSource {
  readonly name = "Wikipedia Pageviews";
  readonly type = "wikipedia";

  constructor() {
    super(20);
  }

  async fetch(options: SourceOptions): Promise<SourceResult[]> {
    const { query, limit = 10 } = options;

    const topics = query.split(" ").filter((w) => w.length > 2);
    const results = await Promise.allSettled(
      topics.slice(0, limit).map((topic) =>
        retry(() => this.fetchPageviews(topic))
      )
    );

    const allResults: SourceResult[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        allResults.push(result.value);
      }
    }

    return allResults
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);
  }

  private async fetchPageviews(topic: string): Promise<SourceResult | null> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const fmt = (d: Date) =>
      d.toISOString().split("T")[0].replace(/-/g, "");

    const article = encodeURIComponent(
      topic.charAt(0).toUpperCase() + topic.slice(1)
    );

    const resp = await this.throttledFetch(
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${article}/daily/${fmt(start)}/${fmt(end)}`,
      {
        headers: {
          "User-Agent": "ideator-bot/1.0 (internal tool)",
        },
      }
    );

    if (!resp.ok) return null;

    const data = (await resp.json()) as PageviewData;
    if (!data.items || data.items.length === 0) return null;

    const totalViews = data.items.reduce((sum, d) => sum + d.views, 0);

    return {
      sourceType: this.type,
      title: `Wikipedia: ${topic}`,
      url: `https://en.wikipedia.org/wiki/${article}`,
      content: `"${topic}" received ${totalViews.toLocaleString()} Wikipedia pageviews in the last 30 days`,
      score: totalViews,
      timestamp: new Date().toISOString(),
      metadata: {
        dailyViews: data.items.map((d) => ({
          date: d.timestamp,
          views: d.views,
        })),
        totalViews,
      },
    };
  }
}
