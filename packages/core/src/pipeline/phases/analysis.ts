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
  marketSegment: z.string(),
});

const AnalysisOutputSchema = z.object({
  ideas: z.array(CandidateIdeaSchema).min(5).max(10),
  reasoning: z.string(),
});

export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;
export type CandidateIdea = z.infer<typeof CandidateIdeaSchema>;

const BASE_SYSTEM_PROMPT = `You are a product strategist who generates concrete software product ideas across diverse domains. Given market research data, generate 5-10 specific, actionable product ideas.

CRITICAL DIVERSITY REQUIREMENTS:
- Each idea MUST target a DIFFERENT market segment (e.g., healthcare, education, logistics, retail, etc.)
- Each idea MUST use a DIFFERENT revenue model (e.g., subscription, usage-based, marketplace commission, freemium, licensing, one-time purchase, advertising, etc.)
- Ideas MUST span different complexity levels — include at least one low-complexity, one medium, and one high-complexity idea
- Do NOT generate variations of the same concept. Each idea must be fundamentally different in purpose and approach
- Avoid clustering around B2B SaaS — include B2C, marketplace, and consumer ideas

Each idea must include a complexity score (1-10) across technical, market, and capital dimensions, plus a marketSegment label.

Return JSON matching the exact schema requested.`;

export interface AnalysisPhaseOptions {
  temperature?: number;
  domain?: string;
}

export async function runAnalysis(
  research: ResearchOutput,
  query: string,
  emit: (event: Partial<PipelineEvent>) => void,
  options?: AnalysisPhaseOptions
): Promise<AnalysisOutput> {
  emit({ message: "Generating candidate ideas...", phase: "analysis" });

  const systemPrompt = options?.domain
    ? `${BASE_SYSTEM_PROMPT}\n\nFocus on the ${options.domain} domain. Generate ideas specific to ${options.domain}, but still ensure diversity in market segments, revenue models, and complexity levels within that domain.`
    : BASE_SYSTEM_PROMPT;

  const result = await structuredGenerate({
    system: systemPrompt,
    temperature: options?.temperature,
    prompt: `Based on this market research for "${query}", generate 5-10 concrete software product ideas.

Research Summary: ${research.summary}

Trends:
${research.trends.map((t) => `- ${t.trend} (${t.strength}): ${t.evidence.join("; ")}`).join("\n")}

Pain Points:
${research.painPoints.map((p) => `- ${p.problem} (affects: ${p.affectedSegments.join(", ")})`).join("\n")}

Opportunities:
${research.opportunities.map((o) => `- ${o.opportunity}: ${o.reasoning}`).join("\n")}

For each idea, provide:
- Name and description
- Market segment (must be unique across all ideas)
- Complexity scores (1-10): technical, market, capital, overall, with explanation
- Key features (3-5)
- What differentiates it from existing solutions
- Revenue model (must be unique across all ideas)

Return as JSON:
{
  "ideas": [{
    "name": "...",
    "description": "...",
    "marketSegment": "...",
    "complexity": { "overall": 5, "technical": 4, "market": 6, "capital": 3, "explanation": "..." },
    "keyFeatures": ["..."],
    "differentiator": "...",
    "revenueModel": "..."
  }],
  "reasoning": "Why these ideas were selected and how diversity was ensured"
}`,
    schema: AnalysisOutputSchema,
  });

  emit({
    message: `Generated ${result.ideas.length} candidate ideas`,
    phase: "analysis",
  });

  return result;
}
