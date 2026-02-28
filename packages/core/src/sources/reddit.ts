import { BaseSource, type SourceOptions } from "./base";
import type { SourceResult } from "../types";
import { retry } from "../utils/retry";

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    url: string;
    permalink: string;
    score: number;
    num_comments: number;
    created_utc: number;
    subreddit: string;
    author: string;
  };
}

interface RedditListing {
  data: {
    children: RedditPost[];
  };
}

const DEFAULT_SUBREDDITS = [
  "SaaS",
  "startups",
  "Entrepreneur",
  "smallbusiness",
  "AppIdeas",
  "indiehackers",
  "microsaas",
  "sideproject",
  "advancedentrepreneur",
  "webdev",
  "programming",
  "ProductManagement",
  "growmybusiness",
];

export class RedditSource extends BaseSource {
  readonly name = "Reddit";
  readonly type = "reddit";
  private subreddits: string[];

  constructor(subreddits?: string[]) {
    super(30); // 1 req/2s = 30/min
    this.subreddits = subreddits ?? DEFAULT_SUBREDDITS;
  }

  async fetch(options: SourceOptions): Promise<SourceResult[]> {
    const { query, limit = 20 } = options;
    const perSub = Math.ceil(limit / this.subreddits.length);

    const results = await Promise.allSettled(
      this.subreddits.map((sub) =>
        retry(() => this.searchSubreddit(sub, query, perSub))
      )
    );

    const allResults: SourceResult[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        allResults.push(...result.value);
      }
    }

    return allResults
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);
  }

  private async searchSubreddit(
    subreddit: string,
    query: string,
    limit: number
  ): Promise<SourceResult[]> {
    const params = new URLSearchParams({
      q: query,
      sort: "relevance",
      t: "month",
      limit: String(limit),
      restrict_sr: "1",
    });

    const resp = await this.throttledFetch(
      `https://old.reddit.com/r/${subreddit}/search.json?${params}`,
      {
        headers: {
          "User-Agent": "ideator-bot/1.0 (internal tool)",
        },
      }
    );

    if (!resp.ok) {
      if (resp.status === 429) {
        throw new Error("Reddit rate limited");
      }
      throw new Error(`Reddit search failed: ${resp.status}`);
    }

    const data = (await resp.json()) as RedditListing;
    return data.data.children.map((post) => ({
      sourceType: this.type,
      title: post.data.title,
      url: `https://reddit.com${post.data.permalink}`,
      content: post.data.selftext || post.data.title,
      score: post.data.score,
      timestamp: new Date(post.data.created_utc * 1000).toISOString(),
      metadata: {
        subreddit: post.data.subreddit,
        author: post.data.author,
        numComments: post.data.num_comments,
      },
    }));
  }
}
