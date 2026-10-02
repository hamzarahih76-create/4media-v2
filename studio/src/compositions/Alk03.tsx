import "@fontsource/cairo/700.css";
import "@fontsource/cairo/800.css";
import "@fontsource/cairo/900.css";
import "@fontsource/inter/700.css";
import "@fontsource/playfair-display/800-italic.css";
import { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Vignette } from "../components/Vignette";
import { Captions, LightLeak, Outro } from "../components/warm/AlkScenes";
import { Ar, Grain, inout, ramp, springAt } from "../components/warm/Warm";
import { C } from "../data/alk01";
import { AltScene, AR, ClockScene, FlipScene, HookWord3D, NUM, Overlay3D, overlayLabels, px, RoomScene, ScaleScene } from "../three/Alk03Scenes";
import { useFonts3D } from "../three/Text3D";

// El Khanssaa v3 - real 3D (three.js): clay-premium objects (books that open, phone, puzzle, crayons,
// blocks, alarm clock, no-phone sign, plate, moon, speech bubbles, balance scale, reading-corner
// diorama) + extruded 3D Arabic titles (opentype.js). Overlay 3D around the speaker, full-screen 3D sets
// with blur-through transitions, warm captions. 60fps. Recipe: recipes/alk03-real-3d.md

const FONTS3D = [AR, NUM];
const CUT_FRAMES = 177;
const GRADE = "contrast(1.06) saturate(1.06) sepia(0.05)";
const studio = [
  { id: "alt", start: 3.0, end: 7.9 },
  { id: "flip", start: 12.7, end: 17.0 },
  { id: "clock", start: 27.4, end: 31.3 },
  { id: "room", start: 53.1, end: 58.0 },
  { id: "scale", start: 58.0, end: 63.9 },
] as const;
const steps = [8.0, 23.2, 40.9];

const vis = (t: number, a: number, b: number) => Math.min(ramp(t, a - 0.2, a + 0.35), 1 - ramp(t, b - 0.35, b + 0.2));
const groups = studio.reduce<{ start: number; end: number }[]>((acc, s) => {
  const l = acc[acc.length - 1];
  if (l && Math.abs(l.end - s.start) < 0.05) l.end = s.end;
  else acc.push({ start: s.start, end: s.end });
  return acc;
}, []);

const useHtmlFonts = () => {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all(['900 60px "Cairo"', '800 60px "Cairo"', '700 60px "Cairo"', 'italic 800 60px "Playfair Display"', '700 60px "Inter"'].map((f) => document.fonts.load(f, "أبت abc"))).finally(() => continueRender(h));
  }, [h]);
};

const Label: React.FC<{ t: number; fps: number; at: number; end: number; x: number; y: number; text: string; sub?: string; dark?: boolean }> = ({ t, fps, at, end, x, y, text, sub, dark }) => {
  const s = springAt(t, at, fps, 18, 160);
  const out = ramp(t, end - 0.3, end);
  const p = px(x, y);
  return (
    <div style={{ position: "absolute", left: p.left - 250, top: p.top, width: 500, textAlign: "center", opacity: s * (1 - out), transform: `translateY(${(1 - s) * 30}px)` }}>
      <Ar size={dark ? 56 : 46} weight={900} color={dark ? C.ink : C.cream} style={dark ? { textShadow: "none" } : undefined}>{text}</Ar>
      {sub && <Ar size={dark ? 42 : 36} weight={700} color={dark ? "#8A6A52" : C.gold} style={dark ? { textShadow: "none" } : undefined}>{sub}</Ar>}
    </div>
  );
};

const camera = (t: number) => {
  let scale = 1.03 + 0.012 * Math.sin(t * 0.35);
  scale *= 1 + 0.12 * (1 - ramp(t, 0, 1.6, inout));
  for (const s of steps) {
    const k = Math.min(ramp(t, s - 0.15, s + 0.6, inout), 1 - ramp(t, s + 3.8, s + 4.5, inout));
    scale *= 1 + 0.08 * k;
  }
  return scale;
};

