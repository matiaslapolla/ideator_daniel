import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { PipelineOrchestrator } from "@ideator/core";
import { DomainSchema, CustomSourcesSchema } from "@ideator/core";

const RunPipelineSchema = z.object({
  query: z.string().min(3).max(500),
  sources: z.array(z.string()).optional(),
  limit: z.number().min(5).max(100).optional(),
  domain: DomainSchema.optional(),
  creativity: z.number().min(0).max(100).optional(),
  customSources: CustomSourcesSchema.optional(),
  onlyCustomSources: z.boolean().optional(),
});

// Track active runs so we can return runIds
const activeRuns = new Map<string, Promise<unknown>>();

export function pipelineRoutes(orchestrator: PipelineOrchestrator) {
  const app = new Hono();
  const repo = orchestrator.getRepository();

  // Start pipeline run (async — returns immediately)
  app.post("/run", zValidator("json", RunPipelineSchema), (c) => {
    const body = c.req.valid("json");
    const runId = crypto.randomUUID();

    // Start run in background with the pre-generated runId
    orchestrator
      .run({
        query: body.query,
        sources: body.sources,
        limit: body.limit,
        domain: body.domain,
        creativity: body.creativity,
        customSources: body.customSources,
        onlyCustomSources: body.onlyCustomSources,
        runId,
      })
      .catch(() => {}); // prevent unhandled rejection

    // Return runId immediately so clients can subscribe/poll
    return c.json({
      message: "Pipeline started",
      runId,
      query: body.query,
    });
  });

  // Get pipeline run status
  app.get("/status/:runId", (c) => {
    const run = repo.getPipelineRun(c.req.param("runId"));
    if (!run) return c.json({ error: "Run not found" }, 404);
    return c.json(run);
  });

  // List pipeline runs
  app.get("/runs", (c) => {
    const limit = Number(c.req.query("limit") ?? 20);
    const offset = Number(c.req.query("offset") ?? 0);
    const runs = repo.listPipelineRuns(limit, offset);
    return c.json({ runs });
  });

  return app;
}
