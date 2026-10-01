import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// Fast "punch-in" zoom that snaps in on a beat, then settles.
export const PunchZoom: React.FC<{
  children: React.ReactNode;
  at?: number; // frame (relative to the parent Sequence) where the punch hits
  from?: number;
  to?: number;
}> = ({ children, at = 0, from = 1, to = 1.15 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 220 } });
  const scale = interpolate(s, [0, 1], [from, to]);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${scale})` }}>
      {children}
    </div>
  );
};
