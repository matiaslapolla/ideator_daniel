import { BaseSource, type SourceOptions } from "./base";
import type { SourceResult } from "../types";
import Parser from "rss-parser";
import { logger } from "../utils/logger";

const DEFAULT_FEEDS = [
  "https://hnrss.org/newest?q=startup",
  "https://hnrss.org/newest?q=saas",
  "https://www.producthunt.com/feed",
  "https://feeds.feedburner.com/TechCrunch/startups",
  "https://blog.ycombinator.com/feed/",
  "https://lobste.rs/rss",
  "https://dev.to/feed/tag/startup",
  "https://dev.to/feed/tag/saas",
  "https://dev.to/feed/tag/webdev",
  "https://www.betalist.com/feed",
  "https://nodeweekly.com/rss/",
  "https://javascriptweekly.com/rss/",
];

export class RSSSource extends BaseSource {
  readonly name = "RSS Feeds";
  readonly type = "rss";
  private feeds: string[];
  private parser: Parser;

  constructor(feeds?: string[]) {
    super(20);
    this.feeds = feeds ?? DEFAULT_FEEDS;
    this.parser = new Parser({
      timeout: 10_000,
      headers: {
        "User-Agent": "ideator-bot/1.0",
      },
    });
  }

  async fetch(options: SourceOptions): Promise<SourceResult[]> {
    const { query, limit = 20 } = options;
    const queryLower = query.toLowerCase();

    const results = await Promise.allSettled(
      this.feeds.map((url) => this.fetchFeed(url, queryLower))
    );

    const allResults: SourceResult[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        allResults.push(...result.value);
      } else {
        logger.warn(`RSS feed failed: ${result.reason}`);
      }
    }

    return allResults.slice(0, limit);
  }

  private async fetchFeed(
    feedUrl: string,
    query: string
  ): Promise<SourceResult[]> {
    const feed = await this.parser.parseURL(feedUrl);
    const results: SourceResult[] = [];

    for (const item of feed.items ?? []) {
      const title = item.title ?? "";
      const content = item.contentSnippet ?? item.content ?? "";
      const text = `${title} ${content}`.toLowerCase();

      // Basic relevance filter
      if (
        query.split(" ").some((word) => text.includes(word.toLowerCase()))
      ) {
        results.push({
          sourceType: this.type,
          title,
          url: item.link,
          content: content.slice(0, 1000),
          timestamp: item.isoDate ?? item.pubDate,
          metadata: { feedTitle: feed.title, feedUrl },
        });
      }
    }

    return results;
  }
}
