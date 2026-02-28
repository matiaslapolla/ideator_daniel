import { Hono } from "hono";
import type { PipelineOrchestrator } from "@ideator/core";

export function ideasRoutes(orchestrator: PipelineOrchestrator) {
  const app = new Hono();
  const repo = orchestrator.getRepository();

  // List ideas
  app.get("/", (c) => {
    const limit = Number(c.req.query("limit") ?? 50);
    const offset = Number(c.req.query("offset") ?? 0);
    const ideas = repo.listIdeas(limit, offset);
    const total = repo.countIdeas();
    return c.json({ ideas, total, limit, offset });
  });

  // Get idea by ID
  app.get("/:id", (c) => {
    const idea = repo.getIdea(c.req.param("id"));
    if (!idea) return c.json({ error: "Idea not found" }, 404);
    return c.json(idea);
  });

  // Delete idea
  app.delete("/:id", (c) => {
    const deleted = repo.deleteIdea(c.req.param("id"));
    if (!deleted) return c.json({ error: "Idea not found" }, 404);
    return c.json({ success: true });
  });

  return app;
}
