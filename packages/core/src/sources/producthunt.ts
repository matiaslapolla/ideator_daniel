import { BaseSource, type SourceOptions } from "./base";
import type { SourceResult } from "../types";
import { retry } from "../utils/retry";
import { logger } from "../utils/logger";

interface PHNode {
  name: string;
  tagline: string;
  url: string;
  votesCount: number;
  createdAt: string;
  topics: { edges: Array<{ node: { name: string } }> };
  makers: { edges: Array<{ node: { name: string; username: string } }> };
}

interface PHResponse {
  data?: {
    posts: {
      edges: Array<{ node: PHNode }>;
    };
  };
  errors?: Array<{ message: string }>;
}

const GRAPHQL_QUERY = `
  query($first: Int!) {
    posts(first: $first, order: VOTES) {
      edges {
        node {
          name
          tagline
          url
          votesCount
          createdAt
          topics(first: 5) { edges { node { name } } }
          makers(first: 5) { edges { node { name username } } }
        }
      }
    }
  }
`;

export class ProductHuntSource extends BaseSource {
  readonly name = "Product Hunt";
  readonly type = "producthunt";
  private readonly apiUrl = "https://api.producthunt.com/v2/api/graphql";
  private token: string | undefined;

  constructor(token?: string) {
    super(20);
    this.token = token ?? process.env.PRODUCTHUNT_TOKEN;
  }

  async fetch(options: SourceOptions): Promise<SourceResult[]> {
    if (!this.token) {
      logger.warn("Product Hunt: no PRODUCTHUNT_TOKEN set, skipping");
      return [];
    }

    const { query, limit = 20 } = options;

    const data = await retry(() => this.fetchPosts(limit));
    if (!data) return [];

    const queryLower = query.toLowerCase();
    return data
      .filter((p) =>
        query.split(" ").some((w) =>
          `${p.name} ${p.tagline} ${p.topics.edges.map((e) => e.node.name).join(" ")}`
            .toLowerCase()
            .includes(w.toLowerCase())
        )
      )
      .slice(0, limit)
      .map((p) => ({
        sourceType: this.type,
        title: p.name,
        url: p.url,
        content: p.tagline,
        score: p.votesCount,
        timestamp: p.createdAt,
        metadata: {
          topics: p.topics.edges.map((e) => e.node.name),
          makers: p.makers.edges.map((e) => e.node.name),
        },
      }));
  }

  private async fetchPosts(limit: number): Promise<PHNode[] | null> {
    const resp = await this.throttledFetch(this.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "User-Agent": "ideator-bot/1.0",
      },
      body: JSON.stringify({
        query: GRAPHQL_QUERY,
        variables: { first: Math.min(limit, 20) },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 401) {
        logger.warn("Product Hunt: invalid token");
        return null;
      }
      if (resp.status === 429) throw new Error("Product Hunt rate limited");
      throw new Error(`Product Hunt fetch failed: ${resp.status}`);
    }

    const json = (await resp.json()) as PHResponse;
    if (json.errors) {
      logger.warn(`Product Hunt GraphQL errors: ${json.errors[0].message}`);
      return null;
    }

    return json.data?.posts.edges.map((e) => e.node) ?? [];
  }
}
