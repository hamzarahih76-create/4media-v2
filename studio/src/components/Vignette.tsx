import { AbsoluteFill } from "remotion";

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.45 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 75% 60% at 50% 45%, transparent 55%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: "none",
    }}
  />
);
