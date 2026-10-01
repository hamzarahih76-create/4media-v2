import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// Thin glowing progress bar - keeps viewers watching till the end.
export const ProgressBar: React.FC<{ color: string; height?: number; bottom?: number }> = ({
  color,
  height = 10,
  bottom = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = frame / (durationInFrames - 1);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", bottom, left: 0, height, width: "100%", background: "rgba(255,255,255,0.12)" }} />
      <div
        style={{
          position: "absolute",
          bottom,
          left: 0,
          height,
          width: `${p * 100}%`,
          background: color,
          boxShadow: `0 0 18px ${color}, 0 0 6px ${color}`,
          borderRadius: "0 6px 6px 0",
        }}
      />
    </AbsoluteFill>
  );
};
