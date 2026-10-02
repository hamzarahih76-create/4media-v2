import { AbsoluteFill, interpolate } from "remotion";
import { bubbles, C, captions, corner, hook, moments, noScreen, objects, outro, steps, swap, timer, versus } from "../../data/alk01";
import { Ar, env, glass, Ico, IconTile, ramp, springAt } from "./Warm";

type P = { t: number; fps: number };
const persp = { perspective: 1600, perspectiveOrigin: "50% 30%" } as const;

// ---------- hook: giant word behind the speaker (cutout layer sits on top, see Alk01) ----------
export const HookWord: React.FC<P> = ({ t }) => {
  if (t > hook.end + 0.5) return null;
  const k = ramp(t, 0.1, 1.1);
  const out = 1 - ramp(t, hook.end - 0.1, hook.end + 0.4);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 470, display: "flex", justifyContent: "center", opacity: out, filter: `blur(${(1 - k) * 18 + (1 - out) * 20}px)`, transform: `scale(${1.25 - 0.25 * k}) translateY(${(1 - out) * -60}px)` }}>
      <div
        style={{
          fontFamily: "Cairo",
          fontWeight: 900,
          fontSize: 330,
          lineHeight: 1,
          direction: "rtl",
          background: `linear-gradient(180deg, ${C.cream} 10%, ${C.gold} 55%, ${C.terra} 100%)`,
          WebkitBackgroundClip: "text",
          color: "transparent",
          clipPath: `inset(0 0 0 ${(1 - k) * 100}%)`,
          filter: "drop-shadow(0 20px 40px rgba(26,20,16,0.45))",
        }}
      >
        {hook.word}
      </div>
    </div>
  );
};

export const HookKicker: React.FC<P> = ({ t, fps }) => {
  if (t > hook.end + 0.5) return null;
  const s = springAt(t, 0.35, fps);
  const out = 1 - ramp(t, hook.end - 0.1, hook.end + 0.3);
  return (
    <div style={{ position: "absolute", top: 150, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: s * out, transform: `translateY(${(1 - s) * -50}px)` }}>
      <div style={{ ...glass, display: "flex", alignItems: "center", gap: 18, padding: "16px 34px", borderRadius: 999, direction: "rtl" }}>
        <div style={{ width: 62, height: 62, borderRadius: "50%", background: C.terra, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ico name="phone" size={38} />
        </div>
        <Ar size={44} weight={800}>{hook.kicker}</Ar>
      </div>
    </div>
  );
};

// ---------- step cards: 3D flip-in, editorial numbering ----------
export const StepCards: React.FC<P> = ({ t, fps }) => (
  <>
    {steps.map((st) => {
      if (t < st.start - 0.05 || t > st.end + 0.1) return null;
      const k = ramp(t, st.start, st.start + 0.85);
      const num = springAt(t, st.start + 0.12, fps, 16, 120);
      const out = ramp(t, st.end - 0.4, st.end, (x) => x * x);
      const line = ramp(t, st.start + 0.35, st.start + 1.1);
      const float = Math.sin((t - st.start) * 1.6) * 3;
      return (
        <AbsoluteFill key={st.n} style={persp}>
          <div
            style={{
              ...glass,
              position: "absolute",
              left: 70,
              right: 70,
              top: 170,
              height: 380,
              borderRadius: 48,
              transformOrigin: "50% 0%",
              transform: `translateY(${(1 - k) * -140 - out * 80}px) rotateX(${(1 - k) * -75 + out * 55}deg) rotateY(${float}deg)`,
              opacity: Math.min(1, k * 1.6) * (1 - out),
              filter: `blur(${out * 14}px)`,
              display: "flex",
              alignItems: "center",
              padding: "0 56px",
              gap: 40,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontFamily: "Playfair Display",
                fontStyle: "italic",
                fontWeight: 800,
                fontSize: 250,
                lineHeight: 1,
                background: `linear-gradient(160deg, ${C.gold}, ${C.terra} 60%, ${C.terraDeep})`,
                WebkitBackgroundClip: "text",
                color: "transparent",
                transform: `translateX(${(1 - num) * -120}px) scale(${0.6 + 0.4 * num})`,
                opacity: num,
              }}
            >
              {st.n}
            </div>
            <div style={{ flex: 1, direction: "rtl", textAlign: "right" }}>
              <Ar size={32} weight={700} color={C.gold} style={{ letterSpacing: 1, textShadow: "none" }}>{st.label}</Ar>
              <div style={{ height: 6, width: `${line * 70}%`, background: C.terra, borderRadius: 3, margin: "10px 0 14px auto" }} />
              <Ar size={68} weight={900}>{st.title}</Ar>
            </div>
          </div>
        </AbsoluteFill>
      );
    })}
  </>
);

// ---------- captions: word-by-word blur-rise, terracotta underline on key words ----------
export const Captions: React.FC<P> = ({ t }) => {
  const p = captions.find((c) => t >= c.start && t < c.end + 0.25);
  if (!p) return null;
  const words = p.text.split(" ");
  const span = (p.end - p.start) * 0.75;
  const out = ramp(t, p.end, p.end + 0.25, (x) => x);
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top: 1180, display: "flex", flexWrap: "wrap", justifyContent: "center", direction: "rtl", columnGap: 20, opacity: 1 - out, filter: `blur(${out * 10}px)`, transform: `translateY(${out * -30}px)` }}>
      {words.map((w, i) => {
        const at = p.start + (span * i) / words.length;
        const k = ramp(t, at, at + 0.45);
        const hl = p.hl?.some((h) => w.includes(h));
        const u = ramp(t, at + 0.15, at + 0.6);
        return (
          <span key={i} style={{ position: "relative", display: "inline-block", opacity: k, filter: `blur(${(1 - k) * 12}px)`, transform: `translateY(${(1 - k) * 40}px)` }}>
            <Ar size={72} weight={900} color={hl ? C.cream : C.cream}>{w}</Ar>
            {hl && <div style={{ position: "absolute", right: 0, bottom: 10, height: 14, width: `${u * 100}%`, background: C.terra, borderRadius: 7, zIndex: -1, opacity: 0.95 }} />}
          </span>
        );
      })}
    </div>
  );
};

