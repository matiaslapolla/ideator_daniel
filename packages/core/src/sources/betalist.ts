import { BaseSource, type SourceOptions } from "./base";
import type { SourceResult } from "../types";
import * as cheerio from "cheerio";
import { retry } from "../utils/retry";
import { logger } from "../utils/logger";

export class BetaListSource extends BaseSource {
  readonly name = "BetaList";
  readonly type = "betalist";

  constructor() {
    super(10);
  }

  async fetch(options: SourceOptions): Promise<SourceResult[]> {
    const { query, limit = 20 } = options;

    const results = await Promise.allSettled([
      retry(() => this.scrapePage("https://betalist.com/topics/saas")),
      retry(() => this.scrapePage("https://betalist.com/topics/tech")),
      retry(() => this.scrapePage("https://betalist.com/topics/artificial-intelligence")),
    ]);

    const allResults: SourceResult[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        allResults.push(...result.value);
      } else {
        logger.warn(`BetaList scrape failed: ${result.reason}`);
      }
    }

    const queryLower = query.toLowerCase();
    return allResults
      .filter((r) =>
        query.split(" ").some((w) =>
          `${r.title} ${r.content}`.toLowerCase().includes(w.toLowerCase())
        )
      )
      .slice(0, limit);
  }

  private async scrapePage(url: string): Promise<SourceResult[]> {
    const resp = await this.throttledFetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ideator-bot/1.0; internal tool)",
      },
    });

    if (!resp.ok) {
      throw new Error(`BetaList scrape failed ${url}: ${resp.status}`);
    }

    const html = await resp.text();
    const $ = cheerio.load(html);

    $("script, style, nav, footer").remove();

    const results: SourceResult[] = [];

    $(
      "article, [class*='startup'], [class*='card'], [class*='product'], .post"
    ).each((_, el) => {
      const title =
        $(el).find("h2, h3, h1, a[class*='title']").first().text().trim() ||
        "";
      const description =
        $(el)
          .find("p, [class*='description'], [class*='tagline']")
          .first()
          .text()
          .trim() || "";
      const link = $(el).find("a").first().attr("href") ?? "";

      if (title) {
        results.push({
          sourceType: this.type,
          title,
          url: link.startsWith("http")
            ? link
            : `https://betalist.com${link}`,
          content: description || title,
          timestamp: new Date().toISOString(),
          metadata: { sourceUrl: url },
        });
      }
    });

    return results;
  }
}
