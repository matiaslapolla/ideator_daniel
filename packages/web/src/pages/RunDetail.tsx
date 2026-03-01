import { createResource, Show, For } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { api } from "../api/client";
import IdeaCard from "../components/IdeaCard";

const statusColor = (status: string) => {
  if (status === "completed") return "#22c55e";
  if (status === "running") return "#7c5cfc";
  if (status === "failed") return "#ef4444";
  return "#505060";
};

function formatDuration(start: string, end?: string): string {
  if (!end) return "In progress";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ${secs % 60}s`;
}

export default function RunDetail() {
  const params = useParams<{ runId: string }>();
  const [run] = createResource(() => params.runId, api.getRunStatus);

  return (
    <Show when={run()} fallback={<p style={{ color: "#505060" }}>Loading...</p>}>
      {(data) => (
        <div style={{ "max-width": "800px" }}>
          <A href="/history" style={{ color: "#7c5cfc", "font-size": "13px", "text-decoration": "none", display: "block", "margin-bottom": "16px" }}>
            &larr; Back to History
          </A>

          {/* Header */}
          <div style={{ display: "flex", "justify-content": "space-between", "align-items": "start", "margin-bottom": "24px" }}>
            <div>
              <h1 style={{ "font-size": "24px", "font-weight": "700", "margin-bottom": "8px" }}>{data().query}</h1>
              <span style={{ "font-size": "13px", color: "#505060" }}>
                {new Date(data().createdAt).toLocaleString()}
              </span>
            </div>
            <span style={{
              padding: "6px 14px",
              "border-radius": "6px",
              "font-size": "12px",
              "font-weight": "600",
              background: `${statusColor(data().status)}20`,
              color: statusColor(data().status),
            }}>
              {data().status}
            </span>
          </div>

          {/* Metadata bar */}
          <div style={{
            display: "flex",
            gap: "24px",
            padding: "16px",
            background: "#1a1a2e",
            "border-radius": "8px",
            border: "1px solid #2a2a4a",
            "margin-bottom": "24px",
            "flex-wrap": "wrap",
          }}>
            <div>
              <div style={{ "font-size": "11px", color: "#505060", "margin-bottom": "4px" }}>Sources</div>
              <div style={{ display: "flex", gap: "6px", "flex-wrap": "wrap" }}>
                <For each={data().sources} fallback={<span style={{ "font-size": "12px", color: "#808090" }}>None</span>}>
                  {(source) => (
                    <span style={{ padding: "2px 8px", background: "#2a2a4a", "border-radius": "4px", "font-size": "11px", color: "#a0a0c0" }}>
                      {source}
                    </span>
                  )}
                </For>
              </div>
            </div>
            <Show when={data().currentPhase}>
              <div>
                <div style={{ "font-size": "11px", color: "#505060", "margin-bottom": "4px" }}>Phase</div>
                <span style={{ "font-size": "13px", color: "#e0e0ff" }}>{data().currentPhase}</span>
              </div>
            </Show>
            <div>
              <div style={{ "font-size": "11px", color: "#505060", "margin-bottom": "4px" }}>Duration</div>
              <span style={{ "font-size": "13px", color: "#e0e0ff" }}>
                {formatDuration(data().createdAt, data().completedAt)}
              </span>
            </div>
            <div>
              <div style={{ "font-size": "11px", color: "#505060", "margin-bottom": "4px" }}>Ideas</div>
              <span style={{ "font-size": "13px", color: "#e0e0ff" }}>{data().results?.length ?? 0}</span>
            </div>
          </div>

          {/* Error state */}
          <Show when={data().status === "failed" && data().error}>
            <div style={{
              padding: "16px",
              background: "#ef444420",
              border: "1px solid #ef4444",
              "border-radius": "8px",
              "margin-bottom": "24px",
              color: "#ef4444",
              "font-size": "13px",
            }}>
              {data().error}
            </div>
          </Show>

          {/* Results grid */}
          <Show when={data().results?.length > 0} fallback={
            <Show when={data().status === "completed"}>
              <p style={{ color: "#505060", "text-align": "center", padding: "32px 0" }}>
                No ideas were generated for this run.
              </p>
            </Show>
          }>
            <h2 style={{ "font-size": "18px", "font-weight": "600", "margin-bottom": "16px" }}>Generated Ideas</h2>
            <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(340px, 1fr))", gap: "12px" }}>
              <For each={data().results}>
                {(idea) => (
                  <IdeaCard
                    id={idea.id}
                    name={idea.name}
                    description={idea.description}
                    complexity={idea.complexity.overall}
                    createdAt={idea.createdAt}
                  />
                )}
              </For>
            </div>
          </Show>
        </div>
      )}
    </Show>
  );
}