// ---------- phone -> book swap ----------
export const Swap: React.FC<P> = ({ t, fps }) => {
  if (t < swap.start || t > swap.end + 0.3) return null;
  const e = env(t, swap.start, swap.end + 0.3, 0.6, 0.35);
  const go = ramp(t, swap.start + 0.6, swap.start + 1.4, (x) => x * x * (3 - 2 * x));
  const book = springAt(t, swap.start + 0.9, fps, 18, 150);
  return (
    <AbsoluteFill style={{ ...persp, opacity: e }}>
      <div style={{ position: "absolute", top: 230, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 70 }}>
        <div style={{ transform: `translateX(${go * -260}px) rotateY(${go * 60}deg)`, opacity: 1 - go * 0.85, filter: `grayscale(${go}) blur(${go * 6}px)` }}>
          <IconTile name="phone" size={230} tint="#5B5550" />
        </div>
        <div style={{ position: "absolute", transform: `translateX(${(1 - book) * 300}px) rotateY(${(1 - book) * -55}deg) scale(${0.7 + 0.3 * book})`, opacity: book }}>
          <IconTile name="book" size={260} />
          <Ar size={40} weight={800} style={{ textAlign: "center", marginTop: 16 }}>البديل</Ar>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- three floating objects ----------
export const Objects: React.FC<P> = ({ t, fps }) => {
  if (t < objects.start || t > objects.end + 0.4) return null;
  const out = ramp(t, objects.end, objects.end + 0.4, (x) => x * x);
  const pos = [
    { x: 215, y: 330, ry: 22 },
    { x: 540, y: 230, ry: 0 },
    { x: 865, y: 330, ry: -22 },
  ];
  return (
    <AbsoluteFill style={persp}>
      {objects.items.map((it, i) => {
        const s = springAt(t, it.at, fps, 14, 150);
        const fl = Math.sin(t * 1.8 + i * 1.3) * 12;
        const p = pos[i];
        return (
          <div key={it.label} style={{ position: "absolute", left: p.x - 100, top: p.y + fl, width: 200, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: s * (1 - out), filter: `blur(${out * 12}px)`, transform: `translateY(${(1 - s) * 120 - out * 60}px) rotateY(${p.ry + (1 - s) * 70}deg) rotateZ(${(1 - s) * -18}deg) scale(${0.5 + 0.5 * s})` }}>
            <IconTile name={it.icon} size={210} tint={i === 1 ? C.green : C.terra} />
            <Ar size={38} weight={800}>{it.label}</Ar>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- 5 minutes ring ----------
export const Timer: React.FC<P> = ({ t, fps }) => {
  if (t < timer.start || t > timer.end + 0.3) return null;
  const e = env(t, timer.start, timer.end + 0.3);
  const s = springAt(t, timer.start, fps, 15, 140);
  const prog = ramp(t, timer.start + 0.3, timer.end - 0.2, (x) => x);
  const R = 120;
  const L = 2 * Math.PI * R;
  return (
    <div style={{ position: "absolute", top: 220, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: e, transform: `scale(${0.6 + 0.4 * s})` }}>
      <div style={{ ...glass, width: 330, height: 330, borderRadius: "50%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <svg width="330" height="330" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx="165" cy="165" r={R} stroke="rgba(255,244,230,0.2)" strokeWidth="16" fill="none" />
          <circle cx="165" cy="165" r={R} stroke={C.terra} strokeWidth="16" fill="none" strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - prog)} />
        </svg>
        <div style={{ fontFamily: "Playfair Display", fontStyle: "italic", fontWeight: 800, fontSize: 130, color: C.cream, lineHeight: 0.9 }}>5</div>
        <Ar size={34} weight={800}>دقايق معاه</Ar>
      </div>
    </div>
  );
};

// ---------- speech bubbles ----------
export const Bubbles: React.FC<P> = ({ t, fps }) => {
  if (t < bubbles.start || t > bubbles.end + 0.3) return null;
  const out = ramp(t, bubbles.end, bubbles.end + 0.3);
  return (
    <>
      {bubbles.items.map((b) => {
        const s = springAt(t, b.at, fps, 12, 200);
        const left = b.side === "left";
        const fl = Math.sin(t * 2 + (left ? 0 : 2)) * 8;
        return (
          <div key={b.text} style={{ position: "absolute", top: (left ? 470 : 640) + fl, [left ? "left" : "right"]: 60, opacity: s * (1 - out), transform: `scale(${s})`, transformOrigin: left ? "90% 100%" : "10% 100%" }}>
            <div style={{ background: C.cream, borderRadius: 40, padding: "22px 40px", boxShadow: "0 24px 60px rgba(26,20,16,0.45)", position: "relative" }}>
              <Ar size={54} weight={900} color={C.ink} style={{ textShadow: "none" }}>{b.text}</Ar>
              <div style={{ position: "absolute", bottom: -22, [left ? "right" : "left"]: 60, width: 44, height: 44, background: C.cream, transform: "rotate(45deg)", borderRadius: 6 }} />
            </div>
          </div>
        );
      })}
    </>
  );
};

// ---------- no screen ----------
export const NoScreen: React.FC<P> = ({ t, fps }) => {
  if (t < noScreen.start || t > noScreen.end + 0.3) return null;
  const e = env(t, noScreen.start, noScreen.end + 0.3);
  const s = springAt(t, noScreen.start, fps, 15, 150);
  const slash = ramp(t, noScreen.start + 0.5, noScreen.start + 1.1);
  return (
    <div style={{ position: "absolute", top: 220, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, opacity: e, transform: `scale(${0.6 + 0.4 * s}) rotateZ(${(1 - s) * 10}deg)` }}>
      <div style={{ position: "relative" }}>
        <IconTile name="phone" size={250} tint="#5B5550" />
        <svg width="320" height="320" viewBox="0 0 100 100" style={{ position: "absolute", left: -35, top: -35 }}>
          <circle cx="50" cy="50" r="44" stroke={C.terra} strokeWidth="7" fill="none" strokeDasharray="277" strokeDashoffset={277 * (1 - slash)} />
          <path d="M19 19 L81 81" stroke={C.terra} strokeWidth="7" strokeLinecap="round" strokeDasharray="88" strokeDashoffset={88 * (1 - ramp(t, noScreen.start + 0.9, noScreen.start + 1.3))} />
        </svg>
      </div>
    </div>
  );
};

// ---------- moments chips ----------
export const Moments: React.FC<P> = ({ t, fps }) => {
  if (t < moments.start || t > moments.end + 0.3) return null;
  const out = ramp(t, moments.end, moments.end + 0.3);
  return (
    <div style={{ position: "absolute", top: 230, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
      {moments.items.map((m) => {
        const s = springAt(t, m.at, fps, 18, 160);
        return (
          <div key={m.text} style={{ ...glass, display: "flex", alignItems: "center", gap: 22, padding: "16px 40px 16px 18px", borderRadius: 999, direction: "rtl", opacity: s * (1 - out), filter: `blur(${out * 10}px)`, transform: `translateX(${(1 - s) * 200}px)` }}>
            <div style={{ width: 92, height: 92, borderRadius: "50%", background: C.terra, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ico name={m.icon} size={54} />
            </div>
            <Ar size={56} weight={900}>{m.text}</Ar>
          </div>
        );
      })}
    </div>
  );
};

// ---------- reading corner ----------
export const Corner: React.FC<P> = ({ t, fps }) => {
  if (t < corner.start || t > corner.end + 0.3) return null;
  const e = env(t, corner.start, corner.end + 0.3);
  const s = springAt(t, corner.start, fps, 18, 140);
  const orbit = (i: number) => {
    const a = t * 1.1 + i * Math.PI;
    return { x: Math.cos(a) * 60, y: Math.sin(a) * 20 };
  };
  return (
    <div style={{ ...persp, position: "absolute", top: 200, left: 70, right: 70, opacity: e }}>
      <div style={{ ...glass, borderRadius: 48, padding: "44px 50px", display: "flex", alignItems: "center", gap: 40, direction: "rtl", transform: `rotateX(${(1 - s) * -60}deg) translateY(${(1 - s) * -80}px)`, transformOrigin: "50% 0%" }}>
        <div style={{ position: "relative" }}>
          <IconTile name="home" size={190} tint={C.green} />
          {[0, 1].map((i) => (
            <div key={i} style={{ position: "absolute", left: 60 + orbit(i).x, top: -40 + orbit(i).y }}>
              <IconTile name={i ? "palette" : "book"} size={70} />
            </div>
          ))}
        </div>
        <div>
          <Ar size={64} weight={900}>{corner.title}</Ar>
          <Ar size={40} weight={700} color={C.gold} style={{ opacity: ramp(t, corner.start + 2.3, corner.start + 2.9) }}>{corner.sub}</Ar>
        </div>
      </div>
    </div>
  );
};

// ---------- screen vs book ----------
export const Versus: React.FC<P> = ({ t, fps }) => {
  if (t < versus.start || t > versus.end + 0.3) return null;
  const out = ramp(t, versus.end, versus.end + 0.3);
  const card = (side: "left" | "right", at: number) => {
    const d = side === "left" ? versus.left : versus.right;
    const s = springAt(t, at, fps, 16, 150);
    const dark = side === "left";
    return (
      <div style={{ ...glass, width: 430, borderRadius: 40, padding: "36px 30px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, background: dark ? "rgba(40,34,30,0.55)" : `linear-gradient(140deg, ${C.terra}EE, ${C.terraDeep}CC)`, opacity: s * (1 - out), transform: `rotateY(${(1 - s) * (dark ? 70 : -70)}deg) translateY(${(1 - s) * 60}px)` }}>
        <Ico name={d.icon} size={96} color={dark ? "#B9AFA6" : C.cream} />
        <Ar size={56} weight={900}>{d.title}</Ar>
        <Ar size={38} weight={700} color={dark ? "#D6CCC2" : C.cream} style={{ textAlign: "center" }}>{d.text}</Ar>
      </div>
    );
  };
  const vs = springAt(t, versus.start + 0.6, fps, 10, 200);
  return (
    <div style={{ ...persp, position: "absolute", top: 210, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 40, direction: "ltr" }}>
      {card("left", versus.start + 0.1)}
      <div style={{ position: "absolute", fontFamily: "Playfair Display", fontStyle: "italic", fontWeight: 800, fontSize: 90, color: C.gold, transform: `scale(${vs})`, opacity: 1 - out, textShadow: "0 8px 30px rgba(0,0,0,0.6)" }}>vs</div>
      {card("right", versus.start + 2.3)}
    </div>
  );
};

// ---------- outro name tag ----------
export const Outro: React.FC<P> = ({ t, fps }) => {
  if (t < outro.start) return null;
  const s = springAt(t, outro.start + 0.6, fps, 20, 140);
  const line = ramp(t, outro.start + 0.9, outro.start + 1.6);
  return (
    <div style={{ position: "absolute", top: 1430, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: s, transform: `translateY(${(1 - s) * 60}px)` }}>
      <div style={{ ...glass, borderRadius: 32, padding: "26px 54px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontFamily: "Playfair Display", fontStyle: "italic", fontWeight: 800, fontSize: 70, color: C.cream, lineHeight: 1 }}>{outro.name}</div>
        <div style={{ height: 4, width: 320 * line, background: C.terra, borderRadius: 2, margin: "14px 0" }} />
        <div style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 28, letterSpacing: 10, color: C.gold }}>{outro.role.toUpperCase()}</div>
      </div>
    </div>
  );
};

// ---------- warm light leak on section changes ----------
export const LightLeak: React.FC<P & { at: number[] }> = ({ t, at }) => {
  const a = at.find((x) => t >= x - 0.1 && t < x + 1.0);
  if (a === undefined) return null;
  const k = (t - (a - 0.1)) / 1.1;
  const o = Math.sin(Math.PI * Math.min(1, Math.max(0, k)));
  const x = interpolate(k, [0, 1], [-30, 130]);
  return <AbsoluteFill style={{ background: `radial-gradient(ellipse 45% 70% at ${x}% 30%, rgba(255,160,80,0.55), transparent 70%)`, mixBlendMode: "screen", opacity: o }} />;
};
