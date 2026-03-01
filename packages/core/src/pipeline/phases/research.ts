import { z } from "zod";
import type { SourceResult, PipelineEvent } from "../../types";
import { structuredGenerate } from "../../ai/structured";

const ResearchOutputSchema = z.object({
  trends: z.array(
    z.object({
      trend: z.string(),
      evidence: z.array(z.string()),
      strength: z.enum(["strong", "moderate", "emerging"]),
    })
  ),
  painPoints: z.array(
    z.object({
      problem: z.string(),
      affectedSegments: z.array(z.string()),
      frequency: z.string(),
    })
  ),
  opportunities: z.array(
    z.object({
      opportunity: z.string(),
      reasoning: z.string(),
      relatedTrends: z.array(z.string()),
    })
  ),
  summary: z.string(),
});

export type ResearchOutput = z.infer<typeof ResearchOutputSchema>;

const BASE_SYSTEM_PROMPT = `You are a market research analyst specializing in B2B and B2C software opportunities. Analyze raw data from multiple sources to identify trends, pain points, and opportunity signals.

Return JSON matching the exact schema requested. Be specific and actionable.`;

export interface ResearchPhaseOptions {
  temperature?: number;
  domain?: string;
}

export async function runResearch(
  sourceData: SourceResult[],
  query: string,
  emit: (event: Partial<PipelineEvent>) => void,
  options?: ResearchPhaseOptions
): Promise<ResearchOutput> {
  emit({ message: "Analyzing trends and pain points...", phase: "research" });

  const systemPrompt = options?.domain
    ? `${BASE_SYSTEM_PROMPT}\n\nFocus your analysis on the ${options.domain} domain. Prioritize trends, pain points, and opportunities specific to ${options.domain}.`
    : BASE_SYSTEM_PROMPT;

  const temperature = options?.temperature
    ? Math.max(0.3, options.temperature - 0.1)
    : undefined;

  // Condense source data to fit in context
  const condensed = sourceData
    .slice(0, 100)
    .map(
      (s, i) =>
        `[${i + 1}] (${s.sourceType}) ${s.title}\n${s.content.slice(0, 500)}`
    )
    .join("\n\n");

  const result = await structuredGenerate({
    system: systemPrompt,
    temperature,
    prompt: `Analyze the following ${sourceData.length} data points collected for the query "${query}".

Identify:
1. Key trends (with evidence from the data)
2. Pain points that potential customers are experiencing
3. Business opportunities that emerge from these trends and pain points

Data:
${condensed}

Return your analysis as JSON with this structure:
{
  "trends": [{ "trend": "...", "evidence": ["..."], "strength": "strong|moderate|emerging" }],
  "painPoints": [{ "problem": "...", "affectedSegments": ["..."], "frequency": "..." }],
  "opportunities": [{ "opportunity": "...", "reasoning": "...", "relatedTrends": ["..."] }],
  "summary": "Brief overall summary"
}`,
    schema: ResearchOutputSchema,
  });

  emit({
    message: `Identified ${result.trends.length} trends, ${result.painPoints.length} pain points, ${result.opportunities.length} opportunities`,
    phase: "research",
  });

  return result;
}
