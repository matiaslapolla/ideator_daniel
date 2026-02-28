import { BaseSource, type SourceOptions } from "./base";
import type { SourceResult } from "../types";
import { retry } from "../utils/retry";

interface HNItem {
  id: number;
  title?: string;
  url?: string;
  text?: string;
  score?: number;
  by?: string;
  time?: number;
  descendants?: number;
  type?: string;
}

const STORY_ENDPOINTS = [
  "showstories",
  "askstories",
  "jobstories",
] as const;

export class HNFirebaseSource extends BaseSource {
  readonly name = "HN Show/Ask/Jobs";
  readonly type = "hn-firebase";
  private readonly baseUrl = "https://hacker-news.firebaseio.com/v0";

  constructor() {
    super(30);
  }

  async fetch(options: SourceOptions): Promise<SourceResult[]> {
    const { query, limit = 20 } = options;
    const perEndpoint = Math.ceil(limit / STORY_ENDPOINTS.length);

    const results = await Promise.allSettled(
      STORY_ENDPOINTS.map((ep) =>
        retry(() => this.fetchStoryList(ep, perEndpoint))
      )
    );

    const allResults: SourceResult[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        allResults.push(...result.value);
      }
    }

    const queryLower = query.toLowerCase();
    return allResults
      .filter((r) =>
        query.split(" ").some((w) =>
          `${r.title} ${r.content}`.toLowerCase().includes(w.toLowerCase())
        )
      )
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);
  }

  private async fetchStoryList(
    endpoint: string,
    limit: number
  ): Promise<SourceResult[]> {
    const resp = await this.throttledFetch(`${this.baseUrl}/${endpoint}.json`);
    if (!resp.ok) throw new Error(`HN Firebase ${endpoint} failed: ${resp.status}`);

    const ids = (await resp.json()) as number[];
    const batch = ids.slice(0, limit);

    const items = await Promise.allSettled(
      batch.map((id) => this.fetchItem(id))
    );

    const results: SourceResult[] = [];
    for (const item of items) {
      if (item.status === "fulfilled" && item.value) {
        const i = item.value;
        results.push({
          sourceType: this.type,
          title: i.title || "Untitled",
          url: i.url || `https://news.ycombinator.com/item?id=${i.id}`,
          content: i.text || i.title || "",
          score: i.score,
          timestamp: i.time
            ? new Date(i.time * 1000).toISOString()
            : undefined,
          metadata: {
            author: i.by,
            commentsCount: i.descendants,
            storyType: i.type,
          },
        });
      }
    }

    return results;
  }

  private async fetchItem(id: number): Promise<HNItem | null> {
    const resp = await this.throttledFetch(`${this.baseUrl}/item/${id}.json`);
    if (!resp.ok) return null;
    return resp.json() as Promise<HNItem>;
  }
}
