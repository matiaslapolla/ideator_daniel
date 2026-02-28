import { BaseSource, type SourceOptions } from "./base";
import type { SourceResult } from "../types";
import { retry } from "../utils/retry";

interface GitHubRepo {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  language: string | null;
  topics: string[];
  owner: { login: string };
}

interface GitHubSearchResponse {
  total_count: number;
  items: GitHubRepo[];
}

export class GitHubSource extends BaseSource {
  readonly name = "GitHub";
  readonly type = "github";

  constructor() {
    super(10); // 10 req/min unauthenticated
  }

  async fetch(options: SourceOptions): Promise<SourceResult[]> {
    const { query, limit = 20 } = options;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dateStr = ninetyDaysAgo.toISOString().split("T")[0];

    const results = await retry(() => this.searchRepos(query, dateStr, limit));

    return results.items.slice(0, limit).map((repo) => ({
      sourceType: this.type,
      title: repo.full_name,
      url: repo.html_url,
      content: repo.description || repo.full_name,
      score: repo.stargazers_count,
      timestamp: repo.created_at,
      metadata: {
        language: repo.language,
        topics: repo.topics,
        forks: repo.forks_count,
        owner: repo.owner.login,
      },
    }));
  }

  private async searchRepos(
    query: string,
    createdAfter: string,
    limit: number
  ): Promise<GitHubSearchResponse> {
    const params = new URLSearchParams({
      q: `${query} created:>${createdAfter}`,
      sort: "stars",
      order: "desc",
      per_page: String(Math.min(limit, 100)),
    });

    const resp = await this.throttledFetch(
      `https://api.github.com/search/repositories?${params}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "ideator-bot/1.0",
        },
      }
    );

    if (!resp.ok) {
      if (resp.status === 403 || resp.status === 429) {
        throw new Error("GitHub rate limited");
      }
      throw new Error(`GitHub search failed: ${resp.status}`);
    }

    return resp.json() as Promise<GitHubSearchResponse>;
  }
}
