import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";
import "@fontsource/cairo/900.css";
import "@fontsource/inter/700.css";
import "@fontsource/playfair-display/800-italic.css";
import { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Vignette } from "../components/Vignette";
import { Bubbles, Captions, Corner, HookKicker, HookWord, LightLeak, Moments, NoScreen, Objects, Outro, StepCards, Swap, Timer, Versus } from "../components/warm/AlkScenes";
import { Grain, inout, ramp } from "../components/warm/Warm";
import { hook, objects, punches, steps, versus } from "../data/alk01";

// media-02 "Warm Editorial 3D": warm glass cards with perspective entrances, editorial italic numbering,
// floating 3D-tilted icon tiles, blur-rise Darija captions, light leaks, smooth camera at 60fps.
// Recipe: recipes/alk01-warm-editorial.md

const SRC = "media/alk.mp4";
const CUT_FRAMES = 177; // public/media/alkcut/f_001..f_177.png (60fps, first 2.95s)
const GRADE = "contrast(1.06) saturate(1.06) sepia(0.05)";

const useFonts = () => {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all(['900 60px "Cairo"', '800 60px "Cairo"', '700 60px "Cairo"', 'italic 800 60px "Playfair Display"', '700 60px "Inter"'].map((f) => document.fonts.load(f, "أبت abc"))).finally(() => continueRender(h));
  }, [h]);
};

// smooth camera: intro pull-back, slow drift, punch-in on step titles
const camera = (t: number) => {
  let scale = 1.03 + 0.012 * Math.sin(t * 0.35);
  let ty = Math.sin(t * 0.27) * 6;
  scale *= 1 + 0.12 * (1 - ramp(t, 0, 1.6, inout)); // intro 1.12 -> 1.0
  for (const p of punches) {
    const k = Math.min(ramp(t, p.start - 0.15, p.start + 0.6, inout), 1 - ramp(t, p.end - 0.4, p.end + 0.3, inout));
    scale *= 1 + 0.1 * k;
    ty += 30 * k;
  }
  return { scale, ty };
};

export const Alk01: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cam = camera(t);
  const src = staticFile(SRC);
  const plate = { transform: `translateY(${cam.ty}px) scale(${cam.scale})`, transformOrigin: "50% 40%" };

  return (
    <AbsoluteFill style={{ background: "#120c08" }}>
      <AbsoluteFill style={plate}>
        <AbsoluteFill style={{ filter: GRADE }}>
          <OffthreadVideo src={src} style={{ width: "100%", height: "100%" }} />
        </AbsoluteFill>
        <HookWord t={t} fps={fps} />
        {frame < CUT_FRAMES && t < hook.end + 0.5 && (
          <AbsoluteFill style={{ filter: GRADE }}>
            <Img src={staticFile(`media/alkcut/f_${String(frame + 1).padStart(3, "0")}.png`)} style={{ width: "100%", height: "100%" }} />
          </AbsoluteFill>
        )}
      </AbsoluteFill>

      {/* soft top/bottom shading so cards & captions read on the busy plant/wood */}
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(18,12,8,0.45), transparent 32%, transparent 55%, rgba(18,12,8,0.55))" }} />
      <Vignette strength={0.35} />

      <HookKicker t={t} fps={fps} />
      <StepCards t={t} fps={fps} />
      <Swap t={t} fps={fps} />
      <Objects t={t} fps={fps} />
      <Timer t={t} fps={fps} />
      <Bubbles t={t} fps={fps} />
      <NoScreen t={t} fps={fps} />
      <Moments t={t} fps={fps} />
      <Corner t={t} fps={fps} />
      <Versus t={t} fps={fps} />
      <Captions t={t} fps={fps} />
      <Outro t={t} fps={fps} />
      <LightLeak t={t} fps={fps} at={[...steps.map((s) => s.start), objects.start, versus.start]} />
      <Grain t={t} />
    </AbsoluteFill>
  );
};
