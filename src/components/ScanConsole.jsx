import { useState, useEffect } from "react";

const lines = [
  { text: "$ reposcope analyse github.com/acme/checkout", type: "cmd" },
  { text: "→ connecting to GitHub API...", type: "dim" },
  { text: "→ stack: Node.js, Express, PostgreSQL", type: "purple" },
  { text: "→ fetching 247 commits...", type: "dim" },
  { text: "→ TDD score: 78% — strong discipline", type: "pass" },
  { text: "→ auditing 48 dependencies...", type: "dim" },
  { text: "→ 1 CVE: lodash@4.17.15 (HIGH)", type: "warn" },
  { text: "→ no secrets committed to history", type: "pass" },
  { text: "→ report ready — 2 findings to review", type: "cyan" },
];

const colorFor = {
  cmd: "#f0f0ff",
  dim: "#2a2a40",
  purple: "#6666aa",
  pass: "#22c55e",
  warn: "#f59e0b",
  cyan: "#38bdf8",
};

export default function ScanConsole() {
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    lines.forEach((_, i) => {
      setTimeout(() => setVisible((prev) => [...prev, i]), 300 + i * 380);
    });
  }, []);

  return (
    <div style={{
      width: "100%", maxWidth: 520, overflow: "hidden",
      borderRadius: 18, border: "1px solid rgba(255,255,255,.08)",
      background: "#08080f",
      boxShadow: "0 40px 100px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.06)",
    }}>
      {/* Title bar */}
      <div style={{ background: "rgba(255,255,255,.04)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#33334a", marginLeft: 8 }}>
          reposcope — analysis session
        </span>
      </div>

      {/* Terminal lines */}
      <div style={{ padding: "18px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, lineHeight: 1.9, minHeight: 200 }}>
        {lines.map((l, i) => (
          <span key={i} style={{
            display: "block",
            color: colorFor[l.type],
            opacity: visible.includes(i) ? 1 : 0,
            transform: visible.includes(i) ? "none" : "translateX(-8px)",
            transition: "opacity .3s, transform .3s",
          }}>
            {l.text}
          </span>
        ))}
      </div>
    </div>
  );
}