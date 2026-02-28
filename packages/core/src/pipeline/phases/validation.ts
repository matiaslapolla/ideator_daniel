import { z } from "zod";
import type { PipelineEvent } from "../../types";
import { TargetClientSchema, ClientContactSchema } from "../../types";
import { structuredGenerate } from "../../ai/structured";
import type { CandidateIdea } from "./analysis";

const ValidationResultSchema = z.object({
  ideaName: z.string(),
  targetClients: z.array(TargetClientSchema),
  clientContacts: z.array(ClientContactSchema),
  marketSize: z.string(),
  competitorAnalysis: z.string(),
});

const ValidationOutputSchema = z.object({
  validations: z.array(ValidationResultSchema),
});

export type ValidationOutput = z.infer<typeof ValidationOutputSchema>;

const SYSTEM_PROMPT = `You are a business development expert who validates software product ideas by identifying target client segments and specific real companies to contact.

For each idea, identify:
1. Target client segments with pain points
2. Specific real companies (with real websites) that would benefit from this product
3. Market size estimate
4. Brief competitive analysis

Only suggest real, existing companies. Return JSON matching the exact schema.`;

export async function runValidation(
  ideas: CandidateIdea[],
  emit: (event: Partial<PipelineEvent>) => void
): Promise<ValidationOutput> {
  emit({
    message: `Validating ${ideas.length} ideas and finding target clients...`,
    phase: "validation",
  });

  const result = await structuredGenerate({
    system: SYSTEM_PROMPT,
    prompt: `Validate these product ideas and identify target clients and specific companies to contact:

${ideas
  .map(
    (idea, i) =>
      `${i + 1}. ${idea.name}: ${idea.description}
   Features: ${idea.keyFeatures.join(", ")}
   Revenue: ${idea.revenueModel}`
  )
  .join("\n\n")}

For each idea, provide:
- 2-3 target client segments (with industry, size, pain points)
- 3-5 specific real companies to contact (with real websites and reasoning)
- Market size estimate
- Brief competitive analysis

Return as JSON:
{
  "validations": [{
    "ideaName": "...",
    "targetClients": [{ "segment": "...", "size": "...", "industry": "...", "painPoints": ["..."] }],
    "clientContacts": [{ "companyName": "...", "website": "...", "reasoning": "..." }],
    "marketSize": "...",
    "competitorAnalysis": "..."
  }]
}`,
    schema: ValidationOutputSchema,
  });

  const totalContacts = result.validations.reduce(
    (sum, v) => sum + v.clientContacts.length,
    0
  );
  emit({
    message: `Found ${totalContacts} potential client contacts across ${result.validations.length} ideas`,
    phase: "validation",
  });

  return result;
}
