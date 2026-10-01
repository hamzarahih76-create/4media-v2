import type { Card } from "../data/montage01-captions";

const s = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

// Minimal line icons (24x24 grid).
export const Icon: React.FC<{ name: Card["icon"]; size: number }> = ({ name, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    {name === "cross" && <path {...s} d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />}
    {name === "chart" && <path {...s} d="M3 20h18M5 16l5-5 4 3 6-7M15 7h5v5" />}
    {name === "users" && (
      <g {...s}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5" />
        <circle cx="17" cy="9" r="2.6" />
        <path d="M17.5 14.6c2.3.3 3.7 2 4 4.6" />
      </g>
    )}
    {name === "star" && <path {...s} d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z" />}
    {name === "check" && (
      <g {...s}>
        <circle cx="12" cy="12" r="9" />
        <path d="M7.5 12.5l3 3 6-6.5" />
      </g>
    )}
    {name === "play" && (
      <g {...s}>
        <rect x="2.5" y="5" width="19" height="14" rx="3" />
        <path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" />
      </g>
    )}
    {name === "steps" && <path {...s} d="M3 20h5v-5h5v-5h5V5h3" />}
  </svg>
);
