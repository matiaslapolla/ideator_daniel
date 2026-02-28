import { createResource, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { api } from "../api/client";
import IdeaCard from "../components/IdeaCard";
import PipelineStatus from "../components/PipelineStatus";

export default function Dashboard() {
  const [ideas] = createResource(() => api.listIdeas(6));
  const [health] = createResource(() => api.health().catch(() => null));

  return (
    <div>
      <div style={{ display: "flex", "justify-content": "space-between", "align-items": "center", "margin-bottom": "32px" }}>
        <div>
          <h1 style={{ "font-size": "24px", "font-weight": "700", margin: "0 0 4px 0" }}>Dashboard</h1>
          <p style={{ color: "#808090", "font-size": "14px", margin: 0 }}>
            {ideas()?.total ?? 0} ideas generated
          </p>
        </div>
        <A
          href="/generate"
          style={{
            padding: "10px 20px",
            background: "#7c5cfc",
            color: "white",
            "text-decoration": "none",
            "border-radius": "8px",
            "font-size": "14px",
            "font-weight": "600",
          }}
        >
          + Generate Ideas
        </A>
      </div>

      <Show when={health()}>
        {(h) => (
          <div style={{ display: "flex", gap: "12px", "margin-bottom": "24px" }}>
            <div style={{ padding: "12px 16px", background: "#1a1a2e", "border-radius": "8px", "font-size": "12px" }}>
              Provider: <strong style={{ color: "#7c5cfc" }}>{h().provider}</strong>
            </div>
            <div style={{ padding: "12px 16px", background: "#1a1a2e", "border-radius": "8px", "font-size": "12px" }}>
              API Key: {h().hasApiKey ? <span style={{ color: "#22c55e" }}>Configured</span> : <span style={{ color: "#ef4444" }}>Missing</span>}
            </div>
          </div>
        )}
      </Show>

      <PipelineStatus />

      <h2 style={{ "font-size": "16px", margin: "32px 0 16px", color: "#a0a0c0" }}>Recent Ideas</h2>
      <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
        <Show when={ideas()?.ideas} fallback={<p style={{ color: "#505060" }}>Loading...</p>}>
          {(list) => (
            <For each={list()} fallback={<p style={{ color: "#505060" }}>No ideas yet. Generate some!</p>}>
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
          )}
        </Show>
      </div>
    </div>
  );
}
