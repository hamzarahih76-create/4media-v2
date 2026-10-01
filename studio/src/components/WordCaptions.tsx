import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type Word = { text: string; start: number; end: number }; // seconds

// TikTok-style captions: one word at a time, pop-in, active word highlighted.
export const WordCaptions: React.FC<{
  words: Word[];
  highlight?: string;
  fontFamily?: string;
}> = ({ words, highlight = "#FFD400", fontFamily = "Arial Black, sans-serif" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const current = words.find((w) => t >= w.start && t < w.end);
  if (!current) return null;
  const pop = spring({ frame: frame - current.start * fps, fps, config: { damping: 12, stiffness: 300 } });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", top: "35%" }}>
      <div
        style={{
          fontFamily,
          fontSize: 110,
          fontWeight: 900,
          color: highlight,
          textTransform: "uppercase",
          WebkitTextStroke: "6px black",
          paintOrder: "stroke",
          transform: `scale(${0.6 + 0.4 * pop})`,
          textShadow: "0 8px 24px rgba(0,0,0,0.6)",
        }}
      >
        {current.text}
      </div>
    </AbsoluteFill>
  );
};
