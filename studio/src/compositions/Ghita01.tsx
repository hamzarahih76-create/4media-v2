import "@fontsource/cairo/700.css";
import "@fontsource/inter/300.css";
import "@fontsource/inter/500.css";
import "@fontsource/oswald/700.css";
import { ThreeCanvas } from "@remotion/three";
import { ContactShadows } from "@react-three/drei";
import { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { inout, ramp, springAt } from "../components/warm/Warm";
import { bigNumber, captions, cards, finalPill, flashes, floatBrush, full, G, handPills, handPillsEnd, hookTitle, questionPill, stack, windowCard } from "../data/ghita01";
import { Studio, Tooth, Toothbrush } from "../three/objects";
import { Text3D, useFonts3D } from "../three/Text3D";

// Ghita (dentist) edited beat-for-beat like the El Khanssaa toys reel (media/refs/insp05.mp4):
// portrait-mode background blur (rembg masks), tilted glass window behind the speaker, huge glowing title
// + 3D icon on the chest, white flashes into full-screen 3D shots with giant arabizi words and swipe
// transitions, glowing floating 3D object, giant 3D number with a blue label, tilted glass pills, photo
// cards, stacked dark pills, word-by-word Arabic captions. Recipe: recipes/ghita01-copy-insp03.md

const SRC = "media/ghita.mp4";
const MASKS = 1274; // public/media/ghitamask/f_0001..f_1274.png (30fps)
const AR = "Cairo";
const FONTS3D = ["fonts/oswald-700.woff"];

const useFonts = () => {
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all(['700 60px "Cairo"', '700 60px "Oswald"', '300 60px "Inter"', '500 60px "Inter"'].map((f) => document.fonts.load(f, "أبت abc"))).finally(() => continueRender(h));
  }, [h]);
};

const env = (t: number, a: number, b: number, i = 0.3, o = 0.25) => Math.min(ramp(t, a, a + i), 1 - ramp(t, b - o, b, inout));

