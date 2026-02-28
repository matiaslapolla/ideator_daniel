import { Hono } from "hono";
import type { PipelineOrchestrator } from "@ideator/core";

export function sourcesRoutes(orchestrator: PipelineOrchestrator) {
  const app = new Hono();

  app.get("/", (c) => {
    const sources = orchestrator.getRegistry().list();
    return c.json({ sources });
  });

  return app;
}
