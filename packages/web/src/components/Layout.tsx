import type { RouteSectionProps } from "@solidjs/router";
import { A } from "@solidjs/router";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/generate", label: "Generate" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

export default function Layout(props: RouteSectionProps) {
  return (
    <div style={{ display: "flex", "min-height": "100vh" }}>
      <nav
        style={{
          width: "220px",
          background: "#1a1a2e",
          padding: "24px 16px",
          "border-right": "1px solid #2a2a4a",
          display: "flex",
          "flex-direction": "column",
          gap: "8px",
        }}
      >
        <h1
          style={{
            "font-size": "20px",
            "font-weight": "700",
            color: "#7c5cfc",
            "margin-bottom": "24px",
            "letter-spacing": "-0.5px",
          }}
        >
          Ideator
        </h1>
        {navItems.map((item) => (
          <A
            href={item.href}
            style={{
              color: "#a0a0c0",
              "text-decoration": "none",
              padding: "10px 12px",
              "border-radius": "8px",
              "font-size": "14px",
              transition: "all 0.15s",
            }}
            activeClass="active-nav"
            end={item.href === "/"}
          >
            {item.label}
          </A>
        ))}
      </nav>
      <main
        style={{
          flex: 1,
          padding: "32px",
          "max-width": "1200px",
          overflow: "auto",
        }}
      >
        {props.children}
      </main>
      <style>{`
        .active-nav { background: #2a2a4a !important; color: #e0e0ff !important; }
        nav a:hover { background: #222244; color: #c0c0e0; }
      `}</style>
    </div>
  );
}
