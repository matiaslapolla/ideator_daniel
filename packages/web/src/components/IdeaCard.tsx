import { A } from "@solidjs/router";
import ComplexityBadge from "./ComplexityBadge";

interface Props {
  id: string;
  name: string;
  description: string;
  complexity: number;
  createdAt: string;
}

export default function IdeaCard(props: Props) {
  return (
    <A
      href={`/ideas/${props.id}`}
      style={{
        display: "block",
        background: "#1a1a2e",
        border: "1px solid #2a2a4a",
        "border-radius": "12px",
        padding: "20px",
        "text-decoration": "none",
        color: "inherit",
        transition: "border-color 0.15s, transform 0.15s",
      }}
    >
      <div style={{ display: "flex", "justify-content": "space-between", "align-items": "start", "margin-bottom": "8px" }}>
        <h3 style={{ "font-size": "16px", color: "#e0e0ff", margin: 0 }}>{props.name}</h3>
        <ComplexityBadge score={props.complexity} />
      </div>
      <p style={{ "font-size": "13px", color: "#808090", "line-height": "1.5", margin: "0 0 12px 0" }}>
        {props.description.slice(0, 150)}...
      </p>
      <span style={{ "font-size": "11px", color: "#505060" }}>
        {new Date(props.createdAt).toLocaleDateString()}
      </span>
    </A>
  );
}
