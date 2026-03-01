import { createSignal, createResource, createEffect, For, Show, onCleanup } from "solid-js";
import { api, createPipelineSocket } from "../api/client";

const PHASES = ["discovery", "research", "analysis", "validation", "output"] as const;

const DOMAINS = [
  "SaaS", "Fintech", "Health", "Education", "E-commerce",
  "DevTools", "AI/ML", "Marketplace", "Social", "Gaming", "Sustainability",
] as const;

const inputStyle = {
  padding: "10px 14px",
  background: "#1a1a2e",
  border: "1px solid #2a2a4a",
  "border-radius": "8px",
  color: "#e0e0e0",
  "font-size": "14px",
  outline: "none",
  width: "100%",
};

export default function Generate() {
  const [query, setQuery] = createSignal("");
  const [domain, setDomain] = createSignal("");
  const [creativity, setCreativity] = createSignal(50);
  const [redditSubs, setRedditSubs] = createSignal("");
  const [rssFeeds, setRssFeeds] = createSignal("");
  const [onlyCustomSources, setOnlyCustomSources] = createSignal(false);
  const [showCustomSources, setShowCustomSources] = createSignal(false);
  const [running, setRunning] = createSignal(false);
  const [currentPhase, setCurrentPhase] = createSignal<string | null>(null);
  const [events, setEvents] = createSignal<Array<{ phase: string; message: string }>>([]);
  const [error, setError] = createSignal<string | null>(null);
  const [done, setDone] = createSignal(false);

  // Auto-reset "only custom" when both source inputs are cleared
  createEffect(() => {
    const subs = redditSubs().trim();
    const feeds = rssFeeds().trim();
    if (!subs && !feeds) setOnlyCustomSources(false);
  });

  const [sources] = createResource(() => api.listSources());

  let ws: WebSocket | null = null;

  async function startPipeline() {
    if (!query().trim() || running()) return;

    setRunning(true);
    setError(null);
    setDone(false);
    setEvents([]);
    setCurrentPhase(null);

    try {
      const subs = redditSubs().split(",").map(s => s.trim()).filter(Boolean);
      const feeds = rssFeeds().split(",").map(s => s.trim()).filter(Boolean);
      const customSources = (subs.length || feeds.length)
        ? { redditSubreddits: subs.length ? subs : undefined, rssFeeds: feeds.length ? feeds : undefined }
        : undefined;

      const { runId } = await api.runPipeline({
        query: query(),
        domain: domain() || undefined,
        creativity: creativity(),
        customSources,
        onlyCustomSources: onlyCustomSources() || undefined,
      });

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
      }, runId);
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

      <div style={{ display: "flex", gap: "12px", "margin-bottom": "16px" }}>
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

      {/* Options row */}
      <div style={{ display: "flex", gap: "16px", "align-items": "center", "margin-bottom": "16px", "flex-wrap": "wrap" }}>
        <div style={{ display: "flex", "flex-direction": "column", gap: "4px", flex: "1", "min-width": "180px" }}>
          <label style={{ "font-size": "12px", color: "#808090" }}>Domain</label>
          <select
            value={domain()}
            onChange={(e) => setDomain(e.currentTarget.value)}
            disabled={running()}
            style={{
              ...inputStyle,
              cursor: "pointer",
              "-webkit-appearance": "none" as string,
            }}
          >
            <option value="">Any domain</option>
            <For each={[...DOMAINS]}>
              {(d) => <option value={d}>{d}</option>}
            </For>
          </select>
        </div>

        <div style={{ display: "flex", "flex-direction": "column", gap: "4px", flex: "1", "min-width": "180px" }}>
          <label style={{ "font-size": "12px", color: "#808090" }}>
            Creativity: {creativity()}
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={creativity()}
            onInput={(e) => setCreativity(Number(e.currentTarget.value))}
            disabled={running()}
            style={{ width: "100%", "accent-color": "#7c5cfc" }}
          />
        </div>
      </div>

      {/* Custom Sources (collapsible) */}
      <div style={{ "margin-bottom": "24px" }}>
        <button
          onClick={() => setShowCustomSources(!showCustomSources())}
          style={{
            background: "none",
            border: "none",
            color: "#7c5cfc",
            "font-size": "13px",
            cursor: "pointer",
            padding: "4px 0",
          }}
        >
          {showCustomSources() ? "▾ Custom Sources" : "▸ Custom Sources"}
        </button>
        <Show when={showCustomSources()}>
          <div style={{
            "margin-top": "8px",
            padding: "16px",
            background: "#1a1a2e",
            "border-radius": "8px",
            border: "1px solid #2a2a4a",
            display: "flex",
            "flex-direction": "column",
            gap: "12px",
          }}>
            <div>
              <label style={{ "font-size": "12px", color: "#808090", display: "block", "margin-bottom": "4px" }}>
                Reddit Subreddits (comma-separated)
              </label>
              <input
                value={redditSubs()}
                onInput={(e) => setRedditSubs(e.currentTarget.value)}
                placeholder="e.g. startups, SaaS, smallbusiness"
                disabled={running()}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ "font-size": "12px", color: "#808090", display: "block", "margin-bottom": "4px" }}>
                RSS Feeds (comma-separated URLs)
              </label>
              <input
                value={rssFeeds()}
                onInput={(e) => setRssFeeds(e.currentTarget.value)}
                placeholder="e.g. https://example.com/feed.xml"
                disabled={running()}
                style={inputStyle}
              />
            </div>
            <label style={{
              display: "flex",
              "align-items": "center",
              gap: "8px",
              "font-size": "13px",
              color: (!redditSubs().trim() && !rssFeeds().trim()) ? "#505060" : "#c0c0d0",
              cursor: (!redditSubs().trim() && !rssFeeds().trim()) ? "not-allowed" : "pointer",
            }}>
              <input
                type="checkbox"
                checked={onlyCustomSources()}
                onChange={(e) => setOnlyCustomSources(e.currentTarget.checked)}
                disabled={running() || (!redditSubs().trim() && !rssFeeds().trim())}
                style={{ "accent-color": "#7c5cfc" }}
              />
              Only use my sources (skip all defaults)
            </label>
          </div>
        </Show>
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
