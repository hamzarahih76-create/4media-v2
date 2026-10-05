import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "@fontsource/inter/300.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/800.css";
import "@fontsource/oswald/700.css";
import { ContactShadows } from "@react-three/drei";
import { ThreeCanvas } from "@remotion/three";
import { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { inout, ramp, springAt } from "../components/warm/Warm";
import { cards, captions, count, cuts, finalPill, flashes, floatBrush, full, handPills, handPillsEnd, hook, questionPill, stack, windowCard } from "../data/ghita02";
import { Studio, Tooth, Toothbrush } from "../three/objects";
import { FilmBurn } from "../components/FilmBurn";

// Ghita v4: v3.1 + real AI photos/clip from Higgsfield (window, full-screen SNAN clip + DKIYA photo, cards)
// Ghita v3 (user feedback on v2): film-burn transitions between cuts, more dynamic/visible animations
// (v3.1 after user feedback: camera motion removed - clean static framing; film burn only on 3 cuts, light). Synth SFX removed.
// Ghita v2: same structure as v1 (toys-reel copy) with the user's fixes - no background blur, silences cut
// with punch/zoom transitions on every jump cut, 2D Apple-keynote style write-on captions and titles.
// Output time -> source time via `cuts`; every graphic is keyed on SOURCE time.

const SRC = "media/ghita.mp4";
// true once the Higgsfield photos/clip are downloaded into public/media/ghita/hf_*; false = 3D renders
const HF = false;
const IMG = HF
  ? { window: "media/ghita/hf_window.png", lens: "media/ghita/hf_lens.png", plaque: "media/ghita/hf_plaque.png" }
  : { window: "media/ghita/window.png", lens: "media/ghita/lens.png", plaque: "media/ghita/plaque.png" };
const MASKS = 1274; // public/media/ghitamask/f_0001..f_1274.png = source seconds * 30
const AR = "IBM Plex Sans Arabic";
const ease = Easing.bezier(0.22, 1, 0.36, 1);

// ---------- edit decision list ----------
const segs = (() => {
  let o = 0;
  return cuts.map(([a, b], i) => {
    const s = { i, src: a, len: b - a, out: o };
    o += b - a;
    return s;
  });
})();
export const GHITA04_DURATION = segs[segs.length - 1].out + segs[segs.length - 1].len;
const outToSrc = (t: number) => {
  const s = segs.find((x) => t < x.out + x.len) ?? segs[segs.length - 1];
  return { src: s.src + (t - s.out), seg: s, local: t - s.out };
};

const useFonts = () => {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all(['700 60px "IBM Plex Sans Arabic"', '600 60px "IBM Plex Sans Arabic"', '700 60px "Oswald"', '300 60px "Inter"', '500 60px "Inter"', '800 60px "Inter"'].map((f) => document.fonts.load(f, "أبت abc"))).finally(() => continueRender(h));
  }, [h]);
};

