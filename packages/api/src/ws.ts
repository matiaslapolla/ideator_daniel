import type { Server, ServerWebSocket } from "bun";
import type { PipelineOrchestrator } from "@ideator/core";
import type { PipelineEvent } from "@ideator/core";

interface WSData {
  runId?: string;
}

const clients = new Set<ServerWebSocket<WSData>>();

export function setupWebSocket(orchestrator: PipelineOrchestrator) {
  // Forward pipeline events to connected WebSocket clients
  orchestrator.onEvent((event: PipelineEvent) => {
    const message = JSON.stringify(event);
    for (const ws of clients) {
      try {
        if (ws.readyState === 1) {
          // Only send to clients watching this run, or all if not filtered
          if (!ws.data.runId || ws.data.runId === event.runId) {
            ws.send(message);
          }
        }
      } catch {
        clients.delete(ws);
      }
    }
  });

  return {
    upgrade(req: Request, server: Server): boolean {
      const url = new URL(req.url);
      if (url.pathname.startsWith("/ws/pipeline")) {
        const runId = url.pathname.split("/").pop();
        const success = server.upgrade(req, {
          data: { runId: runId !== "pipeline" ? runId : undefined },
        });
        return !!success;
      }
      return false;
    },

    websocket: {
      open(ws: ServerWebSocket<WSData>) {
        clients.add(ws);
        ws.send(JSON.stringify({ type: "connected", timestamp: new Date().toISOString() }));
      },
      message(ws: ServerWebSocket<WSData>, message: string | Buffer) {
        // Handle client messages (e.g., subscribe to specific run)
        try {
          const data = JSON.parse(String(message));
          if (data.type === "subscribe" && data.runId) {
            ws.data.runId = data.runId;
          }
        } catch {}
      },
      close(ws: ServerWebSocket<WSData>) {
        clients.delete(ws);
      },
    },
  };
}
