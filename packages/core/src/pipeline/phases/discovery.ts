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

export async function runDiscovery(
  input: DiscoveryInput,
  registry: SourceRegistry,
  emit: (event: Partial<PipelineEvent>) => void
): Promise<DiscoveryOutput> {
  emit({ message: `Starting discovery for "${input.query}"`, phase: "discovery" });

  const results = await registry.fetchAll(
    { query: input.query, limit: input.limit ?? 30 },
    input.sources.length > 0 ? input.sources : undefined
  );

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
