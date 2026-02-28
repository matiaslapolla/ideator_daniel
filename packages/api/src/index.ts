import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { PipelineOrchestrator } from "@ideator/core";
import { initDb } from "@ideator/core";
import { ideasRoutes } from "./routes/ideas";
import { pipelineRoutes } from "./routes/pipeline";
import { sourcesRoutes } from "./routes/sources";
import { healthRoutes } from "./routes/health";
import { setupWebSocket } from "./ws";

// Initialize
initDb();
const orchestrator = new PipelineOrchestrator();

// App
const app = new Hono();

app.use("*", cors());
app.use("*", honoLogger());

// API routes
const api = new Hono();
api.route("/ideas", ideasRoutes(orchestrator));
api.route("/pipeline", pipelineRoutes(orchestrator));
api.route("/sources", sourcesRoutes(orchestrator));
api.route("/health", healthRoutes());

app.route("/api", api);

// Serve static web UI in production
app.use("/*", serveStatic({ root: "../web/dist" }));
app.get("/*", serveStatic({ root: "../web/dist", path: "index.html" }));

export type AppType = typeof api;
export { app, orchestrator };

// Start server
if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3001);
  const wsHandler = setupWebSocket(orchestrator);

  const server = Bun.serve({
    port,
    fetch(req, server) {
      // Try WebSocket upgrade first
      if (wsHandler.upgrade(req, server)) return;
      return app.fetch(req);
    },
    websocket: wsHandler.websocket,
  });

  console.log(`Ideator API running on http://localhost:${server.port}`);
}
