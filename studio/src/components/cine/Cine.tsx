import { AbsoluteFill, Img, interpolate, staticFile } from "remotion";
import { red } from "../../data/insp02";
import { fade, pop } from "../explainer/anim";

type P = { t: number; fps: number };
const inter = "Inter";

// ---------- neon intro title (rendered *behind* the speaker cutout) ----------
export const NeonTitle: React.FC<P & { lines: string[]; start: number; end: number }> = ({ t, fps, lines, start, end }) => {
  if (t < start || t > end + 0.3) return null;
  const out = 1 - fade(t, end, end + 0.3);
  const bar = pop(t, start, fps, 120, 18);
  return (
    <div style={{ position: "absolute", left: 150, top: 250, opacity: out }}>
      <div style={{ height: 10, width: 820 * bar, background: red.neon, boxShadow: `0 0 30px ${red.neon}, 0 0 60px ${red.neon}`, marginBottom: 14, borderRadius: 5 }} />
      {lines.map((l, i) => {
        const s = pop(t, start + 0.12 + i * 0.12, fps, 160, 16);
        return (
          <div
            key={l}
            style={{
              fontFamily: "Oswald",
              fontWeight: 700,
              fontSize: 190,
              lineHeight: 0.98,
              color: red.main,
              letterSpacing: -2,
              textShadow: `0 0 18px ${red.neon}, 0 0 50px ${red.neon}99, 0 0 90px ${red.neon}66`,
              opacity: s,
              transform: `translateX(${(1 - s) * -80}px)`,
              WebkitTextStroke: "2px rgba(255,200,205,0.55)",
            }}
          >
            {l}
          </div>
        );
      })}
    </div>
  );
};

