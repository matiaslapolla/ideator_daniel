import type { SourceResult } from "../types";
import { RateLimiter } from "../utils/rate-limiter";

export interface SourceOptions {
  query: string;
  limit?: number;
}

export abstract class BaseSource {
  abstract readonly name: string;
  abstract readonly type: string;
  protected rateLimiter: RateLimiter;

  constructor(requestsPerMinute = 30) {
    this.rateLimiter = new RateLimiter(
      requestsPerMinute,
      60_000 / requestsPerMinute
    );
  }

  abstract fetch(options: SourceOptions): Promise<SourceResult[]>;

  protected async throttledFetch(url: string, init?: RequestInit): Promise<Response> {
    await this.rateLimiter.acquire();
    return fetch(url, init);
  }
}
