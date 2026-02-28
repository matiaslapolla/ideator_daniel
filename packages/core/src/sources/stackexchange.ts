import { BaseSource, type SourceOptions } from "./base";
import type { SourceResult } from "../types";
import { retry } from "../utils/retry";

interface SEQuestion {
  question_id: number;
  title: string;
  link: string;
  body?: string;
  score: number;
  view_count: number;
  answer_count: number;
  creation_date: number;
  tags: string[];
  owner: { display_name: string };
}

interface SEResponse {
  items: SEQuestion[];
  has_more: boolean;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export class StackExchangeSource extends BaseSource {
  readonly name = "Stack Exchange";
  readonly type = "stackexchange";

  constructor() {
    super(5); // 300 req/day ≈ 5/min to be safe
  }

  async fetch(options: SourceOptions): Promise<SourceResult[]> {
    const { query, limit = 20 } = options;

    const data = await retry(() => this.searchQuestions(query, limit));

    return data.items.slice(0, limit).map((q) => ({
      sourceType: this.type,
      title: q.title,
      url: q.link,
      content: q.body ? stripHtml(q.body).slice(0, 1000) : q.title,
      score: q.score,
      timestamp: new Date(q.creation_date * 1000).toISOString(),
      metadata: {
        tags: q.tags,
        answerCount: q.answer_count,
        viewCount: q.view_count,
        author: q.owner.display_name,
      },
    }));
  }

  private async searchQuestions(
    query: string,
    limit: number
  ): Promise<SEResponse> {
    const params = new URLSearchParams({
      q: query,
      site: "stackoverflow",
      sort: "votes",
      order: "desc",
      pagesize: String(Math.min(limit, 100)),
      filter: "withbody",
    });

    const resp = await this.throttledFetch(
      `https://api.stackexchange.com/2.3/search/advanced?${params}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "ideator-bot/1.0",
          "Accept-Encoding": "gzip",
        },
      }
    );

    if (!resp.ok) {
      if (resp.status === 429) throw new Error("StackExchange rate limited");
      throw new Error(`StackExchange search failed: ${resp.status}`);
    }

    return resp.json() as Promise<SEResponse>;
  }
}
