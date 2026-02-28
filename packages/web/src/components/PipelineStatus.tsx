import { createSignal, onCleanup, For } from "solid-js";
import { createPipelineSocket } from "../api/client";

const PHASES = ["discovery", "research", "analysis", "validation", "output"];

interface PipelineEvent {
  phase: string;
  status: string;
  message: string;
}

export default function PipelineStatus() {
  const [events, setEvents] = createSignal<PipelineEvent[]>([]);
  const [currentPhase, setCurrentPhase] = createSignal<string | null>(null);
  const [status, setStatus] = createSignal<string>("idle");

  let ws: WebSocket | null = null;

  function connect() {
    ws = createPipelineSocket((event) => {
      if (event.phase) setCurrentPhase(event.phase);
      if (event.status) setStatus(event.status);
      setEvents((prev) => [...prev, { phase: event.phase, status: event.status, message: event.message }]);
    });
  }

  onCleanup(() => ws?.close());

  return (
    <div style={{ background: "#1a1a2e", "border-radius": "12px", padding: "20px", border: "1px solid #2a2a4a" }}>
      <div style={{ display: "flex", "justify-content": "space-between", "margin-bottom": "16px" }}>
        <h3 style={{ margin: 0, "font-size": "14px", color: "#a0a0c0" }}>Pipeline Status</h3>
        <span
          style={{
            "font-size": "12px",
            padding: "2px 8px",
            "border-radius": "8px",
            background: status() === "completed" ? "#22c55e20" : status() === "running" ? "#7c5cfc20" : "#505060",
            color: status() === "completed" ? "#22c55e" : status() === "running" ? "#7c5cfc" : "#808090",
          }}
        >
          {status()}
        </span>
      </div>

      {/* Phase progress bar */}
      <div style={{ display: "flex", gap: "4px", "margin-bottom": "16px" }}>
        <For each={PHASES}>
          {(phase) => {
            const isActive = () => phase === currentPhase();
            const isPast = () => {
              const ci = PHASES.indexOf(currentPhase() ?? "");
              return PHASES.indexOf(phase) < ci;
            };
            return (
              <div
                style={{
                  flex: 1,
                  height: "4px",
                  "border-radius": "2px",
                  background: isPast() ? "#7c5cfc" : isActive() ? "#7c5cfc80" : "#2a2a4a",
                  transition: "background 0.3s",
                }}
                title={phase}
              />
            );
          }}
        </For>
      </div>

      {/* Event log */}
      <div style={{ "max-height": "200px", overflow: "auto", "font-size": "12px" }}>
        <For each={events().slice(-10)}>
          {(event) => (
            <div style={{ padding: "4px 0", color: "#808090", "border-bottom": "1px solid #1a1a2e" }}>
              <span style={{ color: "#7c5cfc", "margin-right": "8px" }}>[{event.phase}]</span>
              {event.message}
            </div>
          )}
        </For>
      </div>

      {status() === "idle" && (
        <button
          onClick={connect}
          style={{
            "margin-top": "12px",
            padding: "6px 12px",
            background: "#2a2a4a",
            color: "#a0a0c0",
            border: "none",
            "border-radius": "6px",
            cursor: "pointer",
            "font-size": "12px",
          }}
        >
          Connect Live Updates
        </button>
      )}
    </div>
  );
}
