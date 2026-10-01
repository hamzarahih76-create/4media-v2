import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Phrase } from "../data/montage01-captions";

// Phrase captions (RTL Darija + French), words appear one by one, current word scales up,
// highlighted words in brand color. Words are spread across the phrase duration.
export const KaraokeCaptions: React.FC<{ phrases: Phrase[]; color: string; centerY: number }> = ({
  phrases,
  color,
  centerY,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = phrases.find((x) => t >= x.start - 0.05 && t < x.end + 0.15);
  if (!p) return null;
  // Keep consecutive French words together as one LTR token ("Les Médecins") inside RTL text.
  const isLatin = (w: string) => /[a-zA-Zéèà']/.test(w);
  const words = p.text.split(" ").reduce<string[]>((acc, w) => {
    const last = acc[acc.length - 1];
    if (last !== undefined && isLatin(w) && isLatin(last)) acc[acc.length - 1] = `${last} ${w}`;
    else acc.push(w);
    return acc;
  }, []);
  const span = (p.end - p.start) * 0.85;
  const out = interpolate(t, [p.end, p.end + 0.15], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        top: centerY,
        left: 70,
        right: 70,
        transform: "translateY(-50%)",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        direction: "rtl",
        columnGap: 22,
        rowGap: 0,
        opacity: out,
      }}
    >
      {words.map((w, i) => {
        const ws = p.start + (span * i) / words.length;
        const appear = spring({ frame: frame - ws * fps, fps, config: { damping: 14, stiffness: 320 } });
        const active = t >= ws && (i === words.length - 1 || t < p.start + (span * (i + 1)) / words.length);
        const hl = w.split(" ").some((x) => p.hl?.includes(x.replace(/[،,]/g, "")));
        const latin = isLatin(w);
        return (
          <span
            key={i}
            style={{
              fontFamily: "Cairo",
              fontWeight: 900,
              fontSize: latin ? 74 : 80,
              lineHeight: 1.35,
              color: hl ? color : "white",
              opacity: appear,
              transform: `translateY(${(1 - appear) * 30}px) scale(${active ? 1.12 : 1})`,
              textShadow: hl ? `0 0 28px ${color}88, 0 4px 14px rgba(0,0,0,0.8)` : "0 4px 14px rgba(0,0,0,0.85)",
              display: "inline-block",
              direction: latin ? "ltr" : "rtl",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};
