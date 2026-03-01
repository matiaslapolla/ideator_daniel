import { createResource, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { api } from "../api/client";

export default function History() {
  const [runs] = createResource(() => api.listRuns(50));

  const statusColor = (status: string) => {
    if (status === "completed") return "#22c55e";
    if (status === "running") return "#7c5cfc";
    if (status === "failed") return "#ef4444";
    return "#505060";
  };

  return (
    <div style={{ "max-width": "800px" }}>
      <h1 style={{ "font-size": "24px", "font-weight": "700", "margin-bottom": "24px" }}>Pipeline History</h1>

      <Show when={runs()} fallback={<p style={{ color: "#505060" }}>Loading...</p>}>
        {(data) => (
          <For each={data().runs} fallback={<p style={{ color: "#505060" }}>No pipeline runs yet.</p>}>
            {(run) => (
              <A href={`/history/${run.id}`} style={{
                display: "flex",
                "justify-content": "space-between",
                "align-items": "center",
                padding: "16px",
                background: "#1a1a2e",
                "border-radius": "8px",
                "margin-bottom": "8px",
                border: "1px solid #2a2a4a",
                "text-decoration": "none",
                color: "inherit",
                cursor: "pointer",
              }}>
                <div>
                  <div style={{ "font-size": "14px", "font-weight": "500" }}>{run.query}</div>
                  <div style={{ "font-size": "11px", color: "#505060", "margin-top": "4px" }}>
                    {new Date(run.createdAt).toLocaleString()}
                    {run.currentPhase && <span> — Phase: {run.currentPhase}</span>}
                  </div>
                </div>
                <span style={{
                  padding: "4px 10px",
                  "border-radius": "6px",
                  "font-size": "11px",
                  "font-weight": "600",
                  background: `${statusColor(run.status)}20`,
                  color: statusColor(run.status),
                }}>
                  {run.status}
                </span>
              </A>
            )}
          </For>
        )}
      </Show>
    </div>
  );
}
