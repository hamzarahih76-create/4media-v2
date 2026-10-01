import "@fontsource/cairo/700.css";
import "@fontsource/cairo/900.css";
import { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { KaraokeCaptions } from "../components/KaraokeCaptions";
import { KeywordCard } from "../components/KeywordCard";
import { ProgressBar } from "../components/ProgressBar";
import { Vignette } from "../components/Vignette";
import { montage01 } from "../data/montage01";
import { captions01, cards01 } from "../data/montage01-captions";
import { buildBlocks, cameraAt, type CameraOptions } from "../lib/camera";

// v2 of media-01: old burned-in captions hidden under a frosted band, rewritten as animated
// karaoke captions (Cairo font), keyword cards with icons, CTA pill - on top of v1's camera work.
// Recipe: recipes/montage01-upgrade.md

const GRADE = "contrast(1.06) saturate(1.08)";
const ORIGIN = "50% 68%"; // zoom anchored low so old captions barely move (stay under the band)
const TITLE = { top: 8.5, bottom: 15.5 }; // % of height, burned-in title band
const BAND = { top: 1130, bottom: 1730 }; // px, covers old captions at every zoom level
const BAND_END = 54.133; // end screen has no captions

const useFonts = () => {
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all([document.fonts.load('900 80px "Cairo"'), document.fonts.load('700 80px "Cairo"'), document.fonts.load('900 80px "Cairo"', "أب")])
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);
};

const mask = (from: string, to: string, feather: string) =>
  `linear-gradient(to bottom, transparent calc(${from} - ${feather}), black ${from}, black ${to}, transparent calc(${to} + ${feather}))`;

export const Montage02: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const opts: CameraOptions = useMemo(
    () => ({
      shots: montage01.shots,
      beats: montage01.beats,
      beatsPerBlock: 8,
      levels: [1.0, 1.09],
      push: 0.025,
      ctaStart: montage01.ctaStart,
      punch: 1.07,
    }),
    [],
  );
  const blocks = useMemo(() => buildBlocks(opts), [opts]);
  const cam = cameraAt(t, fps, opts, blocks);
  const inTalk = montage01.shots.some((s) => s.kind === "talk" && t >= s.start && t < s.end);
  const bandOpacity = interpolate(t, [BAND_END - 0.25, BAND_END], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const zoomed = { transform: `scale(${cam.scale})`, transformOrigin: ORIGIN };
  const src = staticFile(montage01.src);

  const cta = spring({ frame: frame - (montage01.ctaStart + 0.4) * fps, fps, config: { damping: 12, stiffness: 180 } });
  const arrow = Math.sin((t - montage01.ctaStart) * 7) * 10;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ ...zoomed, filter: `${GRADE}${cam.blur > 0.1 ? ` blur(${cam.blur.toFixed(1)}px)` : ""}` }}>
        <OffthreadVideo src={src} />
      </AbsoluteFill>

      {inTalk && (
        <AbsoluteFill style={{ filter: GRADE, maskImage: mask(`${TITLE.top + 1.5}%`, `${TITLE.bottom - 2}%`, "2.5%"), WebkitMaskImage: mask(`${TITLE.top + 1.5}%`, `${TITLE.bottom - 2}%`, "2.5%") }}>
          <OffthreadVideo src={src} muted />
        </AbsoluteFill>
      )}

      {bandOpacity > 0 && (
        // Frosted band hiding the old burned-in captions
        <AbsoluteFill
          style={{
            opacity: bandOpacity,
            maskImage: mask(`${BAND.top}px`, `${BAND.bottom}px`, "90px"),
            WebkitMaskImage: mask(`${BAND.top}px`, `${BAND.bottom}px`, "90px"),
          }}
        >
          <AbsoluteFill style={{ ...zoomed, filter: "blur(34px) brightness(0.55) saturate(1.25)" }}>
            <OffthreadVideo src={src} muted />
          </AbsoluteFill>
          <AbsoluteFill style={{ background: "rgba(5,8,10,0.22)" }} />
        </AbsoluteFill>
      )}

      <Vignette strength={0.35} />

      {cards01.map((c) => (
        <KeywordCard key={c.start} card={c} color={montage01.brand} top={1000} />
      ))}
      <KaraokeCaptions phrases={captions01} color={montage01.brand} centerY={(BAND.top + BAND.bottom) / 2} />

      {t >= montage01.ctaStart && (
        <div style={{ position: "absolute", top: 1180, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: cta, transform: `scale(${0.6 + 0.4 * cta})` }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "20px 44px",
              borderRadius: 999,
              background: montage01.brand,
              boxShadow: `0 0 60px ${montage01.brand}99`,
              fontFamily: "Cairo",
              fontWeight: 900,
              fontSize: 60,
              color: "#0b0d10",
            }}
          >
            4media.ma
            <span style={{ display: "inline-block", transform: `translateX(${arrow}px)` }}>→</span>
          </div>
        </div>
      )}

      {cam.flash > 0.01 && <AbsoluteFill style={{ backgroundColor: "white", opacity: cam.flash }} />}
      <ProgressBar color={montage01.brand} height={10} />
    </AbsoluteFill>
  );
};
