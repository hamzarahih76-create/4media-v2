import { AbsoluteFill, Easing, interpolate, spring } from "remotion";
import { C } from "../../data/alk01";

// "Warm Editorial 3D" building blocks: smooth expo easing, perspective entrances, soft floating.
export const expo = Easing.bezier(0.16, 1, 0.3, 1);
export const inout = Easing.bezier(0.65, 0, 0.35, 1);

export const ramp = (t: number, a: number, b: number, ease = expo) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

/** in/out envelope: 0 -> 1 (expo, dIn) ... 1 -> 0 (inout, dOut) */
export const env = (t: number, start: number, end: number, dIn = 0.7, dOut = 0.35) =>
  Math.min(ramp(t, start, start + dIn), 1 - ramp(t, end - dOut, end, inout));

export const springAt = (t: number, t0: number, fps: number, damping = 22, stiffness = 140) =>
  t < t0 ? 0 : spring({ frame: (t - t0) * fps, fps, config: { damping, stiffness, mass: 0.9 } });

export const glass: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(255,244,230,0.30), rgba(255,244,230,0.10))",
  border: "2px solid rgba(255,244,230,0.45)",
  boxShadow: "0 30px 80px rgba(26,20,16,0.45), inset 0 1px 0 rgba(255,255,255,0.5)",
  backdropFilter: "blur(22px) saturate(1.3)",
};

type IconName = "palette" | "puzzle" | "book" | "phone" | "plate" | "moon" | "home" | "bolt" | "brain" | "clock";
const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
export const Ico: React.FC<{ name: IconName; size: number; color?: string }> = ({ name, size, color = C.cream }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ color, display: "block" }}>
    {name === "palette" && (
      <g {...s}>
        <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-1.3-1.1-1.6-1.1-2.7 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" />
        <circle cx="7.5" cy="11" r="1.2" fill="currentColor" />
        <circle cx="10.5" cy="7.3" r="1.2" fill="currentColor" />
        <circle cx="15" cy="7.8" r="1.2" fill="currentColor" />
      </g>
    )}
    {name === "puzzle" && <path {...s} d="M4 8h3a2 2 0 1 1 4 0h3v3a2 2 0 1 1 0 4v3h-3a2 2 0 1 0-4 0H4v-3a2 2 0 1 0 0-4z" />}
    {name === "book" && <path {...s} d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13" />}
    {name === "phone" && (
      <g {...s}>
        <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
        <path d="M10.5 18.5h3" />
      </g>
    )}
    {name === "plate" && (
      <g {...s}>
        <circle cx="12" cy="12" r="6.5" />
        <circle cx="12" cy="12" r="3.5" />
        <path d="M2.5 4v6M2.5 10v10M21.5 4c-1.5 1-2 3-2 5h2v11" />
      </g>
    )}
    {name === "moon" && <path {...s} d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />}
    {name === "home" && <path {...s} d="M3.5 11L12 4l8.5 7M5.5 9.5V20h13V9.5M10 20v-5h4v5" />}
    {name === "bolt" && <path {...s} d="M13 2.5L4.5 13.5H12l-1 8 8.5-11H12z" />}
    {name === "brain" && <path {...s} d="M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2A3 3 0 0 0 7 17.5a3 3 0 0 0 5 1.5V5.5a3 3 0 0 0-3-1zM15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 5.2 3 3 0 0 1-3 4.8 3 3 0 0 1-5 1.5" />}
    {name === "clock" && (
      <g {...s}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </g>
    )}
  </svg>
);

export const IconTile: React.FC<{ name: IconName; size?: number; tint?: string }> = ({ name, size = 150, tint = C.terra }) => (
  <div
    style={{
      ...glass,
      width: size,
      height: size,
      borderRadius: size * 0.28,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: `linear-gradient(140deg, ${tint}EE, ${tint}99)`,
    }}
  >
    <Ico name={name} size={size * 0.52} />
  </div>
);

export const Ar: React.FC<{ children: React.ReactNode; size: number; weight?: number; color?: string; style?: React.CSSProperties }> = ({ children, size, weight = 800, color = C.cream, style }) => (
  <div style={{ fontFamily: "Cairo", fontWeight: weight, fontSize: size, color, direction: "rtl", lineHeight: 1.25, textShadow: "0 6px 24px rgba(26,20,16,0.55)", ...style }}>{children}</div>
);

export const Grain: React.FC<{ t: number }> = ({ t }) => (
  <AbsoluteFill style={{ opacity: 0.07, mixBlendMode: "overlay", pointerEvents: "none" }}>
    <svg width="100%" height="100%">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(t * 24) % 50} />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);
