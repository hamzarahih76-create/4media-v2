import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/explainer/Background";
import { Captions } from "../components/explainer/Captions";
import { SceneContent } from "../components/explainer/Scenes";
import { fade, lerpRect, pop, type Rect } from "../components/explainer/anim";
import { modes, phrases, scenes, theme, type Mode } from "../data/insp01";

// media-01 re-edited in the style of the inspiration (media/refs/insp01.mp4):
// cream canvas + blue edge glow, speaker in a rounded window that jumps between a small
// "card" layout (info card above, built live with the speech) and a big "full" layout,
// 1-2 word captions with the spoken word in a blue box. Recipe: recipes/insp01-explainer.md

// Speaker window placement per mode (output px) and which part of the source it shows
// (source px, 1080x1920 basis). Crops stay between the burned-in title (y 455-555) and captions (>1130).
const WINDOW: Record<Mode, Rect> = {
  card: { x: 159, y: 830, w: 762, h: 571 },
  full: { x: 0, y: 470, w: 1080, h: 810 },
  end: { x: 250, y: 300, w: 580, h: 1031 },
  cta: { x: 250, y: 300, w: 580, h: 1031 },
};
const CROP: Record<Mode, Rect> = {
  card: { x: 160, y: 558, w: 760, h: 570 },
  full: { x: 180, y: 558, w: 720, h: 540 },
  end: { x: 0, y: 0, w: 1080, h: 1920 },
  cta: { x: 0, y: 0, w: 1080, h: 1920 },
};
const CARD: Rect = { x: 93, y: 300, w: 894, h: 465 };
const CTA_CARD: Rect = { x: 93, y: 620, w: 894, h: 680 };

const useFonts = () => {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all([document.fonts.load('700 60px "Poppins"'), document.fonts.load('600 60px "Poppins"')]).finally(() => continueRender(h));
  }, [h]);
};

export const Insp01: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // speaker window: spring from previous mode to current one
  const mi = modes.findLastIndex((m) => t >= m.start);
  const cur = modes[mi];
  const prev = modes[Math.max(0, mi - 1)];
  const k = mi === 0 ? 1 : pop(t, cur.start, fps, 170, 20);
  const win = lerpRect(WINDOW[prev.mode], WINDOW[cur.mode], k);
  const crop = lerpRect(CROP[prev.mode], CROP[cur.mode], k);
  const s = win.w / crop.w;
  const winOpacity = cur.mode === "cta" ? 1 - fade(t, cur.start, cur.start + 0.25) : 1;

  // info card
  const sc = scenes.find((x) => t >= x.start && t < x.end);
  let gs = sc?.start ?? 0;
  if (sc) {
    // walk back through back-to-back scenes so the card only pops once
    let s0 = sc;
    for (;;) {
      const before = scenes.find((x) => Math.abs(x.end - s0.start) < 0.01);
      if (!before) break;
      s0 = before;
    }
    gs = s0.start;
  }
  const cardRect = sc?.id === "cta" ? CTA_CARD : CARD;
  const cardIn = sc ? pop(t, gs, fps, 190, 17) : 0;
  const nextStarts = sc ? scenes.some((x) => Math.abs(x.start - sc.end) < 0.01) : false;
  const cardOut = sc && !nextStarts ? 1 - fade(t, sc.end - 0.18, sc.end) : 1;
  const content = sc ? Math.min(fade(t, sc.start, sc.start + 0.15), 1 - fade(t, sc.end - 0.12, sc.end)) : 0;

  return (
    <AbsoluteFill>
      <Background t={t} />

      <div
        style={{
          position: "absolute",
          left: win.x,
          top: win.y,
          width: win.w,
          height: win.h,
          borderRadius: 22 * (1 - Math.max(0, (win.w - 900) / 180)) + 2,
          overflow: "hidden",
          opacity: winOpacity,
          boxShadow: "0 10px 0 #D9D5CE, 0 30px 60px rgba(20,33,61,0.18)",
          background: "#000",
        }}
      >
        <div style={{ position: "absolute", left: -crop.x * s, top: -crop.y * s, width: 1080 * s, height: 1920 * s }}>
          <OffthreadVideo src={staticFile("media/src1440.mp4")} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>

      {sc && (
        <div
          style={{
            position: "absolute",
            left: cardRect.x,
            top: cardRect.y,
            width: cardRect.w,
            height: cardRect.h,
            borderRadius: 26,
            background: "white",
            boxShadow: `0 8px 0 ${theme.line}, 0 26px 50px rgba(20,33,61,0.10)`,
            opacity: Math.min(cardIn * 1.3, 1) * cardOut,
            transform: `translateY(${(1 - cardIn) * -40}px) scale(${0.9 + 0.1 * cardIn})`,
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", inset: 0, opacity: content }}>
            <SceneContent id={sc.id} t={t} fps={fps} />
          </div>
        </div>
      )}

      {(cur.mode === "card" || cur.mode === "full") && <Captions t={t} fps={fps} phrases={phrases} anchor={win} />}
    </AbsoluteFill>
  );
};
