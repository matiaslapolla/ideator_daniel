import { BaseSource, type SourceOptions } from "./base";
import type { SourceResult } from "../types";
import { retry } from "../utils/retry";

interface LobstersStory {
  short_id: string;
  title: string;
  url: string;
  description: string;
  score: number;
  comment_count: number;
  created_at: string;
  tags: string[];
  submitter_user: { username: string };
}

export class LobstersSource extends BaseSource {
  readonly name = "Lobste.rs";
  readonly type = "lobsters";

  constructor() {
    super(20);
  }

  async fetch(options: SourceOptions): Promise<SourceResult[]> {
    const { query, limit = 20 } = options;

    const stories = await retry(() => this.fetchHottest());

    const queryLower = query.toLowerCase();
    return stories
      .filter((s) =>
        query.split(" ").some((w) =>
          `${s.title} ${s.description} ${s.tags.join(" ")}`.toLowerCase().includes(w.toLowerCase())
        )
      )
      .slice(0, limit)
      .map((s) => ({
        sourceType: this.type,
        title: s.title,
        url: s.url || `https://lobste.rs/s/${s.short_id}`,
        content: s.description || s.title,
        score: s.score,
        timestamp: s.created_at,
        metadata: {
          tags: s.tags,
          author: s.submitter_user.username,
          commentsCount: s.comment_count,
        },
      }));
  }

  private async fetchHottest(): Promise<LobstersStory[]> {
    const resp = await this.throttledFetch("https://lobste.rs/hottest.json", {
      headers: { "User-Agent": "ideator-bot/1.0" },
    });

    if (!resp.ok) {
      if (resp.status === 429) throw new Error("Lobsters rate limited");
      throw new Error(`Lobsters fetch failed: ${resp.status}`);
    }

    return resp.json() as Promise<LobstersStory[]>;
  }
}
