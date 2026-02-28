import { createResource, Show, For } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { api } from "../api/client";
import ComplexityBadge from "../components/ComplexityBadge";

const sectionStyle = {
  background: "#1a1a2e",
  "border-radius": "12px",
  padding: "20px",
  border: "1px solid #2a2a4a",
  "margin-bottom": "16px",
};

const headingStyle = {
  "font-size": "14px",
  color: "#a0a0c0",
  "margin-bottom": "12px",
  "font-weight": "600",
};

export default function IdeaDetail() {
  const params = useParams<{ id: string }>();
  const [idea] = createResource(() => params.id, api.getIdea);

  return (
    <Show when={idea()} fallback={<p style={{ color: "#505060" }}>Loading...</p>}>
      {(data) => (
        <div style={{ "max-width": "800px" }}>
          <A href="/" style={{ color: "#7c5cfc", "font-size": "13px", "text-decoration": "none", display: "block", "margin-bottom": "16px" }}>
            &larr; Back to Dashboard
          </A>

          <div style={{ display: "flex", "justify-content": "space-between", "align-items": "start", "margin-bottom": "24px" }}>
            <div>
              <h1 style={{ "font-size": "24px", "font-weight": "700", "margin-bottom": "8px" }}>{data().name}</h1>
              <p style={{ color: "#808090", "font-size": "14px", "line-height": "1.6" }}>{data().description}</p>
            </div>
            <ComplexityBadge score={data().complexity.overall} />
          </div>

          {/* Complexity breakdown */}
          <div style={sectionStyle}>
            <h3 style={headingStyle}>Complexity Breakdown</h3>
            <div style={{ display: "grid", "grid-template-columns": "repeat(3, 1fr)", gap: "12px", "margin-bottom": "12px" }}>
              <div>
                <span style={{ "font-size": "11px", color: "#505060" }}>Technical</span>
                <div style={{ "font-size": "20px", "font-weight": "700", color: "#7c5cfc" }}>{data().complexity.technical}/10</div>
              </div>
              <div>
                <span style={{ "font-size": "11px", color: "#505060" }}>Market</span>
                <div style={{ "font-size": "20px", "font-weight": "700", color: "#f59e0b" }}>{data().complexity.market}/10</div>
              </div>
              <div>
                <span style={{ "font-size": "11px", color: "#505060" }}>Capital</span>
                <div style={{ "font-size": "20px", "font-weight": "700", color: "#22c55e" }}>{data().complexity.capital}/10</div>
              </div>
            </div>
            <p style={{ "font-size": "13px", color: "#808090" }}>{data().complexity.explanation}</p>
          </div>

          {/* Target Clients */}
          <div style={sectionStyle}>
            <h3 style={headingStyle}>Target Clients</h3>
            <For each={data().targetClients}>
              {(client) => (
                <div style={{ padding: "12px", background: "#0f0f23", "border-radius": "8px", "margin-bottom": "8px" }}>
                  <div style={{ "font-weight": "600", "font-size": "14px", "margin-bottom": "4px" }}>{client.segment}</div>
                  <div style={{ "font-size": "12px", color: "#808090" }}>{client.industry} - {client.size}</div>
                  <div style={{ display: "flex", gap: "6px", "flex-wrap": "wrap", "margin-top": "8px" }}>
                    <For each={client.painPoints}>
                      {(point) => (
                        <span style={{ padding: "2px 8px", background: "#2a2a4a", "border-radius": "4px", "font-size": "11px", color: "#a0a0c0" }}>
                          {point}
                        </span>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </For>
          </div>

          {/* Client Contacts */}
          <div style={sectionStyle}>
            <h3 style={headingStyle}>Companies to Contact</h3>
            <For each={data().clientContacts}>
              {(contact) => (
                <div style={{ display: "flex", "justify-content": "space-between", "align-items": "center", padding: "12px", background: "#0f0f23", "border-radius": "8px", "margin-bottom": "8px" }}>
                  <div>
                    <div style={{ "font-weight": "600", "font-size": "14px" }}>{contact.companyName}</div>
                    <div style={{ "font-size": "12px", color: "#808090", "margin-top": "2px" }}>{contact.reasoning}</div>
                  </div>
                  <a href={contact.website} target="_blank" rel="noopener" style={{ color: "#7c5cfc", "font-size": "12px" }}>
                    Visit &rarr;
                  </a>
                </div>
              )}
            </For>
          </div>

          {/* Marketing Funnels */}
          <div style={sectionStyle}>
            <h3 style={headingStyle}>Marketing Funnels</h3>
            <For each={data().marketingFunnels}>
              {(funnel) => (
                <div style={{ padding: "16px", background: "#0f0f23", "border-radius": "8px", "margin-bottom": "12px" }}>
                  <div style={{ display: "flex", "justify-content": "space-between", "margin-bottom": "12px" }}>
                    <strong style={{ "font-size": "14px" }}>{funnel.name}</strong>
                    <div style={{ "font-size": "11px", color: "#808090" }}>
                      Cost: {funnel.estimatedCost} | First lead: {funnel.timeToFirstLead}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <For each={funnel.stages}>
                      {(stage, i) => (
                        <div style={{ flex: 1, padding: "10px", background: "#1a1a2e", "border-radius": "6px" }}>
                          <div style={{ "font-size": "11px", color: "#7c5cfc", "font-weight": "600", "margin-bottom": "4px" }}>
                            {stage.name}
                          </div>
                          <div style={{ "font-size": "11px", color: "#808090", "margin-bottom": "6px" }}>{stage.description}</div>
                          <div style={{ "font-size": "10px", color: "#505060" }}>
                            {stage.channels.join(", ")}
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </For>
          </div>

          {/* Sources */}
          <div style={sectionStyle}>
            <h3 style={headingStyle}>Source Data</h3>
            <For each={data().sourceData}>
              {(source) => (
                <div style={{ padding: "8px 0", "border-bottom": "1px solid #1a1a3e", "font-size": "12px" }}>
                  <span style={{ color: "#7c5cfc", "margin-right": "8px" }}>[{source.sourceType}]</span>
                  <Show when={source.url} fallback={<span>{source.title}</span>}>
                    <a href={source.url} target="_blank" rel="noopener" style={{ color: "#a0a0c0" }}>{source.title}</a>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </div>
      )}
    </Show>
  );
}
