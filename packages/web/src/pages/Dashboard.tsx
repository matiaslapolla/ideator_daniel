import { createResource, createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { api } from "../api/client";
import IdeaCard from "../components/IdeaCard";
import PipelineStatus from "../components/PipelineStatus";

const PAGE_SIZE = 6;

export default function Dashboard() {
  const [page, setPage] = createSignal(0);
  const [ideas] = createResource(page, (p) => api.listIdeas(PAGE_SIZE, p * PAGE_SIZE));
  const [health] = createResource(() => api.health().catch(() => null));
  const totalPages = () => Math.ceil((ideas()?.total ?? 0) / PAGE_SIZE);

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

      <h2 style={{ "font-size": "16px", margin: "32px 0 16px", color: "#a0a0c0" }}>
        {page() === 0 ? "Recent Ideas" : "Ideas"}
      </h2>
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

      <Show when={totalPages() > 1}>
        <div style={{ display: "flex", "justify-content": "center", "align-items": "center", gap: "12px", "margin-top": "32px" }}>
          <button
            disabled={page() === 0}
            onClick={() => setPage((p) => p - 1)}
            style={{
              padding: "8px 16px",
              background: page() === 0 ? "#1a1a2e" : "#2a2a4a",
              color: page() === 0 ? "#505060" : "#e0e0ff",
              border: "1px solid #2a2a4a",
              "border-radius": "6px",
              cursor: page() === 0 ? "default" : "pointer",
              "font-size": "13px",
            }}
          >
            Previous
          </button>
          <span style={{ "font-size": "13px", color: "#808090" }}>
            {page() + 1} / {totalPages()}
          </span>
          <button
            disabled={page() + 1 >= totalPages()}
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: "8px 16px",
              background: page() + 1 >= totalPages() ? "#1a1a2e" : "#2a2a4a",
              color: page() + 1 >= totalPages() ? "#505060" : "#e0e0ff",
              border: "1px solid #2a2a4a",
              "border-radius": "6px",
              cursor: page() + 1 >= totalPages() ? "default" : "pointer",
              "font-size": "13px",
            }}
          >
            Next
          </button>
        </div>
      </Show>
    </div>
  );
}
