// Line icons used by the explainer cards (24x24 grid).
export type GlyphName =
  | "tag" | "chair" | "doctor" | "star" | "chart" | "users" | "building" | "search"
  | "check" | "play" | "share" | "clock" | "x" | "arrow";

const st = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const Glyph: React.FC<{ name: GlyphName; size: number; color?: string; fill?: boolean }> = ({ name, size, color = "currentColor", fill }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ color, display: "block" }}>
    {name === "tag" && <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z M7.5 7.5h.01" {...st} fill={fill ? "currentColor" : "none"} />}
    {name === "chair" && <path {...st} d="M6 11V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6M4 11h16v4H4zM6 15v6M18 15v6" />}
    {name === "doctor" && (
      <g {...st}>
        <circle cx="12" cy="7.5" r="4" />
        <path d="M4 21c.6-4.2 3.8-6.5 8-6.5s7.4 2.3 8 6.5" />
        <path d="M12 16.5v3M10.5 18h3" />
      </g>
    )}
    {name === "star" && <path {...st} d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z" fill={fill ? "currentColor" : "none"} />}
    {name === "chart" && <path {...st} d="M3 20h18M6 16v-3M11 16V9M16 16V6M5 9l5-4 4 3 6-5" />}
    {name === "users" && (
      <g {...st}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5" />
        <circle cx="17" cy="9" r="2.6" />
        <path d="M17.5 14.6c2.3.3 3.7 2 4 4.6" />
      </g>
    )}
    {name === "building" && <path {...st} d="M4 21V5l8-2 8 2v16M4 21h16M9 8h2M13 8h2M9 12h2M13 12h2M10 21v-4h4v4M12 3v0" />}
    {name === "search" && (
      <g {...st}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l5 5" />
      </g>
    )}
    {name === "check" && <path {...st} d="M5 12.5l4.5 4.5L19 7.5" strokeWidth={3} />}
    {name === "play" && <path d="M8 5.5v13l11-6.5z" fill="currentColor" />}
    {name === "share" && (
      <g {...st}>
        <circle cx="18" cy="5" r="2.6" />
        <circle cx="6" cy="12" r="2.6" />
        <circle cx="18" cy="19" r="2.6" />
        <path d="M8.3 10.8l7.4-4.4M8.3 13.2l7.4 4.4" />
      </g>
    )}
    {name === "clock" && (
      <g {...st}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </g>
    )}
    {name === "x" && <path {...st} d="M6 6l12 12M18 6L6 18" strokeWidth={3} />}
    {name === "arrow" && <path {...st} d="M3 12h17M14 6l6 6-6 6" />}
  </svg>
);