// ---------- Apple-style write-on caption: each word wipes in right-to-left with blur + rise ----------
const Caption: React.FC<{ t: number; fps: number }> = ({ t, fps }) => {
  const c = captions.find((x) => t >= x.start && t < x.end + 0.2);
  if (!c) return null;
  const words = c.text.split(" ");
  const span = (c.end - c.start) * 0.75;
  const out = ramp(t, c.end, c.end + 0.2);
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top: 1180, display: "flex", flexWrap: "wrap", justifyContent: "center", direction: "rtl", columnGap: 18, opacity: 1 - out, filter: `blur(${out * 8}px)`, transform: `translateY(${out * -20}px)` }}>
      {words.map((w, i) => {
        const a = c.start + (span * i) / words.length;
        const k = ramp(t, a, a + 0.35, ease);
        const hl = c.hl?.some((h) => w.includes(h));
        const pop = springAt(t, a, fps, hl ? 9 : 13, hl ? 220 : 180);
        const latin = /[a-zA-Z]/.test(w);
        return (
          <span key={i} style={{ display: "inline-block", fontFamily: latin ? "Inter" : AR, fontWeight: latin ? 800 : 700, lineHeight: 1.4, direction: latin ? "ltr" : "rtl", clipPath: latin ? `inset(0 ${(1 - k) * 100}% 0 0)` : `inset(0 0 0 ${(1 - k) * 100}%)`, filter: `blur(${(1 - k) * 10}px)`, transform: `translateY(${(1 - pop) * 50}px) scale(${(hl ? 0.4 : 0.6) + (hl ? 0.6 : 0.4) * pop})`, color: "white", fontSize: hl ? 76 : 64, backgroundImage: hl ? "linear-gradient(180deg, #FFFFFF 10%, #9FD2FF 100%)" : undefined, WebkitBackgroundClip: hl ? "text" : undefined, WebkitTextFillColor: hl ? "transparent" : undefined, textShadow: hl ? undefined : "0 4px 18px rgba(0,0,0,0.45)" }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

// ---------- glass pill (tilt-in) ----------
const Pill: React.FC<{ t: number; fps: number; at: number; end: number; children: React.ReactNode; bg?: string; size?: number; style?: React.CSSProperties }> = ({ t, fps, at, end, children, bg = "rgba(64,92,108,0.62)", size = 44, style }) => {
  const s = springAt(t, at, fps, 9, 190);
  if (s <= 0 || t > end) return null;
  const out = ramp(t, end - 0.2, end);
  return (
    <div style={{ perspective: 900, ...style }}>
      <div style={{ display: "inline-block", padding: "12px 40px 16px", borderRadius: 999, background: bg, border: "1.5px solid rgba(255,255,255,0.35)", backdropFilter: "blur(14px)", boxShadow: "0 12px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25)", fontFamily: AR, fontWeight: 700, fontSize: size, color: "white", direction: "rtl", textAlign: "center", lineHeight: 1.35, opacity: Math.min(1, s * 1.5) * (1 - out), transform: `translate(${(1 - s) * -60}px, ${(1 - s) * 80}px) rotateZ(${(1 - s) * -24}deg) rotateY(${(1 - s) * 50}deg) rotateX(${(1 - s) * 30}deg)`, filter: `blur(${(1 - s) * 6}px)` }}>
        {children}
      </div>
    </div>
  );
};

export const Ghita04: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tOut = frame / fps;
  const { src: t, seg, local } = outToSrc(tOut);

  // camera: alternate framing per segment (jump cuts read as 2 cameras) + punch transition on each cut
  const level = [1.04, 1.13][seg.i % 2];
  // v3.1 (user): clean picture - no shake/roll/punch, only a static alternating framing per jump cut
  const scale = level;
  const shx = 0, shy = 0, roll = 0, blur = 0;
  // film burn on 3 topic changes only, light (strength 0.45)
  const burnCuts = [2, 7, 9].map((i) => segs[i].out);
  const burn = burnCuts.map((c, i) => ({ p: (tOut - c + 0.3) / 0.6, i })).find((b) => b.p > 0 && b.p < 1);

  const win = Math.min(ramp(t, windowCard.start, windowCard.start + 0.5), 1 - ramp(t, windowCard.end - 0.3, windowCard.end, inout));
  const winS = springAt(t, windowCard.start, fps, 16, 110);
  const fl = Math.max(0, ...flashes.map((f) => Math.sin(Math.PI * Math.min(1, Math.max(0, (t - f + 0.25) / 0.55)))));
  const fs = full.find((x) => t >= x.start - 0.05 && t < x.end + 0.05);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* ---------- speaker: jump-cut timeline ---------- */}
      <AbsoluteFill style={{ transform: `translate(${shx}px, ${shy}px) scale(${scale}) rotate(${roll}deg)`, transformOrigin: "50% 40%", filter: blur > 0.2 ? `blur(${blur}px)` : undefined }}>
        {segs.map((s) => (
          <Sequence key={s.i} from={Math.round(s.out * fps)} durationInFrames={Math.round(s.len * fps)} layout="none">
            <OffthreadVideo
              src={staticFile(SRC)}
              startFrom={Math.round(s.src * fps)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: "contrast(1.05) saturate(1.02)" }}
              volume={(f) => interpolate(f, [0, 2, s.len * fps - 3, s.len * fps - 1], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
            />
          </Sequence>
        ))}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.12), transparent 30%, transparent 58%, rgba(0,0,0,0.45))" }} />

      {/* ---------- big tilted glass window BEHIND the speaker (reference 3.5-5.8s), she is masked on top ---------- */}
      {win > 0 && (() => {
        const sweep = ramp(t, windowCard.start + 0.3, windowCard.start + 1.5);
        const mask = staticFile(`media/ghitamask/f_${String(Math.min(MASKS, Math.floor(t * 30) + 1)).padStart(4, "0")}.png`);
        return (
          <>
            <div style={{ position: "absolute", left: 40, top: 150, width: 600, height: 1040, perspective: 1600, opacity: win }}>
              <div style={{ width: "100%", height: "100%", borderRadius: 56, overflow: "hidden", border: "4px solid rgba(255,255,255,0.92)", boxShadow: "0 0 40px rgba(200,230,255,0.55), 0 30px 70px rgba(0,0,0,0.45)", transform: `rotateY(${18 - (1 - winS) * 50}deg) rotateZ(${-2 * winS}deg) translateX(${(1 - winS) * -200}px) scale(${0.85 + 0.15 * winS})`, transformOrigin: "0% 50%" }}>
                <Img src={staticFile(IMG.window)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.12 - 0.08 * ramp(t, windowCard.start, windowCard.end, Easing.linear)})` }} />
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(115deg, transparent ${sweep * 100 - 10}%, rgba(255,255,255,0.35) ${sweep * 100}%, transparent ${sweep * 100 + 8}%)` }} />
              </div>
            </div>
            <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: "50% 40%", WebkitMaskImage: `url(${mask})`, maskImage: `url(${mask})`, WebkitMaskSize: "100% 100%", maskSize: "100% 100%", opacity: win }}>
              {segs.filter((x) => x.src < windowCard.end + 0.5).map((x) => (
                <Sequence key={x.i} from={Math.round(x.out * fps)} durationInFrames={Math.round(x.len * fps)} layout="none">
                  <OffthreadVideo src={staticFile(SRC)} muted startFrom={Math.round(x.src * fps)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: "contrast(1.05) saturate(1.02)" }} />
                </Sequence>
              ))}
            </AbsoluteFill>
          </>
        );
      })()}

      {/* ---------- hook title (Apple style: tracking tightens, blur to sharp, gradient) ---------- */}
      {t >= hook.start && t < hook.end + 0.3 && (() => {
        const k = ramp(t, hook.start, hook.start + 0.9, ease);
        const out = ramp(t, hook.end, hook.end + 0.3);
        const ic = springAt(t, hook.start + 0.45, fps, 12, 160);
        return (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1080, display: "flex", flexDirection: "column", alignItems: "center", opacity: (1 - out) * k, filter: `blur(${(1 - k) * 14 + out * 12}px)` }}>
            <div style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 50, color: "rgba(255,255,255,0.9)", marginBottom: -6 }}>{hook.small}</div>
            <div style={{ position: "relative" }}>
              <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 230, lineHeight: 1, letterSpacing: 40 * (1 - k) - 6, backgroundImage: "linear-gradient(180deg, #FFFFFF 20%, #A9D4FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.35))" }}>{hook.big}</div>
              <Img src={staticFile("media/ghita/icon.png")} style={{ position: "absolute", right: -175, top: 25, width: 180, height: 180, transform: `scale(${ic}) rotate(${(1 - ic) * -40 + Math.sin(t * 3) * 5}deg)`, filter: "drop-shadow(0 0 18px rgba(255,255,255,0.8))" }} />
            </div>
            <div style={{ fontFamily: "Inter", fontWeight: 300, fontSize: 52, color: "rgba(255,255,255,0.85)", letterSpacing: 10 + 20 * k }}>{hook.spaced}</div>
          </div>
        );
      })()}

      <Caption t={t} fps={fps} />

      {/* ---------- floating 3D toothbrush ---------- */}
      {t >= floatBrush.start - 0.05 && t < floatBrush.end + 0.3 && (() => {
        const s = springAt(t, floatBrush.start, fps, 12, 140);
        const out = ramp(t, floatBrush.end, floatBrush.end + 0.3);
        return (
          <AbsoluteFill style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.7)) drop-shadow(0 0 22px rgba(120,190,255,0.55)) drop-shadow(0 14px 20px rgba(0,0,0,0.35))", opacity: 1 - out }}>
            <ThreeCanvas width={1080} height={1920} camera={{ fov: 35, position: [0, 0, 26] }} gl={{ alpha: true, antialias: true }}>
              <Studio envIntensity={0.55} />
              <group position={[0.3, -4.1 + Math.sin(t * 2) * 0.15, 3]} rotation={[0.3, t * 0.6, Math.PI / 2 - 0.2]} scale={Math.max(0.001, s * 1.05)}>
                <Toothbrush water={0.5 + 0.3 * Math.sin(t * 6)} />
              </group>
            </ThreeCanvas>
          </AbsoluteFill>
        );
      })()}

      {/* ---------- 2D Apple count-up "28" ---------- */}
      {t >= count.start && t < count.end + 0.3 && (() => {
        const k = ramp(t, count.start, count.start + 0.9, ease);
        const out = ramp(t, count.end, count.end + 0.3);
        const n = Math.round(interpolate(t, [count.start, count.start + 0.8], [0, count.n], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }));
        return (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1060, display: "flex", flexDirection: "column", alignItems: "center", opacity: k * (1 - out), filter: `blur(${(1 - k) * 12 + out * 10}px)` }}>
            <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 300, lineHeight: 1, fontVariantNumeric: "tabular-nums", backgroundImage: "linear-gradient(180deg, #FFFFFF 15%, #8FC8FF 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 12px 34px rgba(0,0,0,0.4))", transform: `scale(${0.85 + 0.15 * k})` }}>{n}</div>
            <div style={{ fontFamily: AR, fontWeight: 600, fontSize: 56, color: "white", direction: "rtl", marginTop: -10, textShadow: "0 4px 16px rgba(0,0,0,0.45)" }}>{count.label}</div>
          </div>
        );
      })()}

      {handPills.map((p, i) => (
        <Pill key={p.text} t={t} fps={fps} at={p.at} end={i < handPills.length - 1 ? handPills[i + 1].at : handPillsEnd} style={{ position: "absolute", left: 0, right: 0, top: 1400, textAlign: "center" }}>
          {p.text}
        </Pill>
      ))}

      {t >= cards.start && t < cards.end + 0.2 &&
        [IMG.lens, IMG.plaque].map((im, i) => {
          const s = springAt(t, cards.start + i * 0.5, fps, 14, 140);
          const out = ramp(t, cards.end, cards.end + 0.2);
          return (
            <div key={im} style={{ position: "absolute", left: 120 + i * 260, top: 220 + i * 50, width: 330, height: 330, borderRadius: 40, overflow: "hidden", border: "6px solid rgba(255,255,255,0.9)", boxShadow: "0 0 26px rgba(255,255,255,0.35), 0 22px 44px rgba(0,0,0,0.4)", opacity: s * (1 - out), transform: `scale(${0.5 + 0.5 * s}) rotate(${(1 - s) * -20 + (i ? 4 : -4)}deg)` }}>
              <Img src={staticFile(im)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          );
        })}

      {stack.items.map((p, i) => (
        <Pill key={p.text} t={t} fps={fps} at={p.at} end={stack.end} bg="rgba(24,28,32,0.78)" size={42} style={{ position: "absolute", left: 0, right: 0, top: 360 + i * 115, textAlign: "center" }}>
          {p.text}
        </Pill>
      ))}

      <Pill t={t} fps={fps} at={questionPill.start} end={questionPill.end} bg="rgba(80,140,185,0.78)" size={48} style={{ position: "absolute", left: 0, right: 0, top: 1180, textAlign: "center" }}>
        {questionPill.lines.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </Pill>
      <Pill t={t} fps={fps} at={finalPill.start} end={GHITA04_DURATION + 50} size={58} style={{ position: "absolute", left: 0, right: 0, top: 1320, textAlign: "center" }}>
        “{finalPill.text}”
      </Pill>

      {/* ---------- full-screen 3D shots + swipe ---------- */}
      {fs && (() => {
        const B = fs.id === "B";
        const swipeIn = B ? ramp(t, fs.start - 0.05, fs.start + 0.45, inout) : 1;
        const swipeOut = ramp(t, fs.end - 0.4, fs.end + 0.05, inout);
        const x = (1 - swipeIn) * 1080 - swipeOut * 1080;
        const small = ramp(t, fs.start + 0.15, fs.start + 0.8, ease);
        const big = ramp(t, fs.start + 0.3, fs.start + 1.1, ease);
        return (
          <AbsoluteFill style={{ transform: `translateX(${x}px)`, filter: Math.abs(x) > 4 ? `blur(${Math.min(18, Math.abs(x) / 40)}px)` : undefined }}>
            <AbsoluteFill style={{ background: B ? "radial-gradient(circle at 50% 40%, #FBE9DA, #D9AE90)" : "linear-gradient(180deg, #7FAAC4, #5F8DA8)" }} />
            {!HF && (
            <ThreeCanvas width={1080} height={1920} camera={{ fov: 32, position: [0, 0, 24] }} shadows gl={{ alpha: true, antialias: true }}>
              <Studio envIntensity={0.55} />
              {!B && (
                <group position={[0, 1.2, 0]} rotation={[0.1, Math.PI + 0.5 + (t - fs.start) * 0.35, 0.05]} scale={2.05}>
                  <Toothbrush lensGlow={1.5} />
                </group>
              )}
              {B && (
                <>
                  <Tooth position={[0.9, 1.4, 0]} rotation={[0.3, -0.5 + (t - fs.start) * 0.25, 0]} scale={1.7} plaque={1 - ramp(t, fs.start + 1.0, fs.start + 2.0)} scan={interpolate(t, [fs.start, fs.end], [1.6, -1.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
                  <group position={[-2.7, 1.8, 1]} rotation={[0.2, 2.6, 0.5]} scale={1.2}>
                    <Toothbrush water={ramp(t, fs.start + 0.8, fs.start + 1.2)} lensGlow={1.5} />
                  </group>
                </>
              )}
              <ContactShadows position={[0, -5.6, 0]} opacity={0.35} scale={14} blur={2.6} far={7} />
            </ThreeCanvas>
            )}
            {HF && (() => {
              const k = (t - fs.start) / (fs.end - fs.start);
              const st: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.08 - 0.06 * k})` };
              return B ? (
                <Img src={staticFile("media/ghita/hf_dkiya.png")} style={st} />
              ) : (
                <OffthreadVideo src={staticFile("media/ghita/hf_snan.mp4")} muted startFrom={0} style={st} />
              );
            })()}
            <AbsoluteFill style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.45))" }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: 1300, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontFamily: "Inter", fontWeight: 300, fontSize: 64, color: "rgba(255,255,255,0.95)", opacity: small, filter: `blur(${(1 - small) * 8}px)` }}>{fs.small}</div>
              <div style={{ fontFamily: "Inter", fontWeight: 800, fontSize: 240, lineHeight: 0.95, letterSpacing: 40 * (1 - big) - 4, color: "white", textShadow: "0 10px 40px rgba(0,0,0,0.2)", opacity: big, filter: `blur(${(1 - big) * 12}px)` }}>{fs.big}</div>
            </div>
          </AbsoluteFill>
        );
      })()}
      {full.map((f) => {
        const k = Math.max(0, 1 - Math.abs(t - f.end) / 0.35);
        if (k <= 0) return null;
        return <AbsoluteFill key={f.id} style={{ background: `linear-gradient(90deg, transparent ${50 - k * 40}%, rgba(10,20,28,${0.7 * k}) 50%, transparent ${50 + k * 40}%)`, filter: "blur(30px)" }} />;
      })}
      {fl > 0.01 && <AbsoluteFill style={{ background: "#F2FBFF", opacity: fl }} />}
      {burn && <FilmBurn p={burn.p} seed={burn.i} frame={frame} strength={0.45} />}
    </AbsoluteFill>
  );
};
