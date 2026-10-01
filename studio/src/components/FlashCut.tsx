import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

// White flash overlay, placed on a cut point to hide/accent the cut.
export const FlashCut: React.FC<{ durationInFrames?: number; color?: string }> = ({
  durationInFrames = 6,
  color = "white",
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 1, durationInFrames], [0, 0.9, 0], {
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ backgroundColor: color, opacity }} />;
};
