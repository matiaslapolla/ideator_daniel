import { BaseSource, type SourceOptions } from "./base";
import type { SourceResult } from "../types";
import * as cheerio from "cheerio";
import { logger } from "../utils/logger";

const DEFAULT_URLS = [
  "https://www.indiehackers.com/",
  "https://microconf.com/blog",
];

export class WebScraperSource extends BaseSource {
  readonly name = "Web Scraper";
  readonly type = "web-scraper";
  private urls: string[];

  constructor(urls?: string[]) {
    super(10);
    this.urls = urls ?? DEFAULT_URLS;
  }

  async fetch(options: SourceOptions): Promise<SourceResult[]> {
    const { query, limit = 10 } = options;

    const results = await Promise.allSettled(
      this.urls.map((url) => this.scrapeUrl(url, query))
    );

    const allResults: SourceResult[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        allResults.push(...result.value);
      } else {
        logger.warn(`Scrape failed: ${result.reason}`);
      }
    }

    return allResults.slice(0, limit);
  }

  private async scrapeUrl(
    url: string,
    query: string
  ): Promise<SourceResult[]> {
    const resp = await this.throttledFetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ideator-bot/1.0; internal tool)",
      },
    });

    if (!resp.ok) throw new Error(`Scrape failed ${url}: ${resp.status}`);

    const html = await resp.text();
    const $ = cheerio.load(html);

    // Remove script/style tags
    $("script, style, nav, footer, header").remove();

    const results: SourceResult[] = [];
    const queryLower = query.toLowerCase();

    // Extract article-like elements
    $("article, .post, .entry, [class*='card'], [class*='item']").each(
      (_, el) => {
        const title =
          $(el).find("h1, h2, h3, a").first().text().trim() || "";
        const content = $(el).text().trim().slice(0, 500);
        const link =
          $(el).find("a").first().attr("href") ?? "";
        const text = `${title} ${content}`.toLowerCase();

        if (
          query.split(" ").some((word) => text.includes(word.toLowerCase()))
        ) {
          results.push({
            sourceType: this.type,
            title: title || "Untitled",
            url: link.startsWith("http") ? link : `${url}${link}`,
            content,
            timestamp: new Date().toISOString(),
            metadata: { sourceUrl: url },
          });
        }
      }
    );

    // Fallback: if no structured elements found, get paragraphs
    if (results.length === 0) {
      const bodyText = $("body").text().trim().slice(0, 2000);
      if (
        query
          .split(" ")
          .some((word) => bodyText.toLowerCase().includes(word.toLowerCase()))
      ) {
        results.push({
          sourceType: this.type,
          title: $("title").text().trim() || url,
          url,
          content: bodyText.slice(0, 1000),
          timestamp: new Date().toISOString(),
          metadata: { sourceUrl: url },
        });
      }
    }

    return results;
  }
}
