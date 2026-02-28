import { createResource, Show } from "solid-js";
import { api } from "../api/client";

export default function Settings() {
  const [health] = createResource(() => api.health().catch(() => null));

  return (
    <div style={{ "max-width": "600px" }}>
      <h1 style={{ "font-size": "24px", "font-weight": "700", "margin-bottom": "24px" }}>Settings</h1>

      <div style={{ background: "#1a1a2e", "border-radius": "12px", padding: "24px", border: "1px solid #2a2a4a", "margin-bottom": "16px" }}>
        <h3 style={{ "font-size": "14px", color: "#a0a0c0", "margin-bottom": "16px" }}>AI Provider</h3>

        <Show when={health()} fallback={<p style={{ color: "#505060" }}>Connecting...</p>}>
          {(h) => (
            <div style={{ "font-size": "13px" }}>
              <div style={{ display: "flex", "justify-content": "space-between", padding: "8px 0", "border-bottom": "1px solid #2a2a4a" }}>
                <span style={{ color: "#808090" }}>Provider</span>
                <span style={{ color: "#e0e0ff", "font-weight": "600" }}>{h().provider}</span>
              </div>
              <div style={{ display: "flex", "justify-content": "space-between", padding: "8px 0", "border-bottom": "1px solid #2a2a4a" }}>
                <span style={{ color: "#808090" }}>API Key</span>
                <span style={{ color: h().hasApiKey ? "#22c55e" : "#ef4444" }}>
                  {h().hasApiKey ? "Configured" : "Not set"}
                </span>
              </div>
              <div style={{ display: "flex", "justify-content": "space-between", padding: "8px 0" }}>
                <span style={{ color: "#808090" }}>Status</span>
                <span style={{ color: "#22c55e" }}>{h().status}</span>
              </div>
            </div>
          )}
        </Show>
      </div>

      <div style={{ background: "#1a1a2e", "border-radius": "12px", padding: "24px", border: "1px solid #2a2a4a" }}>
        <h3 style={{ "font-size": "14px", color: "#a0a0c0", "margin-bottom": "12px" }}>Configuration</h3>
        <p style={{ "font-size": "13px", color: "#808090", "line-height": "1.6" }}>
          Configure your AI provider and API keys via environment variables:
        </p>
        <pre style={{ background: "#0f0f23", padding: "16px", "border-radius": "8px", "font-size": "12px", color: "#a0a0c0", "margin-top": "12px", overflow: "auto" }}>
{`AI_PROVIDER=groq          # groq | openrouter | nvidia
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-...
NVIDIA_API_KEY=nvapi-...`}
        </pre>
      </div>
    </div>
  );
}
