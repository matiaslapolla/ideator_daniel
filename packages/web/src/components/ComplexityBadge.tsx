function getColor(score: number): string {
  if (score <= 3) return "#22c55e";
  if (score <= 6) return "#f59e0b";
  return "#ef4444";
}

function getLabel(score: number): string {
  if (score <= 3) return "Low";
  if (score <= 6) return "Medium";
  return "High";
}

export default function ComplexityBadge(props: { score: number }) {
  const color = () => getColor(props.score);
  return (
    <span
      style={{
        display: "inline-flex",
        "align-items": "center",
        gap: "4px",
        padding: "2px 8px",
        "border-radius": "12px",
        "font-size": "11px",
        "font-weight": "600",
        background: `${color()}20`,
        color: color(),
        "white-space": "nowrap",
      }}
    >
      {props.score}/10 {getLabel(props.score)}
    </span>
  );
}