// ---------- 1-10 scale with cursor ----------
export const Scale: React.FC<P & { start: number; end: number; side: "left" | "right" }> = ({ t, fps, start, end, side }) => {
  if (t < start || t > end + 0.25) return null;
  const out = 1 - fade(t, end, end + 0.25);
  const x = side === "left" ? 60 : 960;
  const top = side === "left" ? 140 : 200;
  const step = 96;
  // cursor wanders down the scale and settles
  const target = interpolate(t, [start + 0.3, end - 0.4], [0.5, 6.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const wobble = Math.sin(t * 5) * 0.25;
  const cy = top + (target + wobble) * step + 30;
  return (
    <div style={{ position: "absolute", left: x, top, opacity: out }}>
      {Array.from({ length: 10 }).map((_, i) => {
        const s = pop(t, start + i * 0.035, fps, 260, 18);
        return (
          <div key={i} style={{ width: 64, height: 84, marginBottom: 12, borderRadius: 8, background: red.main, opacity: 0.92 * s, transform: `scaleY(${s})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Oswald", fontWeight: 700, fontSize: 54, color: "white", boxShadow: "0 4px 14px rgba(0,0,0,0.35)" }}>
            {i + 1}
          </div>
        );
      })}
      <svg width="60" height="60" viewBox="0 0 24 24" style={{ position: "absolute", left: side === "left" ? -52 : -60, top: cy - top - 20, filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.5))", transform: side === "left" ? "scaleX(-1)" : undefined }}>
        <path d="M21 4L3 11l7 2.5L12.5 21z" fill="white" />
      </svg>
    </div>
  );
};

// ---------- name lower third ----------
export const NameTag: React.FC<P & { start: number; end: number; name: string; role: string }> = ({ t, fps, start, end, name, role }) => {
  if (t < start || t > end + 0.3) return null;
  const s = pop(t, start + 0.3, fps, 170, 16);
  const out = 1 - fade(t, end, end + 0.3);
  return (
    <div style={{ position: "absolute", left: 140, top: 1180, opacity: s * out, transform: `translateX(${(1 - s) * -60}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "14px 36px 14px 14px", borderRadius: 999, background: "rgba(40,40,46,0.72)", border: "3px solid rgba(255,255,255,0.75)", boxShadow: "0 0 26px rgba(255,255,255,0.35), 0 10px 30px rgba(0,0,0,0.5)", backdropFilter: "blur(10px)" }}>
        <Img src={staticFile("media/avatar.png")} style={{ width: 96, height: 96, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.6)" }} />
        <div>
          <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 44, color: "white", lineHeight: 1.05 }}>{name}</div>
          <div style={{ fontFamily: inter, fontWeight: 500, fontSize: 28, color: "rgba(255,255,255,0.8)" }}>{role}</div>
        </div>
        <svg width="46" height="46" viewBox="0 0 24 24">
          <path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.6-1 2.9 1 2.9-2.5 1.6-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9L3.2 16l1-2.9-1-2.9 2.5-1.6.9-2.9 3 .2z" fill="#3BA3F5" />
          <path d="M8 12.3l2.7 2.7L16.2 9.5" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};

// ---------- chapter card (full screen) ----------
export const Chapter: React.FC<P & { n: string; start: number; end: number; title: string[]; text: string }> = ({ t, fps, n, start, end, title, text }) => {
  if (t < start || t > end) return null;
  const bg = Math.min(fade(t, start, start + 0.12), 1 - fade(t, end - 0.15, end));
  const lines = fade(t, start, start + 0.6);
  const para = fade(t, start + 0.1, start + 0.6);
  const pill = pop(t, start + 0.15, fps, 170, 16);
  return (
    <AbsoluteFill style={{ background: red.dark, opacity: bg }}>
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, opacity: 0.85 }}>
        <defs>
          <linearGradient id={`g${n}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={red.neon} stopOpacity="0" />
            <stop offset="0.45" stopColor={red.neon} stopOpacity="0.55" />
            <stop offset="1" stopColor={red.neon} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {[-150, -90, -40, 40, 90, 150].map((dx, i) => (
          <path
            key={i}
            d={`M${540 + dx * 1.6} 0 L${540 + dx * 1.6} 1150 Q${540 + dx * 1.6} 1350 ${540 + dx * 0.4} 1500 L${540 + dx * 0.4} 1920`}
            stroke={`url(#g${n})`}
            strokeWidth={i === 2 || i === 3 ? 3 : 2}
            fill="none"
            strokeDasharray="2400"
            strokeDashoffset={2400 * (1 - lines)}
          />
        ))}
      </svg>
      <div style={{ position: "absolute", left: 150, right: 150, top: 690, textAlign: "center", fontFamily: inter, fontWeight: 500, fontSize: 25, lineHeight: 1.5, color: "rgba(255,255,255,0.55)", filter: `blur(${(1 - para) * 8}px)`, opacity: para }}>
        {text}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 860, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26, padding: "16px 60px 16px 16px", minWidth: 560, borderRadius: 999, background: red.main, boxShadow: `0 0 0 6px rgba(226,74,91,0.25), 0 0 40px ${red.neon}66`, transform: `translateX(${(1 - pill) * -120}px)`, opacity: pill }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: "#2A2A2E", border: "4px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: inter, fontWeight: 800, fontSize: 40, color: "white" }}>{n}</div>
          <div style={{ fontFamily: inter, fontWeight: 800, fontSize: 46, lineHeight: 1.0, color: "white", textAlign: "center", flex: 1 }}>
            {title.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- glass app panel with checklist ----------
const Btn: React.FC<{ d: string }> = ({ d }) => (
  <div style={{ width: 66, height: 66, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg width="32" height="32" viewBox="0 0 24 24">
      <path d={d} stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

export const GlassPanel: React.FC<P & { start: number; end: number; header: string; items: { at: number; text: string }[] }> = ({ t, fps, start, end, header, items }) => {
  if (t < start || t > end + 0.25) return null;
  const s = pop(t, start, fps, 170, 18);
  const out = 1 - fade(t, end, end + 0.25);
  const bar = fade(t, start + 0.15, start + 0.55);
  return (
    <div style={{ position: "absolute", left: 160, top: 900, width: 770, height: 700, opacity: s * out, transform: `translateY(${(1 - s) * 50}px) scale(${0.94 + 0.06 * s})` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 26, background: "rgba(225,232,240,0.16)", border: "2px solid rgba(255,255,255,0.35)", backdropFilter: "blur(7px) brightness(1.05)", boxShadow: "0 30px 60px rgba(0,0,0,0.35)" }} />
      <div style={{ position: "absolute", left: 22, right: 22, top: 20, display: "flex", justifyContent: "space-between" }}>
        <Btn d="M15 5l-7 7 7 7" />
        <div style={{ display: "flex", gap: 16 }}>
          <Btn d="M16.5 7.5l-7.6 7.6a2 2 0 0 0 2.8 2.8l8-8a4 4 0 0 0-5.7-5.7l-8 8a6 6 0 0 0 8.5 8.5l6-6" />
          <Btn d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          <Btn d="M6 12h.01M12 12h.01M18 12h.01" />
        </div>
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 128 }}>
        <div style={{ height: 52, width: `${bar * 100}%`, background: `linear-gradient(90deg, ${red.main}, ${red.neon})`, boxShadow: `0 0 26px ${red.neon}, 0 0 4px white inset`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", whiteSpace: "nowrap", fontFamily: inter, fontWeight: 700, fontSize: 30, color: "white" }}>
          {header}
        </div>
      </div>
      <div style={{ position: "absolute", left: 70, top: 240, display: "flex", flexDirection: "column", gap: 26 }}>
        {items.map((it) => {
          const k = pop(t, it.at, fps, 220, 16);
          return (
            <div key={it.text} style={{ display: "flex", alignItems: "center", gap: 20, opacity: k, transform: `translateX(${(1 - k) * -30}px)` }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: red.main, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 14px ${red.neon}88`, transform: `scale(${0.6 + 0.4 * k})` }}>
                <svg width="28" height="28" viewBox="0 0 24 24">
                  <path d="M5 12.5l4.5 4.5L19 7.5" stroke="white" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="30" strokeDashoffset={30 * (1 - k)} />
                </svg>
              </div>
              <div style={{ fontFamily: inter, fontWeight: 700, fontSize: 36, color: "white", textShadow: "0 2px 10px rgba(0,0,0,0.45)" }}>{it.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------- yellow highlighter checklist ----------
export const YellowList: React.FC<P & { start: number; end: number; items: { at: number; text: string }[] }> = ({ t, fps, start, end, items }) => {
  if (t < start || t > end + 0.2) return null;
  const out = 1 - fade(t, end, end + 0.2);
  return (
    <div style={{ position: "absolute", left: 150, top: 1130, display: "flex", flexDirection: "column", gap: 18, opacity: out }}>
      {items.map((it) => {
        const k = pop(t, it.at, fps, 240, 15);
        const tick = fade(t, it.at + 0.1, it.at + 0.35);
        return (
          <div key={it.text} style={{ display: "flex", alignItems: "center", gap: 18, opacity: Math.min(1, k * 1.5), transform: `translateX(${(1 - k) * -40}px)` }}>
            <div style={{ width: 74, height: 74, borderRadius: 18, background: red.yellow, boxShadow: `0 0 26px ${red.yellow}cc`, display: "flex", alignItems: "center", justifyContent: "center", transform: `rotate(${(1 - k) * -20}deg)` }}>
              <svg width="50" height="50" viewBox="0 0 24 24">
                <path d="M4.5 12.5l4.5 5L19.5 5.5" stroke="#3B3A2A" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="30" strokeDashoffset={30 * (1 - tick)} />
              </svg>
            </div>
            <div style={{ padding: "8px 30px 12px", background: red.slate, borderRadius: 6, fontFamily: "Lora", fontStyle: "italic", fontWeight: 500, fontSize: 48, color: "white" }}>{it.text}</div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- red Arabic caption strip ----------
export const RedCaption: React.FC<P & { text: string; start: number; top: number }> = ({ t, fps, text, start, top }) => {
  const s = pop(t, start, fps, 300, 22);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center" }}>
      <div style={{ background: red.main, padding: "2px 26px 8px", fontFamily: "Cairo", fontWeight: 700, fontSize: 54, color: "white", direction: "rtl", transform: `scaleX(${0.3 + 0.7 * s})`, opacity: Math.min(1, s * 2), boxShadow: "0 6px 20px rgba(0,0,0,0.35)", maxWidth: 880, textAlign: "center", lineHeight: 1.35 }}>
        {text}
      </div>
    </div>
  );
};
