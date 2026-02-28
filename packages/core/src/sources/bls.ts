import { BaseSource, type SourceOptions } from "./base";
import type { SourceResult } from "../types";
import { retry } from "../utils/retry";
import { logger } from "../utils/logger";

interface BLSDataPoint {
  year: string;
  period: string;
  periodName: string;
  value: string;
  latest?: string;
  footnotes: Array<{ text?: string }>;
}

interface BLSSeries {
  seriesID: string;
  data: BLSDataPoint[];
}

interface BLSResponse {
  status: string;
  message: string[];
  Results?: {
    series: BLSSeries[];
  };
}

// Useful series for tech/startup industry trends
const DEFAULT_SERIES: Record<string, string> = {
  CES5000000001: "Information Sector Employment",
  CES6054150001: "Computer Systems Design Employment",
  CES6054100001: "Professional & Technical Services Employment",
};

export class BLSSource extends BaseSource {
  readonly name = "BLS Economic Data";
  readonly type = "bls";
  private readonly apiUrl = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
  private apiKey: string | undefined;
  private seriesIds: Record<string, string>;

  constructor(apiKey?: string, seriesIds?: Record<string, string>) {
    super(5); // conservative — 500 req/day with key, ~25/day without
    this.apiKey = apiKey ?? process.env.BLS_API_KEY;
    this.seriesIds = seriesIds ?? DEFAULT_SERIES;
  }

  async fetch(options: SourceOptions): Promise<SourceResult[]> {
    const { limit = 20 } = options;

    const currentYear = new Date().getFullYear();
    const data = await retry(() =>
      this.fetchSeries(Object.keys(this.seriesIds), currentYear - 2, currentYear)
    );

    if (!data) return [];

    return data
      .map((series) => this.seriesToResult(series))
      .filter((r): r is SourceResult => r !== null)
      .slice(0, limit);
  }

  private async fetchSeries(
    seriesIds: string[],
    startYear: number,
    endYear: number
  ): Promise<BLSSeries[] | null> {
    const body: Record<string, unknown> = {
      seriesid: seriesIds,
      startyear: String(startYear),
      endyear: String(endYear),
    };

    if (this.apiKey) {
      body.registrationkey = this.apiKey;
    }

    const resp = await this.throttledFetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ideator-bot/1.0",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      if (resp.status === 429) throw new Error("BLS rate limited");
      throw new Error(`BLS fetch failed: ${resp.status}`);
    }

    const json = (await resp.json()) as BLSResponse;
    if (json.status !== "REQUEST_SUCCEEDED") {
      logger.warn(`BLS API error: ${json.message.join(", ")}`);
      return null;
    }

    return json.Results?.series ?? null;
  }

  private seriesToResult(series: BLSSeries): SourceResult | null {
    if (!series.data || series.data.length === 0) return null;

    const latest = series.data[0];
    const previous = series.data.length > 12 ? series.data[12] : null;
    const label = this.seriesIds[series.seriesID] ?? series.seriesID;

    const latestVal = parseFloat(latest.value);
    const prevVal = previous ? parseFloat(previous.value) : null;
    const changeStr =
      prevVal !== null
        ? ` (${latestVal > prevVal ? "+" : ""}${(((latestVal - prevVal) / prevVal) * 100).toFixed(1)}% YoY)`
        : "";

    return {
      sourceType: this.type,
      title: `${label}: ${parseInt(latest.value, 10).toLocaleString()}K jobs`,
      url: `https://data.bls.gov/timeseries/${series.seriesID}`,
      content: `${label} latest value: ${latest.value}K (${latest.periodName} ${latest.year})${changeStr}. Tracks employment trends relevant to tech/startup ecosystem.`,
      score: latestVal,
      timestamp: `${latest.year}-${latest.period.replace("M", "").padStart(2, "0")}-01`,
      metadata: {
        seriesId: series.seriesID,
        latestValue: latest.value,
        year: latest.year,
        period: latest.periodName,
        dataPoints: series.data.length,
      },
    };
  }
}
