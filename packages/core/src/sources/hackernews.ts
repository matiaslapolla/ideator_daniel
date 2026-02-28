import { BaseSource, type SourceOptions } from "./base";
import type { SourceResult } from "../types";
import { retry } from "../utils/retry";

interface HNSearchHit {
  objectID: string;
  title: string;
  url?: string;
  story_text?: string;
  comment_text?: string;
  points: number;
  num_comments: number;
  created_at: string;
  author: string;
}

interface HNSearchResponse {
  hits: HNSearchHit[];
  nbHits: number;
}

export class HackerNewsSource extends BaseSource {
  readonly name = "Hacker News";
  readonly type = "hackernews";
  private readonly algoliaUrl = "https://hn.algolia.com/api/v1";

  constructor() {
    super(30); // generous rate limit
  }

  async fetch(options: SourceOptions): Promise<SourceResult[]> {
    const { query, limit = 20 } = options;

    const results = await retry(() => this.searchStories(query, limit));

    return results.hits.slice(0, limit).map((hit) => ({
      sourceType: this.type,
      title: hit.title || "Untitled",
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      content:
        hit.story_text || hit.comment_text || hit.title || "",
      score: hit.points,
      timestamp: hit.created_at,
      metadata: {
        author: hit.author,
        numComments: hit.num_comments,
        hnId: hit.objectID,
      },
    }));
  }

  private async searchStories(
    query: string,
    limit: number
  ): Promise<HNSearchResponse> {
    const params = new URLSearchParams({
      query,
      tags: "story",
      hitsPerPage: String(limit),
    });
    const resp = await this.throttledFetch(
      `${this.algoliaUrl}/search?${params}`
    );
    if (!resp.ok) throw new Error(`HN search failed: ${resp.status}`);
    return resp.json() as Promise<HNSearchResponse>;
  }
}
