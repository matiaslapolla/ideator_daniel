import { BaseSource, type SourceOptions } from "./base";
import type { SourceResult } from "../types";
import { retry } from "../utils/retry";

interface NpmSearchResult {
  objects: Array<{
    package: {
      name: string;
      description: string;
      links: { npm: string; repository?: string };
      date: string;
      keywords?: string[];
      author?: { name: string };
    };
  }>;
}

interface NpmDownloads {
  downloads: number;
  package: string;
  start: string;
  end: string;
}

export class NpmDownloadsSource extends BaseSource {
  readonly name = "npm Downloads";
  readonly type = "npm-downloads";

  constructor() {
    super(20);
  }

  async fetch(options: SourceOptions): Promise<SourceResult[]> {
    const { query, limit = 20 } = options;

    const searchData = await retry(() => this.searchPackages(query, limit));
    const packages = searchData.objects.slice(0, limit);

    const withDownloads = await Promise.allSettled(
      packages.map(async (obj) => {
        const pkg = obj.package;
        const downloads = await this.getDownloads(pkg.name);
        return {
          sourceType: this.type,
          title: pkg.name,
          url: pkg.links.npm,
          content: pkg.description || pkg.name,
          score: downloads,
          timestamp: pkg.date,
          metadata: {
            keywords: pkg.keywords,
            author: pkg.author?.name,
            monthlyDownloads: downloads,
            repository: pkg.links.repository,
          },
        } satisfies SourceResult;
      })
    );

    const results: SourceResult[] = [];
    for (const r of withDownloads) {
      if (r.status === "fulfilled") {
        results.push(r.value);
      }
    }

    return results
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);
  }

  private async searchPackages(
    query: string,
    limit: number
  ): Promise<NpmSearchResult> {
    const params = new URLSearchParams({
      text: query,
      size: String(Math.min(limit, 250)),
    });

    const resp = await this.throttledFetch(
      `https://registry.npmjs.org/-/v1/search?${params}`,
      {
        headers: { "User-Agent": "ideator-bot/1.0" },
      }
    );

    if (!resp.ok) throw new Error(`npm search failed: ${resp.status}`);
    return resp.json() as Promise<NpmSearchResult>;
  }

  private async getDownloads(pkg: string): Promise<number> {
    try {
      const resp = await this.throttledFetch(
        `https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(pkg)}`
      );
      if (!resp.ok) return 0;
      const data = (await resp.json()) as NpmDownloads;
      return data.downloads;
    } catch {
      return 0;
    }
  }
}
