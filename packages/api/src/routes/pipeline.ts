import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { PipelineOrchestrator } from "@ideator/core";

const RunPipelineSchema = z.object({
  query: z.string().min(3).max(500),
  sources: z.array(z.string()).optional(),
  limit: z.number().min(5).max(100).optional(),
});

// Track active runs so we can return runIds
const activeRuns = new Map<string, Promise<unknown>>();

export function pipelineRoutes(orchestrator: PipelineOrchestrator) {
  const app = new Hono();
  const repo = orchestrator.getRepository();

  // Start pipeline run (async — returns immediately)
  app.post("/run", zValidator("json", RunPipelineSchema), (c) => {
    const body = c.req.valid("json");

    // Start run in background
    const runPromise = orchestrator.run({
      query: body.query,
      sources: body.sources,
      limit: body.limit,
    });

    // The orchestrator creates the run record synchronously at the start.
    // After the promise settles, we can find it in recent runs.
    runPromise.catch(() => {}); // prevent unhandled rejection

    // Return immediately. Client polls /runs or uses WebSocket.
    return c.json({
      message: "Pipeline started",
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
