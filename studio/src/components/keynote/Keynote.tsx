import { AbsoluteFill, Easing, interpolate } from "remotion";
import { K, type Pill, type SceneId } from "../../data/alk02";
import { springAt } from "../warm/Warm";

// Apple-keynote VSL building blocks: off-white stage, soft white tiles with real depth of field,
// perspective planes, smooth expo motion. Arabic UI type: IBM Plex Sans Arabic; Latin: Inter.
export const ease = Easing.bezier(0.22, 1, 0.36, 1);
export const r = (t: number, a: number, b: number, e = ease) => interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });
const AR = "IBM Plex Sans Arabic";

type IconName = "phone" | "book" | "puzzle" | "palette" | "check" | "home" | "heart" | "moon" | "plate" | "chat";
const st = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
export const KIcon: React.FC<{ n: IconName; s: number; c?: string }> = ({ n, s, c = K.blue }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" style={{ color: c, display: "block" }}>
    {n === "phone" && (<g {...st}><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></g>)}
    {n === "book" && <path {...st} d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13" />}
    {n === "puzzle" && <path {...st} d="M4 8h3a2 2 0 1 1 4 0h3v3a2 2 0 1 1 0 4v3h-3a2 2 0 1 0-4 0H4v-3a2 2 0 1 0 0-4z" />}
    {n === "palette" && (<g {...st}><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-1.3-1.1-1.6-1.1-2.7 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" /><circle cx="7.5" cy="11" r="1.1" fill="currentColor" /><circle cx="10.5" cy="7.3" r="1.1" fill="currentColor" /><circle cx="15" cy="7.8" r="1.1" fill="currentColor" /></g>)}
    {n === "check" && <path {...st} strokeWidth={2.6} d="M5 12.5l4.5 4.5L19 7.5" />}
    {n === "home" && <path {...st} d="M3.5 11L12 4l8.5 7M5.5 9.5V20h13V9.5M10 20v-5h4v5" />}
    {n === "heart" && <path {...st} d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />}
    {n === "moon" && <path {...st} d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />}
    {n === "plate" && (<g {...st}><circle cx="12" cy="12" r="6.5" /><circle cx="12" cy="12" r="3.5" /></g>)}
    {n === "chat" && <path {...st} d="M4 5h16v11H9l-5 4z" />}
  </svg>
);

// ---------- stage background ----------
export const Stage: React.FC<{ t: number; children: React.ReactNode }> = ({ t, children }) => (
  <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
    <div style={{ position: "absolute", left: -200, right: -200, top: 1250, height: 900, borderRadius: "50%", background: "linear-gradient(180deg, #E7ECF3, rgba(231,236,243,0))", transform: `translateY(${Math.sin(t * 0.4) * 20}px)` }} />
    <div style={{ position: "absolute", inset: 0, perspective: 1800, perspectiveOrigin: "50% 45%" }}>{children}</div>
  </AbsoluteFill>
);

/** white tile floating in 3D; z<0 is far (blurred), z>0 near (blurred, bigger) - real DOF */
export const Tile: React.FC<{ x: number; y: number; z: number; size: number; t: number; seed: number; children?: React.ReactNode; focus?: number }> = ({ x, y, z, size, t, seed, children, focus = 0 }) => {
  const fy = Math.sin(t * 0.9 + seed) * 14;
  const rot = Math.sin(t * 0.5 + seed * 2) * 10 + seed * 7;
  const blur = Math.min(18, Math.abs(z - focus) / 28);
  return (
    <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2 + fy, width: size, height: size, borderRadius: size * 0.24, background: "white", boxShadow: "0 18px 40px rgba(30,42,58,0.12), 0 2px 0 rgba(30,42,58,0.04)", display: "flex", alignItems: "center", justifyContent: "center", transform: `translateZ(${z}px) rotateZ(${rot}deg) rotateX(12deg)`, filter: `blur(${blur}px)` }}>
      {children}
    </div>
  );
};

export const Title: React.FC<{ text: string; t: number; at: number; size?: number; color?: string; dot?: boolean }> = ({ text, t, at, size = 140, color = K.blue, dot = true }) => {
  const k = r(t, at, at + 0.9);
  return (
    <div style={{ fontFamily: AR, fontWeight: 700, fontSize: size, color, direction: "rtl", letterSpacing: -1, opacity: k, filter: `blur(${(1 - k) * 16}px)`, transform: `translateY(${(1 - k) * 30}px) scale(${0.94 + 0.06 * k})`, whiteSpace: "nowrap" }}>
      {text}
      {dot && <span style={{ color: K.ink }}>.</span>}
    </div>
  );
};

export const Sub: React.FC<{ text: string; t: number; at: number; color?: string }> = ({ text, t, at, color = K.gray }) => {
  const k = r(t, at, at + 0.7);
  return <div style={{ fontFamily: AR, fontWeight: 500, fontSize: 46, color, direction: "rtl", opacity: k, transform: `translateY(${(1 - k) * 16}px)` }}>{text}</div>;
};

// ---------- pill tags beside the speaker ----------
export const PillStack: React.FC<{ t: number; fps: number; pills: Pill[]; end: number }> = ({ t, fps, pills, end }) => {
  const out = r(t, end - 0.35, end, Easing.in(Easing.cubic));
  return (
    <div style={{ position: "absolute", right: 56, top: 470, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 18, opacity: 1 - out, filter: `blur(${out * 10}px)` }}>
      {pills.map((p) => {
        const s = springAt(t, p.at, fps, 20, 170);
        if (s <= 0) return null;
        const chat = p.kind === "chat";
        return (
          <div key={p.text} style={{ display: "flex", alignItems: "center", gap: 14, direction: "rtl", background: "rgba(255,255,255,0.96)", borderRadius: 999, padding: chat ? "20px 34px" : "14px 30px 14px 16px", boxShadow: "0 14px 36px rgba(0,0,0,0.28)", opacity: Math.min(1, s * 1.4), transform: `translateX(${(1 - s) * 120}px) scale(${0.85 + 0.15 * s})`, filter: `blur(${(1 - s) * 8}px)` }}>
            {p.kind === "num" && <div style={{ width: 50, height: 50, borderRadius: "50%", background: K.blue, color: "white", fontFamily: "Inter", fontWeight: 700, fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>{p.num}</div>}
            {p.kind === "check" && <div style={{ width: 46, height: 46, borderRadius: "50%", background: K.blue, display: "flex", alignItems: "center", justifyContent: "center" }}><KIcon n="check" s={30} c="white" /></div>}
            {p.kind === "muted" && <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center" }}><KIcon n="phone" s={28} c={K.gray} /></div>}
            {chat && <KIcon n="chat" s={40} c={K.blue} />}
            <div style={{ fontFamily: AR, fontWeight: 600, fontSize: chat ? 52 : 40, color: K.ink }}>{p.text}</div>
          </div>
        );
      })}
    </div>
  );
};

export const NameTag: React.FC<{ t: number; fps: number; at: number; name: string; role: string }> = ({ t, fps, at, name, role }) => {
  const s = springAt(t, at, fps, 20, 150);
  if (s <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 300, display: "flex", justifyContent: "center", opacity: s, transform: `translateY(${(1 - s) * 50}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, background: "rgba(255,255,255,0.96)", borderRadius: 26, padding: "18px 34px 18px 20px", boxShadow: "0 18px 50px rgba(0,0,0,0.3)" }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: K.blue, display: "flex", alignItems: "center", justifyContent: "center" }}><KIcon n="check" s={40} c="white" /></div>
        <div>
          <div style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 46, color: K.ink, lineHeight: 1.05 }}>{name}</div>
          <div style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 28, color: K.gray, letterSpacing: 2 }}>{role}</div>
        </div>
      </div>
    </div>
  );
};

// ================= full-screen scenes =================
type S = { t: number; fps: number; start: number; end: number };

const Alt: React.FC<S> = ({ t, start }) => {
  const dolly = (t - start) * 40;
  const tiles: [number, number, number, number, IconName | null][] = [
    [170, 420, -500, 150, "phone"], [880, 380, -300, 170, "book"], [300, 1450, 200, 230, "puzzle"], [820, 1380, -100, 190, "palette"],
    [120, 900, -700, 120, null], [960, 960, -650, 120, null], [560, 260, -800, 110, null], [520, 1650, 350, 260, null], [760, 640, -900, 100, null], [260, 1180, -900, 100, null],
  ];
  return (
    <>
      <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `translateZ(${dolly}px)` }}>
        {tiles.map(([x, y, z, s, ic], i) => (
          <Tile key={i} x={x} y={y} z={z} size={s} t={t} seed={i}>{ic && <KIcon n={ic} s={s * 0.48} c={ic === "phone" ? K.gray : K.blue} />}</Tile>
        ))}
      </div>
      <div style={{ position: "absolute", top: 820, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <Title text="البديل" t={t} at={start + 0.3} size={190} />
        <Sub text="شي كتاب ولا شي لعبة" t={t} at={start + 2.6} />
      </div>
    </>
  );
};

const Flip: React.FC<S> = ({ t, fps, start }) => {
  const flip = r(t, start + 1.0, start + 2.0, Easing.bezier(0.65, 0, 0.35, 1));
  const ent = springAt(t, start, fps, 22, 120);
  const ry = -22 + flip * 180 + Math.sin(t * 0.8) * 4;
  const face = (back: boolean): React.CSSProperties => ({ position: "absolute", inset: 0, borderRadius: 64, backfaceVisibility: "hidden", transform: back ? "rotateY(180deg)" : undefined, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 });
  return (
    <>
      <div style={{ position: "absolute", top: 230, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", height: 70 }}>
          <div style={{ position: "absolute", right: "50%", transform: "translateX(50%)", opacity: 1 - r(t, start + 1.1, start + 1.5) }}><Sub text="قبل ما تحيدي ليه التيليفون" t={t} at={start + 0.2} /></div>
          <div style={{ position: "absolute", right: "50%", transform: "translateX(50%)", whiteSpace: "nowrap" }}><Sub text="حطي البديل قدامو" t={t} at={start + 1.6} color={K.blue} /></div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 300, top: 520, width: 480, height: 860, transformStyle: "preserve-3d", transform: `translateY(${(1 - ent) * 300}px) rotateX(8deg) rotateY(${ry}deg)` }}>
        <div style={{ ...face(false), background: "linear-gradient(160deg, #2B2F36, #121417)", boxShadow: "0 50px 90px rgba(30,42,58,0.35)", border: "10px solid #3A3F47" }}>
          <KIcon n="phone" s={180} c="#6B7280" />
        </div>
        <div style={{ ...face(true), background: `linear-gradient(160deg, ${K.blue}, ${K.blueDeep})`, boxShadow: "0 50px 90px rgba(31,78,121,0.4)" }}>
          <KIcon n="book" s={200} c="white" />
          <div style={{ fontFamily: AR, fontWeight: 700, fontSize: 74, color: "white" }}>البديل</div>
        </div>
      </div>
    </>
  );
};

const Objects: React.FC<S> = ({ t, fps, start }) => {
  const items: { at: number; n: IconName; label: string }[] = [
    { at: start + 0.4, n: "palette", label: "لعبة ملونة" },
    { at: start + 1.8, n: "puzzle", label: "Puzzle" },
    { at: start + 3.2, n: "book", label: "كتاب فيه صور" },
  ];
  const pan = Math.sin((t - start) * 0.35) * 6;
  return (
    <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `rotateY(${pan}deg)` }}>
      {items.map((it, i) => {
        const s = springAt(t, it.at, fps, 20, 130);
        const x = [190, 540, 890][i];
        const z = [-120, 60, -120][i];
        const ry = [24, 0, -24][i];
        return (
          <div key={it.label} style={{ position: "absolute", left: x - 160, top: 640, width: 320, height: 460, borderRadius: 44, background: "white", boxShadow: "0 40px 80px rgba(30,42,58,0.16)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 34, opacity: Math.min(1, s * 1.3), transform: `translateZ(${z + (1 - s) * -600}px) translateY(${(1 - s) * 200 + Math.sin(t + i) * 10}px) rotateY(${ry + (1 - s) * 40}deg)` }}>
            <div style={{ width: 170, height: 170, borderRadius: 42, background: K.blueSoft, display: "flex", alignItems: "center", justifyContent: "center" }}><KIcon n={it.n} s={100} /></div>
            <div style={{ fontFamily: it.label === "Puzzle" ? "Inter" : AR, fontWeight: 700, fontSize: 46, color: K.ink }}>{it.label}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", top: 1300, left: 0, right: 0, display: "flex", justifyContent: "center" }}><Sub text="قدميه ليه، وخليه قدام عينيه" t={t} at={start + 4.2} /></div>
    </div>
  );
};

const Five: React.FC<S> = ({ t, start }) => {
  const c = r(t, start + 0.3, start + 2.4, Easing.bezier(0.45, 0, 0.2, 1));
  const secs = Math.round(c * 300);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const done = r(t, start + 2.4, start + 2.9);
  const L = 2 * Math.PI * 170;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 50 }}>
      <div style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 150, color: K.blue, fontVariantNumeric: "tabular-nums" }}>{mm}:{ss}</div>
      <div style={{ position: "relative", width: 400, height: 400 }}>
        <svg width="400" height="400" style={{ position: "absolute", inset: 0, transform: `rotate(${t * 40}deg)` }}>
          <circle cx="200" cy="200" r="170" stroke={K.blue} strokeWidth="5" fill="none" strokeDasharray="10 14" opacity={0.6} />
        </svg>
        <svg width="400" height="400" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx="200" cy="200" r="170" stroke={K.blue} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - c)} />
        </svg>
        <div style={{ position: "absolute", inset: 90, borderRadius: "50%", background: "white", boxShadow: "0 30px 60px rgba(30,42,58,0.12)", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${0.8 + 0.2 * done})` }}>
          <div style={{ opacity: done }}><KIcon n="check" s={130} /></div>
        </div>
      </div>
      <Sub text="أول 5 دقايق، گلسي معاه" t={t} at={start + 0.6} color={K.ink} />
    </div>
  );
};

const Grid: React.FC<S> = ({ t, start }) => {
  const cols = 7;
  const rows = 9;
  const wave = (t - start - 0.9) * 9;
  return (
    <>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <Title text="بلا شاشات" t={t} at={start + 0.2} size={140} />
        <Sub text="أوقات وأماكن ممنوعة فيها الشاشة" t={t} at={start + 1.2} />
      </div>
      <div style={{ position: "absolute", left: 110, top: 760, width: 800, display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 18, transform: "rotateX(52deg) rotateZ(-8deg)", transformOrigin: "50% 30%" }}>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const off = Math.min(1, Math.max(0, wave - (row + col) * 0.8));
          const shade = [K.blueDeep, K.blue, "#5B8FCF", "#86ABDB"][(i * 7) % 4];
          return (
            <div key={i} style={{ aspectRatio: "1", borderRadius: 18, background: off > 0.5 ? "white" : shade, boxShadow: off > 0.5 ? "0 6px 14px rgba(30,42,58,0.08)" : "none", transform: `rotateY(${off * 180}deg)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {off <= 0.5 && <KIcon n="phone" s={44} c="rgba(255,255,255,0.75)" />}
            </div>
          );
        })}
      </div>
    </>
  );
};

const Corner: React.FC<S> = ({ t, fps, start }) => {
  const items: [IconName, string][] = [["book", "كتب"], ["puzzle", "Puzzle"], ["palette", "تلوين"], ["heart", "مريح"]];
  return (
    <>
      <div style={{ position: "absolute", top: 330, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <Title text="ركن القراية" t={t} at={start + 0.2} size={130} />
        <Sub text="مريح ومغري للطفل" t={t} at={start + 2.4} />
      </div>
      <div style={{ position: "absolute", left: 190, top: 760, width: 700, height: 700, transformStyle: "preserve-3d", transform: `rotateX(28deg) rotateY(${Math.sin(t * 0.5) * 8}deg)` }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 70, background: "white", boxShadow: "0 50px 100px rgba(30,42,58,0.15)", transform: "translateZ(-40px)" }} />
        {items.map(([n, label], i) => {
          const s = springAt(t, start + 0.8 + i * 0.35, fps, 18, 120);
          const fx = [-420, 420, -420, 420][i];
          const fy = [-300, -300, 300, 300][i];
          const x = (i % 2) * 340 + 30;
          const y = Math.floor(i / 2) * 340 + 30;
          return (
            <div key={label} style={{ position: "absolute", left: x + (1 - s) * fx, top: y + (1 - s) * fy, width: 300, height: 300, borderRadius: 50, background: i === 0 ? K.blue : K.blueSoft, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, opacity: Math.min(1, s * 1.5), transform: `translateZ(${(1 - s) * 300 + 30}px)` }}>
              <KIcon n={n} s={110} c={i === 0 ? "white" : K.blue} />
              <div style={{ fontFamily: label === "Puzzle" ? "Inter" : AR, fontWeight: 700, fontSize: 38, color: i === 0 ? "white" : K.ink }}>{label}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};

const Dash: React.FC<S> = ({ t, fps, start }) => {
  const ent = springAt(t, start, fps, 22, 110);
  const ring = (p: number, color: string) => {
    const L = 2 * Math.PI * 110;
    return (
      <svg width="260" height="260" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="130" cy="130" r="110" stroke="#EEF0F3" strokeWidth="18" fill="none" />
        <circle cx="130" cy="130" r="110" stroke={color} strokeWidth="18" fill="none" strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - p)} />
      </svg>
    );
  };
  const pScreen = r(t, start + 0.6, start + 1.3) * 0.92 - r(t, start + 2.2, start + 3.4) * 0.8;
  const pBook = r(t, start + 2.4, start + 5.4, Easing.bezier(0.33, 0, 0.2, 1)) * 0.86;
  const col = (label: string, sub: string, p: number, color: string, at: number) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: r(t, at, at + 0.5) }}>
      <div style={{ position: "relative" }}>
        {ring(Math.max(0, p), color)}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter", fontWeight: 700, fontSize: 64, color: K.ink }}>{Math.round(Math.max(0, p) * 100)}%</div>
      </div>
      <div style={{ fontFamily: AR, fontWeight: 700, fontSize: 48, color: K.ink }}>{label}</div>
      <div style={{ fontFamily: AR, fontWeight: 500, fontSize: 34, color: K.gray }}>{sub}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 470, height: 980, borderRadius: 60, background: "white", boxShadow: "0 50px 110px rgba(30,42,58,0.14)", transform: `translateY(${(1 - ent) * 400}px) rotateX(${(1 - ent) * 30 + 8}deg)`, display: "flex", flexDirection: "column", alignItems: "center", padding: "70px 40px", gap: 40 }}>
      <div style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 30, letterSpacing: 6, color: K.gray }}>SCREEN VS BOOK</div>
      <div style={{ fontFamily: AR, fontWeight: 700, fontSize: 72, color: K.ink, direction: "rtl" }}>شنو كيعطي لولدك؟</div>
      <div style={{ display: "flex", gap: 90, marginTop: 30 }}>
        {col("الشاشة", "متعة سريعة", pScreen, K.red, start + 0.4)}
        {col("الكتاب", "دماغ متزن", pBook, K.blue, start + 2.3)}
      </div>
    </div>
  );
};

export const SceneView: React.FC<{ id: SceneId } & S> = ({ id, ...p }) => (
  <Stage t={p.t}>
    {id === "alt" && <Alt {...p} />}
    {id === "flip" && <Flip {...p} />}
    {id === "objects" && <Objects {...p} />}
    {id === "five" && <Five {...p} />}
    {id === "grid" && <Grid {...p} />}
    {id === "corner" && <Corner {...p} />}
    {id === "dash" && <Dash {...p} />}
  </Stage>
);
