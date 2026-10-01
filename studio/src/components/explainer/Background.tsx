import { AbsoluteFill } from "remotion";
import { theme } from "../../data/insp01";

// Cream canvas with soft blue light leaking from both edges, slowly drifting.
export const Background: React.FC<{ t: number }> = ({ t }) => {
  const a = Math.sin(t * 0.6) * 160;
  const b = Math.cos(t * 0.45) * 200;
  const glow = (x: string, y: number, w: number, h: number, o: number) => (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: "50%",
        background: theme.glow,
        opacity: o,
        filter: "blur(70px)",
        transform: "translateX(-50%)",
      }}
    />
  );
  return (
    <AbsoluteFill style={{ background: theme.bg, overflow: "hidden" }}>
      {glow("0%", 200 + a, 160, 900, 0.55)}
      {glow("0%", 1200 - b, 120, 600, 0.35)}
      {glow("100%", 500 + b, 170, 1000, 0.5)}
      {glow("100%", 1450 + a, 120, 500, 0.3)}
    </AbsoluteFill>
  );
};
