import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/700.css";
import { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { NameTag, PillStack, r, SceneView } from "../components/keynote/Keynote";
import { nameTag, pillGroups, scenes } from "../data/alk02";

// El Khanssaa v2 - "Apple keynote VSL" (recipes/insp04-keynote.md): speaker shots alternate with
// full-screen clean 3D scenes on an off-white stage (voice keeps running), white pill tags with blue
// checks next to the speaker, blur-through transitions. 60fps.

const useFonts = () => {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all(['700 60px "IBM Plex Sans Arabic"', '600 60px "IBM Plex Sans Arabic"', '500 60px "IBM Plex Sans Arabic"', '700 60px "Inter"', '500 60px "Inter"'].map((f) => document.fonts.load(f, "أبت abc"))).finally(() => continueRender(h));
  }, [h]);
};

// merge back-to-back scenes into groups so the speaker does not flash between them
const groups = scenes.reduce<{ start: number; end: number }[]>((acc, s) => {
  const last = acc[acc.length - 1];
  if (last && Math.abs(last.end - s.start) < 0.05) last.end = s.end;
  else acc.push({ start: s.start, end: s.end });
  return acc;
}, []);

const vis = (t: number, a: number, b: number) => Math.min(r(t, a - 0.2, a + 0.35), 1 - r(t, b - 0.35, b + 0.2));

export const Alk02: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const k = Math.max(0, ...groups.map((g) => vis(t, g.start, g.end)));
  const drift = 1.04 + 0.02 * Math.sin(t * 0.3);
  const pg = pillGroups.find((g) => t >= g.start && t < g.end);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${drift * (1 + 0.14 * k)})`, transformOrigin: "50% 40%", filter: `blur(${k * 26}px) contrast(1.04) saturate(1.03)` }}>
        <OffthreadVideo src={staticFile("media/alk.mp4")} style={{ width: "100%", height: "100%" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.18), transparent 30%, transparent 70%, rgba(0,0,0,0.25))" }} />

      {pg && k < 0.5 && <PillStack t={t} fps={fps} pills={pg.pills} end={pg.end} />}
      {k < 0.5 && <NameTag t={t} fps={fps} {...nameTag} />}

      {scenes.map((s) => {
        const v = vis(t, s.start, s.end);
        if (v <= 0) return null;
        return (
          <AbsoluteFill key={s.id} style={{ opacity: v, filter: v < 1 ? `blur(${(1 - v) * 22}px)` : undefined, transform: `scale(${1.06 - 0.06 * v})` }}>
            <SceneView id={s.id} t={t} fps={fps} start={s.start} end={s.end} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