// ---------- caption: word by word, white with soft shadow ----------
const Caption: React.FC<{ t: number }> = ({ t }) => {
  const c = captions.find((x) => t >= x.start && t < x.end + 0.15);
  if (!c) return null;
  const words = c.text.split(" ");
  const span = (c.end - c.start) * 0.7;
  const out = ramp(t, c.end, c.end + 0.15);
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top: 1190, display: "flex", flexWrap: "wrap", justifyContent: "center", direction: "rtl", columnGap: 16, opacity: 1 - out }}>
      {words.map((w, i) => {
        const k = ramp(t, c.start + (span * i) / words.length, c.start + (span * i) / words.length + 0.25);
        return (
          <span key={i} style={{ fontFamily: AR, fontWeight: 700, fontSize: 60, color: "white", lineHeight: 1.35, opacity: k, filter: `blur(${(1 - k) * 6}px)`, textShadow: "0 3px 14px rgba(0,0,0,0.7), 0 0 2px rgba(0,0,0,0.5)", direction: /[a-zA-Z]/.test(w) ? "ltr" : "rtl" }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

// ---------- tilted glass pill ----------
const Pill: React.FC<{ t: number; fps: number; at: number; end: number; children: React.ReactNode; bg?: string; size?: number; style?: React.CSSProperties }> = ({ t, fps, at, end, children, bg = G.teal, size = 44, style }) => {
  const s = springAt(t, at, fps, 14, 140);
  if (s <= 0 || t > end) return null;
  const out = ramp(t, end - 0.2, end);
  return (
    <div style={{ perspective: 900, ...style }}>
      <div style={{ display: "inline-block", padding: "12px 40px 16px", borderRadius: 999, background: bg, border: "1.5px solid rgba(255,255,255,0.35)", backdropFilter: "blur(12px)", boxShadow: "0 12px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)", fontFamily: AR, fontWeight: 700, fontSize: size, color: "white", direction: "rtl", textAlign: "center", lineHeight: 1.3, opacity: Math.min(1, s * 1.5) * (1 - out), transform: `translate(${(1 - s) * -60}px, ${(1 - s) * 80}px) rotateZ(${(1 - s) * -24}deg) rotateY(${(1 - s) * 50}deg) rotateX(${(1 - s) * 30}deg)`, filter: `blur(${(1 - s) * 6}px)` }}>
        {children}
      </div>
    </div>
  );
};

export const Ghita01: React.FC = () => {
  useFonts();
  const ready = useFonts3D(FONTS3D);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (!ready) return null;
  const mi = Math.min(MASKS, Math.floor(t * 30) + 1);
  const mask = staticFile(`media/ghitamask/f_${String(mi).padStart(4, "0")}.png`);
  const src = staticFile(SRC);

  // camera: hook punch-ins (like the reference laugh zooms) + slow push
  let scale = 1.04 + 0.02 * Math.sin(t * 0.3);
  scale *= 1 + 0.08 * Math.min(ramp(t, 0, 0.4), 1 - ramp(t, 1.0, 1.4)) + 0.05 * ramp(t, 13.0, 15, inout) - 0.05 * ramp(t, 15, 15.3);
  const plate = { transform: `scale(${scale})`, transformOrigin: "50% 38%" };

  const win = env(t, windowCard.start, windowCard.end, 0.5, 0.35);
  const winS = springAt(t, windowCard.start, fps, 16, 110);
  const fl = Math.max(0, ...flashes.map((f) => Math.sin(Math.PI * Math.min(1, Math.max(0, (t - f + 0.25) / 0.55)))));
  const fs = full.find((x) => t >= x.start - 0.05 && t < x.end + 0.05);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* ---------- speaker plate with portrait-mode background blur ---------- */}
      <AbsoluteFill style={plate}>
        <AbsoluteFill style={{ filter: "blur(16px) brightness(0.9) contrast(1.04) saturate(0.95)", transform: "scale(1.05)" }}>
          <OffthreadVideo src={src} style={{ width: "100%", height: "100%" }} />
        </AbsoluteFill>
        {win > 0 && (
          <div style={{ position: "absolute", left: 40, top: 230, width: 560, height: 560, perspective: 1200, opacity: win }}>
            <div style={{ width: "100%", height: "100%", borderRadius: 54, overflow: "hidden", border: "6px solid rgba(255,255,255,0.85)", boxShadow: "0 0 40px rgba(255,255,255,0.45), 0 30px 60px rgba(0,0,0,0.4)", transform: `rotateY(${28 - (1 - winS) * 40}deg) rotateZ(-5deg) scale(${0.7 + 0.3 * winS})`, transformOrigin: "0% 50%" }}>
              <Img src={staticFile("media/ghita/window.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(115deg, transparent ${20 + ramp(t, windowCard.start + 0.2, windowCard.start + 1.4) * 80}%, rgba(255,255,255,0.35) ${25 + ramp(t, windowCard.start + 0.2, windowCard.start + 1.4) * 80}%, transparent ${32 + ramp(t, windowCard.start + 0.2, windowCard.start + 1.4) * 80}%)` }} />
            </div>
          </div>
        )}
        <AbsoluteFill style={{ WebkitMaskImage: `url(${mask})`, maskImage: `url(${mask})`, WebkitMaskSize: "100% 100%", maskSize: "100% 100%", filter: "contrast(1.05) saturate(0.97)" }}>
          <OffthreadVideo src={src} muted style={{ width: "100%", height: "100%" }} />
        </AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.12), transparent 30%, transparent 55%, rgba(0,0,0,0.55))" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 70% at 50% 42%, transparent 55%, rgba(0,0,0,0.45))" }} />

      {/* ---------- hook: giant glowing title + 3D icon on the chest ---------- */}
      {t >= hookTitle.start && t < hookTitle.end + 0.3 && (() => {
        const k = springAt(t, hookTitle.start, fps, 15, 120);
        const out = ramp(t, hookTitle.end, hookTitle.end + 0.3);
        const ic = springAt(t, hookTitle.start + 0.35, fps, 10, 170);
        return (
          <div style={{ position: "absolute", left: 0, right: 0, top: 1060, display: "flex", flexDirection: "column", alignItems: "center", opacity: (1 - out) * Math.min(1, k * 1.4), filter: `blur(${out * 12}px)` }}>
            <div style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 52, color: "white", marginBottom: -10, textShadow: "0 0 18px rgba(255,255,255,0.6)", transform: `translateY(${(1 - k) * 30}px)` }}>{hookTitle.small}</div>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <div style={{ fontFamily: "Oswald", fontWeight: 700, fontSize: 250, lineHeight: 1, color: "white", letterSpacing: 4, textShadow: "0 0 30px rgba(255,255,255,0.75), 0 0 80px rgba(150,200,255,0.55)", transform: `scale(${0.7 + 0.3 * k})` }}>{hookTitle.big}</div>
              <Img src={staticFile("media/ghita/icon.png")} style={{ position: "absolute", right: -190, top: 30, width: 200, height: 200, transform: `scale(${ic}) rotate(${(1 - ic) * -40 + Math.sin(t * 3) * 6}deg)`, filter: "drop-shadow(0 0 22px rgba(255,255,255,0.9)) drop-shadow(0 10px 20px rgba(0,0,0,0.4))" }} />
            </div>
            <div style={{ fontFamily: "Inter", fontWeight: 300, fontSize: 54, color: "rgba(255,255,255,0.85)", letterSpacing: 22, marginTop: -6 }}>{hookTitle.spaced}</div>
          </div>
        );
      })()}

      <Caption t={t} />

      {/* ---------- floating glowing 3D toothbrush near the hands ---------- */}
      {t >= floatBrush.start - 0.05 && t < floatBrush.end + 0.3 && (() => {
        const s = springAt(t, floatBrush.start, fps, 12, 140);
        const out = ramp(t, floatBrush.end, floatBrush.end + 0.3);
        return (
          <AbsoluteFill style={{ filter: "drop-shadow(0 0 14px rgba(255,255,255,0.95)) drop-shadow(0 0 30px rgba(170,215,255,0.6))", opacity: 1 - out }}>
            <ThreeCanvas width={1080} height={1920} camera={{ fov: 35, position: [0, 0, 26] }} flat gl={{ alpha: true, antialias: true }}>
              <Studio envIntensity={1.2} />
              <group position={[0.3, -3.6 + Math.sin(t * 2) * 0.15, 3]} rotation={[0.3, t * 0.6, Math.PI / 2 - 0.2]} scale={Math.max(0.001, s * 1.05)}>
                <Toothbrush water={0.5 + 0.3 * Math.sin(t * 6)} />
              </group>
            </ThreeCanvas>
          </AbsoluteFill>
        );
      })()}

      {/* ---------- giant 3D number with blue label (reference "SECRET 01") ---------- */}
      {t >= bigNumber.start - 0.05 && t < bigNumber.end + 0.25 && (() => {
        const s = springAt(t, bigNumber.start, fps, 14, 130);
        const out = ramp(t, bigNumber.end, bigNumber.end + 0.25);
        return (
          <AbsoluteFill style={{ opacity: 1 - out }}>
            <ThreeCanvas width={1080} height={1920} camera={{ fov: 35, position: [0, 0, 26] }} gl={{ alpha: true, antialias: true }}>
              <Studio envIntensity={1.4} />
              <group position={[0.7, -4.3, 2]} rotation={[0.08, (1 - s) * 1.6 + Math.sin(t * 1.2) * 0.12, 0]} scale={Math.max(0.001, s)}>
                <Text3D text={bigNumber.n} font="fonts/oswald-700.woff" size={4.6} depth={0.9} bevel={0.06} color="#AEB6BF" sideColor="#5E6670" />
              </group>
            </ThreeCanvas>
            <div style={{ position: "absolute", left: 250, top: 1290, width: 120, height: 330, background: "linear-gradient(180deg, #7FB0D6, #4F84B0)", borderRadius: 10, boxShadow: "0 12px 30px rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${s}) rotate(-3deg)` }}>
              <div style={{ fontFamily: "Oswald", fontWeight: 700, fontSize: 52, color: "white", transform: "rotate(-90deg)", whiteSpace: "nowrap", letterSpacing: 2 }}>{bigNumber.label}</div>
            </div>
          </AbsoluteFill>
        );
      })()}

      {/* ---------- glass pills near the hands, one after another ---------- */}
      {handPills.map((p, i) => (
        <Pill key={p.text} t={t} fps={fps} at={p.at} end={i < handPills.length - 1 ? handPills[i + 1].at : handPillsEnd} style={{ position: "absolute", left: 0, right: 0, top: 1400, textAlign: "center" }}>
          {p.text}
        </Pill>
      ))}

      {/* ---------- photo cards top-left ---------- */}
      {t >= cards.start && t < cards.end + 0.2 &&
        cards.images.map((im, i) => {
          const s = springAt(t, cards.start + i * 0.5, fps, 14, 140);
          const out = ramp(t, cards.end, cards.end + 0.2);
          return (
            <div key={im} style={{ position: "absolute", left: 120 + i * 260, top: 230 + i * 50, width: 330, height: 330, borderRadius: 40, overflow: "hidden", border: "6px solid rgba(255,255,255,0.9)", boxShadow: "0 0 26px rgba(255,255,255,0.4), 0 22px 44px rgba(0,0,0,0.45)", opacity: s * (1 - out), transform: `scale(${0.5 + 0.5 * s}) rotate(${(1 - s) * -20 + (i ? 4 : -4)}deg)` }}>
              <Img src={staticFile(im)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          );
        })}

      {/* ---------- stacked dark pills top ---------- */}
      {stack.items.map((p, i) => (
        <Pill key={p.text} t={t} fps={fps} at={p.at} end={stack.end} bg={G.dark} size={40} style={{ position: "absolute", left: 0, right: 0, top: 380 + i * 110, textAlign: "center" }}>
          {p.text}
        </Pill>
      ))}

      {/* ---------- blue two-line question pill ---------- */}
      <Pill t={t} fps={fps} at={questionPill.start} end={questionPill.end} bg="rgba(80,140,185,0.78)" size={46} style={{ position: "absolute", left: 0, right: 0, top: 1180, textAlign: "center" }}>
        {questionPill.lines.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </Pill>
      <Pill t={t} fps={fps} at={finalPill.start} end={finalPill.end + 0.1} size={56} style={{ position: "absolute", left: 0, right: 0, top: 1300, textAlign: "center" }}>
        “{finalPill.text}”
      </Pill>

      {/* ---------- full-screen 3D shots with giant words + swipe ---------- */}
      {fs && (() => {
        const B = fs.id === "B";
        const swipeIn = B ? ramp(t, fs.start - 0.05, fs.start + 0.45, inout) : 1;
        const swipeOut = ramp(t, fs.end - 0.4, fs.end + 0.05, inout);
        const x = (1 - swipeIn) * 1080 - swipeOut * 1080;
        const small = springAt(t, fs.start + 0.15, fps, 15, 130);
        const big = springAt(t, fs.start + 0.3, fps, 12, 150);
        return (
          <AbsoluteFill style={{ transform: `translateX(${x}px)`, filter: Math.abs(x) > 4 ? `blur(${Math.min(18, Math.abs(x) / 40)}px)` : undefined }}>
            <AbsoluteFill style={{ background: B ? "radial-gradient(circle at 50% 40%, #FBE9DA, #D9AE90)" : "linear-gradient(180deg, #7FAAC4, #5F8DA8)" }} />
            <ThreeCanvas width={1080} height={1920} camera={{ fov: 32, position: [0, 0, 24] }} shadows flat gl={{ alpha: true, antialias: true }}>
              <Studio envIntensity={1.2} />
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
            <div style={{ position: "absolute", left: 0, right: 0, top: 1300, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontFamily: "Inter", fontWeight: 300, fontSize: 64, color: "rgba(255,255,255,0.92)", opacity: small, transform: `translateY(${(1 - small) * 20}px)` }}>{fs.small}</div>
              <div style={{ fontFamily: "Oswald", fontWeight: 700, fontSize: 260, lineHeight: 0.95, color: "white", letterSpacing: 4, textShadow: "0 10px 40px rgba(0,0,0,0.25)", opacity: Math.min(1, big * 1.4), transform: `scale(${0.75 + 0.25 * big})` }}>{fs.big}</div>
            </div>
          </AbsoluteFill>
        );
      })()}

      {/* swipe shadow bars like the reference */}
      {full.map((f) => {
        const k = Math.max(0, 1 - Math.abs(t - f.end) / 0.35);
        if (k <= 0) return null;
        return <AbsoluteFill key={f.id} style={{ background: `linear-gradient(90deg, transparent ${50 - k * 40}%, rgba(10,20,28,${0.75 * k}) 50%, transparent ${50 + k * 40}%)`, filter: "blur(30px)" }} />;
      })}

      {fl > 0.01 && <AbsoluteFill style={{ background: "#F2FBFF", opacity: fl }} />}
    </AbsoluteFill>
  );
};
