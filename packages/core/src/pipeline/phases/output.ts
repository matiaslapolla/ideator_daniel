import { z } from "zod";
import type { Idea, PipelineEvent, SourceResult } from "../../types";
import { MarketingFunnelSchema } from "../../types";
import { structuredGenerate } from "../../ai/structured";
import type { CandidateIdea } from "./analysis";
import type { ValidationOutput } from "./validation";

const FunnelOutputSchema = z.object({
  funnels: z.array(
    z.object({
      ideaName: z.string(),
      marketingFunnels: z.array(MarketingFunnelSchema),
    })
  ),
});

const SYSTEM_PROMPT = `You are a growth marketing expert specializing in $0-cost customer acquisition strategies for software startups. Design marketing funnels that cost nothing or near-nothing.

Focus on:
- Content marketing, SEO, social media (organic)
- Community building (Reddit, HN, Discord, forums)
- Cold outreach (email, LinkedIn)
- Product-led growth tactics
- Partnership/integration strategies

Return JSON matching the exact schema.`;

export async function runOutput(
  ideas: CandidateIdea[],
  validation: ValidationOutput,
  sourceData: SourceResult[],
  emit: (event: Partial<PipelineEvent>) => void
): Promise<Idea[]> {
  emit({
    message: "Designing marketing funnels and generating final reports...",
    phase: "output",
  });

  const funnelResult = await structuredGenerate({
    system: SYSTEM_PROMPT,
    prompt: `Design $0-cost marketing funnels for each of these validated product ideas:

${ideas
  .map((idea, i) => {
    const v = validation.validations.find(
      (v) => v.ideaName === idea.name
    );
    return `${i + 1}. ${idea.name}: ${idea.description}
   Target: ${v?.targetClients.map((t) => t.segment).join(", ") ?? "N/A"}
   Contacts: ${v?.clientContacts.map((c) => c.companyName).join(", ") ?? "N/A"}`;
  })
  .join("\n\n")}

For each idea, design 2-3 marketing funnels with:
- Funnel name
- Stages (awareness → interest → decision → action), each with channels and metrics
- Estimated cost (should be $0 or very low)
- Estimated time to first lead

Return as JSON:
{
  "funnels": [{
    "ideaName": "...",
    "marketingFunnels": [{
      "name": "...",
      "stages": [{ "name": "...", "description": "...", "channels": ["..."], "metrics": ["..."] }],
      "estimatedCost": "$0",
      "timeToFirstLead": "..."
    }]
  }]
}`,
    schema: FunnelOutputSchema,
  });

  // Assemble final Idea objects
  const now = new Date().toISOString();
  const finalIdeas: Idea[] = ideas.map((idea) => {
    const v = validation.validations.find((v) => v.ideaName === idea.name);
    const f = funnelResult.funnels.find((f) => f.ideaName === idea.name);

    return {
      id: crypto.randomUUID(),
      name: idea.name,
      description: idea.description,
      complexity: idea.complexity,
      targetClients: v?.targetClients ?? [],
      clientContacts: v?.clientContacts ?? [],
      marketingFunnels: f?.marketingFunnels ?? [],
      sourceData: sourceData.slice(0, 10).map((s) => ({
        sourceType: s.sourceType,
        title: s.title,
        url: s.url,
        snippet: s.content.slice(0, 200),
        fetchedAt: s.timestamp ?? now,
      })),
      createdAt: now,
    };
  });

  emit({
    message: `Generated ${finalIdeas.length} complete idea reports`,
    phase: "output",
  });

  return finalIdeas;
}
