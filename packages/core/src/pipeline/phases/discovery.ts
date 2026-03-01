import type { SourceResult, PipelineEvent } from "../../types";
import { SourceRegistry } from "../../sources/registry";
import { logger } from "../../utils/logger";

export interface DiscoveryInput {
  query: string;
  sources: string[];
  limit?: number;
}

export interface DiscoveryOutput {
  results: SourceResult[];
  totalFetched: number;
  sourceBreakdown: Record<string, number>;
}

/**
 * Distribute results evenly across source types using round-robin fill.
 */
function balanceSourceResults(
  results: SourceResult[],
  totalLimit: number
): SourceResult[] {
  const bySource = new Map<string, SourceResult[]>();
  for (const r of results) {
    const arr = bySource.get(r.sourceType) ?? [];
    arr.push(r);
    bySource.set(r.sourceType, arr);
  }

  const balanced: SourceResult[] = [];
  const sources = [...bySource.keys()];
  const indices = new Map<string, number>(sources.map((s) => [s, 0]));

  while (balanced.length < totalLimit) {
    let added = false;
    for (const source of sources) {
      const idx = indices.get(source)!;
      const items = bySource.get(source)!;
      if (idx < items.length) {
        balanced.push(items[idx]);
        indices.set(source, idx + 1);
        added = true;
        if (balanced.length >= totalLimit) break;
      }
    }
    if (!added) break;
  }

  return balanced;
}

export async function runDiscovery(
  input: DiscoveryInput,
  registry: SourceRegistry,
  emit: (event: Partial<PipelineEvent>) => void
): Promise<DiscoveryOutput> {
  emit({ message: `Starting discovery for "${input.query}"`, phase: "discovery" });

  const limit = input.limit ?? 30;
  const rawResults = await registry.fetchAll(
    { query: input.query, limit },
    input.sources.length > 0 ? input.sources : undefined
  );

  const results = balanceSourceResults(rawResults, limit);

  const sourceBreakdown: Record<string, number> = {};
  for (const r of results) {
    sourceBreakdown[r.sourceType] = (sourceBreakdown[r.sourceType] ?? 0) + 1;
  }

  logger.info(
    `Discovery complete: ${results.length} results from ${Object.keys(sourceBreakdown).length} sources`
  );
  emit({
    message: `Found ${results.length} results`,
    phase: "discovery",
    data: sourceBreakdown,
  });

  return { results, totalFetched: results.length, sourceBreakdown };
}
