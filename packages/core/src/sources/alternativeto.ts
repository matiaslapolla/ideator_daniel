import { BaseSource, type SourceOptions } from "./base";
import type { SourceResult } from "../types";
import * as cheerio from "cheerio";
import { retry } from "../utils/retry";
import { logger } from "../utils/logger";

export class AlternativeToSource extends BaseSource {
  readonly name = "AlternativeTo";
  readonly type = "alternativeto";

  constructor() {
    super(10);
  }

  async fetch(options: SourceOptions): Promise<SourceResult[]> {
    const { query, limit = 20 } = options;

    const results = await retry(() => this.scrapeSearch(query, limit));
    return results.slice(0, limit);
  }

  private async scrapeSearch(
    query: string,
    limit: number
  ): Promise<SourceResult[]> {
    const params = new URLSearchParams({ q: query });
    const resp = await this.throttledFetch(
      `https://alternativeto.net/browse/search/?${params}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; ideator-bot/1.0; internal tool)",
          Accept: "text/html",
        },
      }
    );

    if (!resp.ok) {
      if (resp.status === 429) throw new Error("AlternativeTo rate limited");
      throw new Error(`AlternativeTo scrape failed: ${resp.status}`);
    }

    const html = await resp.text();
    const $ = cheerio.load(html);

    $("script, style, nav, footer").remove();

    const results: SourceResult[] = [];

    $(
      "[class*='app-card'], [class*='AppCard'], article, [data-testid*='app']"
    ).each((_, el) => {
      const title =
        $(el).find("h2, h3, [class*='name'], [class*='title']").first().text().trim() || "";
      const description =
        $(el)
          .find("p, [class*='description'], [class*='tagline']")
          .first()
          .text()
          .trim() || "";
      const link = $(el).find("a").first().attr("href") ?? "";
      const likesText =
        $(el).find("[class*='like'], [class*='vote']").first().text().trim() || "";
      const likes = parseInt(likesText.replace(/\D/g, ""), 10) || undefined;

      if (title) {
        results.push({
          sourceType: this.type,
          title,
          url: link.startsWith("http")
            ? link
            : `https://alternativeto.net${link}`,
          content: description || title,
          score: likes,
          timestamp: new Date().toISOString(),
          metadata: { sourceUrl: "alternativeto.net" },
        });
      }
    });

    // Fallback if no structured cards found
    if (results.length === 0) {
      $("a[href*='/software/']").each((_, el) => {
        const title = $(el).text().trim();
        const href = $(el).attr("href") ?? "";
        if (title && href) {
          results.push({
            sourceType: this.type,
            title,
            url: href.startsWith("http")
              ? href
              : `https://alternativeto.net${href}`,
            content: title,
            timestamp: new Date().toISOString(),
            metadata: { sourceUrl: "alternativeto.net" },
          });
        }
      });
    }

    return results;
  }
}
