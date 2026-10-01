import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Card } from "../data/montage01-captions";
import { Icon } from "./Icon";

// Glass pill that pops in over the speaker when a key idea is said.
export const KeywordCard: React.FC<{ card: Card; color: string; top: number }> = ({ card, color, top }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < card.start - 0.05 || t > card.end + 0.3) return null;
  const inS = spring({ frame: frame - card.start * fps, fps, config: { damping: 13, stiffness: 190 } });
  const out = interpolate(t, [card.end, card.end + 0.25], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const iconPop = spring({ frame: frame - card.start * fps - 5, fps, config: { damping: 9, stiffness: 260 } });
  const steps = card.icon === "steps";
  const stepActive = Math.floor(interpolate(t, [card.start + 0.3, card.end - 0.2], [0, 3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: out,
        transform: `translateY(${(1 - inS) * 60}px) scale(${0.7 + 0.3 * inS})`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "18px 36px 18px 18px",
          borderRadius: 999,
          background: "rgba(12,14,18,0.72)",
          border: `3px solid ${color}`,
          boxShadow: `0 0 40px ${color}55, 0 12px 40px rgba(0,0,0,0.5)`,
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 999,
            background: color,
            color: "#0b0d10",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${iconPop}) rotate(${(1 - iconPop) * -40}deg)`,
          }}
        >
          <Icon name={card.icon} size={52} />
        </div>
        <div style={{ fontFamily: "Cairo", fontWeight: 900, fontSize: 58, color: "white", letterSpacing: 0.5 }}>
          {card.label}
        </div>
        {steps && (
          <div style={{ display: "flex", gap: 12, marginLeft: 6 }}>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Cairo",
                  fontWeight: 900,
                  fontSize: 32,
                  color: n <= stepActive ? "#0b0d10" : "white",
                  background: n <= stepActive ? color : "rgba(255,255,255,0.15)",
                  transform: `scale(${n <= stepActive ? 1.1 : 1})`,
                }}
              >
                {n}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
