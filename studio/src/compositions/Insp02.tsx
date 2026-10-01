import "@fontsource/cairo/700.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/lora/500-italic.css";
import "@fontsource/oswald/700.css";
import { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Chapter, GlassPanel, NameTag, NeonTitle, RedCaption, Scale, YellowList } from "../components/cine/Cine";
import { fade, pop } from "../components/explainer/anim";
import { Vignette } from "../components/Vignette";
import { montage01 } from "../data/montage01";
import { captions01 } from "../data/montage01-captions";
import { chapters, checklist, ctaAt, endScreen, intro, panels, red, scales } from "../data/insp02";
import { buildBlocks, cameraAt, type CameraOptions } from "../lib/camera";

// media-01 re-edited in the style of media/refs/insp02.mp4 (dark cinematic, red neon):
// full-frame speaker with jump zooms, neon title behind the speaker (rembg cutout), 1-10 scale + cursor,
// glass name tag, black chapter cards with red light lines, frosted "app" panels with red checklists,
// yellow highlighter list, Arabic captions on red strips. Recipe: recipes/insp02-cinematic.md

const SRC = "media/src1440.mp4";
const GRADE = "contrast(1.1) saturate(0.95) brightness(0.96)";
const CUTOUT_FRAMES = 102; // public/media/cutout/f_001..f_102.png (scripts/cutout.py, 30fps from t=0)

const mask = (a: number, b: number, f: number) =>
  `linear-gradient(to bottom, transparent ${a - f}px, black ${a}px, black ${b}px, transparent ${b + f}px)`;

const useFonts = () => {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all(
      ['700 60px "Oswald"', '800 60px "Inter"', '700 60px "Inter"', '500 60px "Inter"', 'italic 500 60px "Lora"', '700 60px "Cairo"'].map((f) => document.fonts.load(f)),
    ).finally(() => continueRender(h));
  }, [h]);
};

export const Insp02: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const opts: CameraOptions = useMemo(
    () => ({ shots: montage01.shots, beats: montage01.beats, beatsPerBlock: 8, levels: [1.0, 1.14], push: 0.02, ctaStart: 999, punch: 1.04 }),
    [],
  );
  const blocks = useMemo(() => buildBlocks(opts), [opts]);
  const cam = cameraAt(t, fps, opts, blocks);
  const inTalk = montage01.shots.some((s) => s.kind === "talk" && t >= s.start && t < s.end);
  const bands = 1 - fade(t, endScreen - 0.2, endScreen);
  const src = staticFile(SRC);

  const covered =
    t < intro.end + 0.2 ||
    panels.some((p) => t >= p.start && t < p.end + 0.2) ||
    chapters.some((c) => t >= c.start && t < c.end) ||
    (t >= checklist.start && t < checklist.end);
  const cap = !covered ? captions01.find((p) => t >= p.start && t < p.end + 0.1) : undefined;
  const cta = pop(t, ctaAt + 0.4, fps, 170, 14);

  return (
    <AbsoluteFill style={{ background: "black" }}>
      {/* clean plate: footage + bands hiding burned-in title/captions, all zoomed together */}
      <AbsoluteFill style={{ transform: `scale(${cam.scale})`, transformOrigin: "50% 38%" }}>
        <AbsoluteFill style={{ filter: GRADE }}>
          <OffthreadVideo src={src} style={{ width: "100%", height: "100%" }} />
        </AbsoluteFill>
        {inTalk && (
          // curtain patch: the same footage shifted down 150px covers the title band with clean
          // curtain folds (folds are vertical, so the shift is invisible)
          <AbsoluteFill style={{ maskImage: mask(445, 552, 22), WebkitMaskImage: mask(445, 552, 22), filter: GRADE }}>
            <OffthreadVideo src={src} muted style={{ width: "100%", height: "100%", transform: "translateY(150px)" }} />
          </AbsoluteFill>
        )}
        {bands > 0 && (
          <AbsoluteFill style={{ opacity: bands, maskImage: mask(1110, 2100, 140), WebkitMaskImage: mask(1110, 2100, 140) }}>
            <OffthreadVideo src={src} muted style={{ width: "100%", height: "100%", filter: "blur(34px) brightness(0.42) saturate(0.9)" }} />
            <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.55))" }} />
          </AbsoluteFill>
        )}
        <NeonTitle t={t} fps={fps} lines={intro.title} start={intro.start} end={intro.end} />
        {frame < CUTOUT_FRAMES && t < intro.end + 0.3 && (
          <AbsoluteFill style={{ maskImage: mask(0, 1050, 60), WebkitMaskImage: mask(0, 1050, 60), filter: GRADE }}>
            <Img src={staticFile(`media/cutout/f_${String(frame + 1).padStart(3, "0")}.png`)} style={{ width: "100%", height: "100%" }} />
          </AbsoluteFill>
        )}
      </AbsoluteFill>

      <Vignette strength={0.55} />

      {scales.map((s) => (
        <Scale key={s.start} t={t} fps={fps} start={s.start} end={s.end} side={s.side} />
      ))}
      <NameTag t={t} fps={fps} start={intro.start} end={intro.end} name={intro.name} role={intro.role} />
      {panels.map((p) => (
        <GlassPanel key={p.start} t={t} fps={fps} {...p} />
      ))}
      <YellowList t={t} fps={fps} {...checklist} />
      {cap && <RedCaption key={cap.start} t={t} fps={fps} text={cap.text} start={cap.start} top={960} />}
      {chapters.map((c) => (
        <Chapter key={c.n} t={t} fps={fps} {...c} />
      ))}

      {t >= ctaAt && (
        <div style={{ position: "absolute", top: 1240, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: cta, transform: `scale(${0.6 + 0.4 * cta})` }}>
          <div style={{ padding: "18px 56px", borderRadius: 999, background: red.main, boxShadow: `0 0 0 6px rgba(226,74,91,0.25), 0 0 40px ${red.neon}88`, fontFamily: "Inter", fontWeight: 800, fontSize: 56, color: "white" }}>4media.ma →</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
