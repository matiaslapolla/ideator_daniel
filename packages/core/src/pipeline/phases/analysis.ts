import { z } from "zod";
import type { PipelineEvent } from "../../types";
import { ComplexitySchema } from "../../types";
import { structuredGenerate } from "../../ai/structured";
import type { ResearchOutput } from "./research";

const CandidateIdeaSchema = z.object({
  name: z.string(),
  description: z.string(),
  complexity: ComplexitySchema,
  keyFeatures: z.array(z.string()),
  differentiator: z.string(),
  revenueModel: z.string(),
});

const AnalysisOutputSchema = z.object({
  ideas: z.array(CandidateIdeaSchema).min(3).max(5),
  reasoning: z.string(),
});

export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;
export type CandidateIdea = z.infer<typeof CandidateIdeaSchema>;

const SYSTEM_PROMPT = `You are a product strategist who generates concrete B2B/B2C software product ideas. Given market research data, generate 3-5 specific, actionable product ideas.

Each idea must include a complexity score (1-10) across technical, market, and capital dimensions.

Return JSON matching the exact schema requested.`;

export async function runAnalysis(
  research: ResearchOutput,
  query: string,
  emit: (event: Partial<PipelineEvent>) => void
): Promise<AnalysisOutput> {
  emit({ message: "Generating candidate ideas...", phase: "analysis" });

  const result = await structuredGenerate({
    system: SYSTEM_PROMPT,
    prompt: `Based on this market research for "${query}", generate 3-5 concrete software product ideas.

Research Summary: ${research.summary}

Trends:
${research.trends.map((t) => `- ${t.trend} (${t.strength}): ${t.evidence.join("; ")}`).join("\n")}

Pain Points:
${research.painPoints.map((p) => `- ${p.problem} (affects: ${p.affectedSegments.join(", ")})`).join("\n")}

Opportunities:
${research.opportunities.map((o) => `- ${o.opportunity}: ${o.reasoning}`).join("\n")}

For each idea, provide:
- Name and description
- Complexity scores (1-10): technical, market, capital, overall, with explanation
- Key features (3-5)
- What differentiates it from existing solutions
- Revenue model

Return as JSON:
{
  "ideas": [{
    "name": "...",
    "description": "...",
    "complexity": { "overall": 5, "technical": 4, "market": 6, "capital": 3, "explanation": "..." },
    "keyFeatures": ["..."],
    "differentiator": "...",
    "revenueModel": "..."
  }],
  "reasoning": "Why these ideas were selected"
}`,
    schema: AnalysisOutputSchema,
  });

  emit({
    message: `Generated ${result.ideas.length} candidate ideas`,
    phase: "analysis",
  });

  return result;
}