export const Alk03: React.FC = () => {
  useHtmlFonts();
  const ready = useFonts3D(FONTS3D);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (!ready) return null;

  const k = Math.max(0, ...groups.map((g) => vis(t, g.start, g.end)));
  const scale = camera(t);
  const overlayOn = k < 0.95 && t > 7.5;

  return (
    <AbsoluteFill style={{ background: "#120c08" }}>
      <AbsoluteFill style={{ transform: `scale(${scale * (1 + 0.14 * k)})`, transformOrigin: "50% 40%", filter: k > 0.01 ? `blur(${k * 26}px)` : undefined }}>
        <AbsoluteFill style={{ filter: GRADE }}>
          <OffthreadVideo src={staticFile("media/alk.mp4")} style={{ width: "100%", height: "100%" }} />
        </AbsoluteFill>
        {t < 3.4 && <HookWord3D t={t} fps={fps} end={2.75} />}
        {frame < CUT_FRAMES && (
          <AbsoluteFill style={{ filter: GRADE }}>
            <Img src={staticFile(`media/alkcut/f_${String(frame + 1).padStart(3, "0")}.png`)} style={{ width: "100%", height: "100%" }} />
          </AbsoluteFill>
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(18,12,8,0.35), transparent 34%, transparent 55%, rgba(18,12,8,0.5))", opacity: 1 - k }} />
      <Vignette strength={0.3} />

      {t < 3.2 && (
        <div style={{ position: "absolute", top: 150, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: springAt(t, 0.4, fps) * (1 - ramp(t, 2.6, 3.0)) }}>
          <Ar size={52} weight={900}>كيفاش تبعدي ولدك على التيليفون؟</Ar>
        </div>
      )}

      {overlayOn && (
        <AbsoluteFill style={{ opacity: 1 - k }}>
          <Overlay3D t={t} fps={fps} />
          {overlayLabels.map((l) => t >= l.start - 0.1 && t < l.end + 0.1 && <Label key={l.text} t={t} fps={fps} at={l.start} end={l.end} x={l.x} y={l.y} text={l.text} />)}
        </AbsoluteFill>
      )}

      {k < 0.5 && <Captions t={t} fps={fps} />}
      <Outro t={t} fps={fps} />

      {studio.map((s) => {
        const v = vis(t, s.start, s.end);
        if (v <= 0) return null;
        return (
          <AbsoluteFill key={s.id} style={{ opacity: v, filter: v < 1 ? `blur(${(1 - v) * 22}px)` : undefined, transform: `scale(${1.06 - 0.06 * v})` }}>
            {s.id === "alt" && (
              <>
                <AltScene t={t} fps={fps} start={s.start} />
                <Label t={t} fps={fps} at={s.start + 2.6} end={s.end} x={0} y={-5.4} text="شي كتاب ولا شي لعبة" dark />
              </>
            )}
            {s.id === "flip" && (
              <>
                <FlipScene t={t} fps={fps} start={s.start} />
                <div style={{ position: "absolute", top: 230, left: 0, right: 0, height: 120 }}>
                  <div style={{ position: "absolute", inset: 0, opacity: 1 - ramp(t, s.start + 1.0, s.start + 1.4) }}><Label t={t} fps={fps} at={s.start + 0.2} end={s.end} x={0} y={8.2} text="قبل ما تحيدي ليه التيليفون" dark /></div>
                  <Label t={t} fps={fps} at={s.start + 1.7} end={s.end} x={0} y={8.2} text="حطي البديل قدامو" dark />
                </div>
              </>
            )}
            {s.id === "clock" && <ClockScene t={t} fps={fps} start={s.start} />}
            {s.id === "room" && (
              <>
                <RoomScene t={t} fps={fps} start={s.start} />
                <Label t={t} fps={fps} at={s.start + 2.4} end={s.end} x={0} y={-6.2} text="مريح ومغري للطفل" dark />
              </>
            )}
            {s.id === "scale" && (
              <>
                <ScaleScene t={t} fps={fps} start={s.start} />
                <div style={{ position: "absolute", top: 200, left: 0, right: 0, textAlign: "center", opacity: ramp(t, s.start + 0.3, s.start + 0.9) }}>
                  <Ar size={70} weight={900} color={C.ink} style={{ textShadow: "none" }}>شنو كيعطي لولدك؟</Ar>
                </div>
                <Label t={t} fps={fps} at={s.start + 0.8} end={s.end} x={-3.25} y={-3.6} text="الشاشة" sub="متعة سريعة" dark />
                <Label t={t} fps={fps} at={s.start + 3.0} end={s.end} x={3.25} y={-3.6} text="الكتاب" sub="دماغ متزن" dark />
              </>
            )}
          </AbsoluteFill>
        );
      })}

      <LightLeak t={t} fps={fps} at={[...steps, 17.4]} />
      <Grain t={t} />
    </AbsoluteFill>
  );
};
