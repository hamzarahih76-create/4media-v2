import { useMemo } from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ProgressBar } from "../components/ProgressBar";
import { Vignette } from "../components/Vignette";
import { montage01 } from "../data/montage01";
import { buildBlocks, cameraAt, type CameraOptions } from "../lib/camera";

// Upgrade pass on an already-edited ad (burned captions kept intact):
// virtual 2-camera jump zooms on the beat, punch transitions, hook, CTA pulse,
// light grade + vignette, brand progress bar. Recipe: recipes/montage01-upgrade.md
// Vertical band (in % of height) holding the burned-in "Consultation médicale" title.
const TITLE = { top: 23.2, bottom: 29.6 };

export const Montage01: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opts: CameraOptions = useMemo(
    () => ({
      shots: montage01.shots,
      beats: montage01.beats,
      beatsPerBlock: 8,
      levels: [1.0, 1.12],
      push: 0.03,
      ctaStart: montage01.ctaStart,
    }),
    [],
  );
  const blocks = useMemo(() => buildBlocks(opts), [opts]);
  const t = frame / fps;
  const cam = cameraAt(t, fps, opts, blocks);
  const inTalk = montage01.shots.some((s) => s.kind === "talk" && t >= s.start && t < s.end);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${cam.scale})`,
          transformOrigin: "50% 42%",
          filter: `contrast(1.06) saturate(1.08)${cam.blur > 0.1 ? ` blur(${cam.blur.toFixed(1)}px)` : ""}`,
        }}
      >
        <OffthreadVideo src={staticFile(montage01.src)} />
      </AbsoluteFill>
      {inTalk && (
        // Burned-in title stays locked (unzoomed) so jump zooms never crop it.
        // Feathered band over the uniform dark curtain hides the seam.
        <AbsoluteFill
          style={{
            filter: "contrast(1.06) saturate(1.08)",
            WebkitMaskImage: `linear-gradient(to bottom, transparent ${TITLE.top - 1}%, black ${TITLE.top + 1.5}%, black ${TITLE.bottom - 2}%, transparent ${TITLE.bottom + 1}%)`,
            maskImage: `linear-gradient(to bottom, transparent ${TITLE.top - 1}%, black ${TITLE.top + 1.5}%, black ${TITLE.bottom - 2}%, transparent ${TITLE.bottom + 1}%)`,
          }}
        >
          <OffthreadVideo src={staticFile(montage01.src)} muted />
        </AbsoluteFill>
      )}
      <Vignette strength={0.4} />
      {cam.flash > 0.01 && <AbsoluteFill style={{ backgroundColor: "white", opacity: cam.flash }} />}
      <ProgressBar color={montage01.brand} height={10} />
    </AbsoluteFill>
  );
};
