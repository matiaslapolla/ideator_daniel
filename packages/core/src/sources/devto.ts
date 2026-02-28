import { BaseSource, type SourceOptions } from "./base";
import type { SourceResult } from "../types";
import { retry } from "../utils/retry";

interface DevToArticle {
  id: number;
  title: string;
  url: string;
  description: string;
  published_at: string;
  positive_reactions_count: number;
  comments_count: number;
  tag_list: string[];
  user: { username: string };
}

const DEFAULT_TAGS = ["startup", "saas", "webdev", "productivity", "ai"];

export class DevToSource extends BaseSource {
  readonly name = "Dev.to";
  readonly type = "devto";
  private tags: string[];

  constructor(tags?: string[]) {
    super(30);
    this.tags = tags ?? DEFAULT_TAGS;
  }

  async fetch(options: SourceOptions): Promise<SourceResult[]> {
    const { query, limit = 20 } = options;
    const perTag = Math.ceil(limit / this.tags.length);

    const results = await Promise.allSettled(
      this.tags.map((tag) => retry(() => this.fetchTag(tag, perTag)))
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
        query.split(" ").some((w) => `${r.title} ${r.content}`.toLowerCase().includes(w.toLowerCase()))
      )
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);
  }

  private async fetchTag(tag: string, limit: number): Promise<SourceResult[]> {
    const params = new URLSearchParams({
      tag,
      per_page: String(limit),
    });

    const resp = await this.throttledFetch(
      `https://dev.to/api/articles?${params}`,
      {
        headers: { "User-Agent": "ideator-bot/1.0" },
      }
    );

    if (!resp.ok) {
      if (resp.status === 429) throw new Error("Dev.to rate limited");
      throw new Error(`Dev.to fetch failed: ${resp.status}`);
    }

    const articles = (await resp.json()) as DevToArticle[];
    return articles.map((a) => ({
      sourceType: this.type,
      title: a.title,
      url: a.url,
      content: a.description || a.title,
      score: a.positive_reactions_count,
      timestamp: a.published_at,
      metadata: {
        tags: a.tag_list,
        author: a.user.username,
        commentsCount: a.comments_count,
      },
    }));
  }
}
