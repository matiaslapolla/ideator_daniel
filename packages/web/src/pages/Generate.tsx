import { createSignal, createResource, For, Show, onCleanup } from "solid-js";
import { api, createPipelineSocket } from "../api/client";

const PHASES = ["discovery", "research", "analysis", "validation", "output"] as const;

export default function Generate() {
  const [query, setQuery] = createSignal("");
  const [running, setRunning] = createSignal(false);
  const [currentPhase, setCurrentPhase] = createSignal<string | null>(null);
  const [events, setEvents] = createSignal<Array<{ phase: string; message: string }>>([]);
  const [error, setError] = createSignal<string | null>(null);
  const [done, setDone] = createSignal(false);

  const [sources] = createResource(() => api.listSources());

  let ws: WebSocket | null = null;

  async function startPipeline() {
    if (!query().trim() || running()) return;

    setRunning(true);
    setError(null);
    setDone(false);
    setEvents([]);
    setCurrentPhase(null);

    // Connect WebSocket for live updates
    ws = createPipelineSocket((event) => {
      if (event.phase) setCurrentPhase(event.phase);
      if (event.message) {
        setEvents((prev) => [...prev, { phase: event.phase, message: event.message }]);
      }
      if (event.status === "completed") {
        setDone(true);
        setRunning(false);
      }
      if (event.status === "failed") {
        setError(event.message);
        setRunning(false);
      }
    });

    try {
      await api.runPipeline(query());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start pipeline");
      setRunning(false);
    }
  }

  onCleanup(() => ws?.close());

  return (
    <div style={{ "max-width": "700px" }}>
      <h1 style={{ "font-size": "24px", "font-weight": "700", "margin-bottom": "8px" }}>Generate Ideas</h1>
      <p style={{ color: "#808090", "font-size": "14px", "margin-bottom": "32px" }}>
        Enter a topic or industry to generate AI-powered idea reports.
      </p>

      <div style={{ display: "flex", gap: "12px", "margin-bottom": "24px" }}>
        <input
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && startPipeline()}
          placeholder="e.g. B2B tools for restaurants, AI for healthcare..."
          disabled={running()}
          style={{
            flex: 1,
            padding: "12px 16px",
            background: "#1a1a2e",
            border: "1px solid #2a2a4a",
            "border-radius": "8px",
            color: "#e0e0e0",
            "font-size": "14px",
            outline: "none",
          }}
        />
        <button
          onClick={startPipeline}
          disabled={running() || !query().trim()}
          style={{
            padding: "12px 24px",
            background: running() ? "#505060" : "#7c5cfc",
            color: "white",
            border: "none",
            "border-radius": "8px",
            "font-size": "14px",
            "font-weight": "600",
            cursor: running() ? "not-allowed" : "pointer",
          }}
        >
          {running() ? "Running..." : "Generate"}
        </button>
      </div>

      <Show when={sources()}>
        {(s) => (
          <div style={{ "margin-bottom": "24px", "font-size": "12px", color: "#505060" }}>
            Sources: {s().sources.map((s) => s.name).join(", ")}
          </div>
        )}
      </Show>

      {/* Phase progress */}
      <Show when={running() || done()}>
        <div style={{ background: "#1a1a2e", "border-radius": "12px", padding: "20px", border: "1px solid #2a2a4a", "margin-bottom": "24px" }}>
          <div style={{ display: "flex", gap: "4px", "margin-bottom": "20px" }}>
            <For each={[...PHASES]}>
              {(phase) => {
                const idx = () => PHASES.indexOf(currentPhase() as typeof PHASES[number]);
                const phaseIdx = PHASES.indexOf(phase);
                const isActive = () => phase === currentPhase();
                const isPast = () => phaseIdx < idx();
                return (
                  <div style={{ flex: 1, "text-align": "center" }}>
                    <div
                      style={{
                        height: "4px",
                        "border-radius": "2px",
                        background: isPast() || done() ? "#7c5cfc" : isActive() ? "#7c5cfc80" : "#2a2a4a",
                        "margin-bottom": "6px",
                        transition: "background 0.3s",
                      }}
                    />
                    <span style={{ "font-size": "10px", color: isActive() ? "#7c5cfc" : "#505060", "text-transform": "capitalize" }}>
                      {phase}
                    </span>
                  </div>
                );
              }}
            </For>
          </div>

          {/* Event log */}
          <div style={{ "max-height": "300px", overflow: "auto" }}>
            <For each={events()}>
              {(event) => (
                <div style={{ padding: "6px 0", "font-size": "13px", color: "#a0a0c0", "border-bottom": "1px solid #151528" }}>
                  <span style={{ color: "#7c5cfc", "margin-right": "8px", "font-size": "11px" }}>
                    [{event.phase}]
                  </span>
                  {event.message}
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={done()}>
        <div style={{ padding: "16px", background: "#22c55e15", "border-radius": "8px", border: "1px solid #22c55e30", color: "#22c55e" }}>
          Pipeline complete! <a href="/" style={{ color: "#7c5cfc" }}>View results on Dashboard</a>
        </div>
      </Show>

      <Show when={error()}>
        <div style={{ padding: "16px", background: "#ef444415", "border-radius": "8px", border: "1px solid #ef444430", color: "#ef4444" }}>
          {error()}
        </div>
      </Show>
    </div>
  );
}
