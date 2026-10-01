import { interpolate } from "remotion";
import { theme, type SceneId } from "../../data/insp01";
import { fade, pop } from "./anim";
import { Glyph, type GlyphName } from "./Glyph";

// Card content for each scene. Every element appears at the moment its idea is said.
type P = { t: number; fps: number };

const In: React.FC<P & { at: number; children: React.ReactNode; dy?: number; style?: React.CSSProperties }> = ({ t, fps, at, children, dy = 24, style }) => {
  const s = pop(t, at, fps);
  return <div style={{ opacity: Math.min(1, s * 1.4), transform: `translateY(${(1 - s) * dy}px) scale(${0.85 + 0.15 * s})`, ...style }}>{children}</div>;
};

const Label: React.FC<{ icon: GlyphName; text: string }> = ({ icon, text }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, color: theme.gray, fontFamily: theme.font, fontWeight: 600, fontSize: 24, letterSpacing: 4, textTransform: "uppercase" }}>
    <Glyph name={icon} size={26} color={theme.blue} fill={icon === "tag"} />
    {text}
  </div>
);

const Big: React.FC<{ children: React.ReactNode; size?: number; color?: string }> = ({ children, size = 64, color = theme.navy }) => (
  <div style={{ fontFamily: theme.font, fontWeight: 700, fontSize: size, color, lineHeight: 1.1 }}>{children}</div>
);

const Pill: React.FC<{ children: React.ReactNode; color?: string; outline?: boolean }> = ({ children, color = theme.blue, outline }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 22px",
      borderRadius: 12,
      fontFamily: theme.font,
      fontWeight: 700,
      fontSize: 30,
      color: outline ? color : "white",
      background: outline ? "white" : color,
      border: `3px solid ${color}`,
      boxShadow: outline ? "none" : "0 5px 0 rgba(20,40,90,0.2)",
    }}
  >
    {children}
  </div>
);

const Circle: React.FC<{ icon: GlyphName; size?: number; bg?: string; color?: string }> = ({ icon, size = 150, bg = "#F3EDE2", color = theme.navy }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <Glyph name={icon} size={size * 0.5} color={color} />
  </div>
);

const Row: React.FC<{ children: React.ReactNode; gap?: number; style?: React.CSSProperties }> = ({ children, gap = 24, style }) => (
  <div style={{ display: "flex", alignItems: "center", gap, ...style }}>{children}</div>
);

const Center: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", inset: 0, padding: 44, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 26 }}>{children}</div>
);

const Waveform: React.FC<{ t: number }> = ({ t }) => (
  <Row gap={5}>
    {Array.from({ length: 18 }).map((_, i) => {
      const h = 8 + Math.abs(Math.sin(t * 9 + i * 1.7) * Math.cos(t * 4 + i)) * 40;
      return <div key={i} style={{ width: 6, height: h, borderRadius: 3, background: theme.blue, opacity: i % 3 === 0 ? 0.5 : 1 }} />;
    })}
  </Row>
);

const Intro: React.FC<P> = ({ t, fps }) => (
  <>
    <div style={{ position: "absolute", top: 36, left: 44, right: 44, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Row gap={16}>
        <div style={{ width: 60, height: 60, borderRadius: 12, background: theme.blue, color: "white", fontFamily: theme.font, fontWeight: 700, fontSize: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>D</div>
        <Big size={36}>Doctora</Big>
        <div style={{ fontFamily: theme.font, fontSize: 22, letterSpacing: 4, color: theme.gray, fontWeight: 600 }}>KATGOUL</div>
      </Row>
      <Waveform t={t} />
    </div>
    <div style={{ position: "absolute", top: 140, left: 44, right: 44, bottom: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26 }}>
      <Row gap={30}>
        {Array.from({ length: 6 }).map((_, i) => (
          <In key={i} t={t} fps={fps} at={1.5 + i * 0.12}>
            <Glyph name="chair" size={70} color={t > 4.4 ? "#C9CED8" : theme.navy} />
          </In>
        ))}
      </Row>
      <In t={t} fps={fps} at={4.4}>
        <Row gap={18}>
          <Big size={52}>Cabinet:</Big>
          <Big size={52} color={theme.blue}>khawi?</Big>
          <Pill color={theme.red}>0 patients</Pill>
        </Row>
      </In>
    </div>
  </>
);

const Medecins: React.FC<P> = ({ t, fps }) => {
  const suffering = [0, 1, 2, 4, 5, 6, 8, 9, 10];
  return (
    <div style={{ position: "absolute", inset: 0, padding: "36px 44px", display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
      <Label icon="tag" text="Les médecins" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 90px)", gap: "14px 26px" }}>
        {Array.from({ length: 12 }).map((_, i) => {
          const hit = suffering.includes(i) && t > 8.3 + i * 0.04;
          const later = !suffering.includes(i) && t > 11.5;
          return (
            <In key={i} t={t} fps={fps} at={7.6 + i * 0.08} style={{ position: "relative" }}>
              <div style={{ width: 90, height: 90, borderRadius: 20, background: hit ? theme.blue : theme.blueSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Glyph name="doctor" size={56} color={hit ? "white" : theme.blue} />
              </div>
              {later && (
                <div style={{ position: "absolute", right: -10, top: -10, background: theme.red, borderRadius: "50%", padding: 4, transform: `scale(${pop(t, 11.5, fps)})` }}>
                  <Glyph name="clock" size={26} color="white" />
                </div>
              )}
            </In>
          );
        })}
      </div>
      <div style={{ position: "relative", height: 60, width: "100%" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", opacity: 1 - fade(t, 9.9, 10.1) }}>
          <In t={t} fps={fps} at={8.6}>
            <Big size={40}>kay3aniw men <span style={{ color: theme.blue }}>nefs l7aja</span></Big>
          </In>
        </div>
        <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center" }}>
          <In t={t} fps={fps} at={11.5}>
            <Pill color={theme.red}>
              <Glyph name="clock" size={30} color="white" /> men b3d
            </Pill>
          </In>
        </div>
      </div>
    </div>
  );
};

const Experience: React.FC<P> = ({ t, fps }) => {
  const u = fade(t, 16.4, 17.0);
  return (
    <div style={{ position: "absolute", inset: 0, padding: 44, display: "flex", alignItems: "center", gap: 40 }}>
      <In t={t} fps={fps} at={13.4}>
        <Circle icon="star" />
      </In>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <In t={t} fps={fps} at={14.0}>
          <Label icon="tag" text="Ila makontich 3arfa" />
        </In>
        <In t={t} fps={fps} at={16.0}>
          <div style={{ fontFamily: theme.font, fontSize: 30, color: theme.gray, fontWeight: 600 }}>momkin 3endek</div>
          <Big size={66}>l'expérience</Big>
          <div style={{ height: 6, borderRadius: 3, background: theme.blue, width: `${u * 100}%`, marginTop: 6 }} />
        </In>
        <In t={t} fps={fps} at={18.1}>
          <Pill>
            <Glyph name="check" size={28} color="white" /> mtafe9 m3ak
          </Pill>
        </In>
      </div>
    </div>
  );
};

const Resultats: React.FC<P> = ({ t, fps }) => {
  const bars = [0.35, 0.55, 0.75, 1];
  return (
    <div style={{ position: "absolute", inset: 0, padding: "36px 44px", display: "flex", flexDirection: "column", gap: 18 }}>
      <Label icon="tag" text="Nnata2ij" />
      <Row gap={40} style={{ flex: 1, alignItems: "flex-end" }}>
        <Row gap={22} style={{ alignItems: "flex-end", height: 250 }}>
          {bars.map((h, i) => {
            const g = pop(t, 20.4 + i * 0.3, fps, 120, 14);
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ width: 70, height: 230 * h * g, borderRadius: "10px 10px 4px 4px", background: i === 3 ? theme.blue : theme.navy, opacity: 0.35 + 0.65 * (i / 3) }} />
              </div>
            );
          })}
        </Row>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingBottom: 10 }}>
          <In t={t} fps={fps} at={22.6}>
            <Row gap={16}>
              <Circle icon="users" size={96} bg={theme.blueSoft} color={theme.blue} />
              <Big size={44}>les patients</Big>
            </Row>
          </In>
          <In t={t} fps={fps} at={23.2}>
            <Pill>
              <Glyph name="check" size={28} color="white" /> zwinin
            </Pill>
          </In>
        </div>
      </Row>
    </div>
  );
};

const Cabinet: React.FC<P> = ({ t, fps }) => {
  const x = pop(t, 28.5, fps, 300, 12);
  const Outsider = ({ i }: { i: number }) => (
    <In t={t} fps={fps} at={27.9 + i * 0.15} style={{ position: "relative" }}>
      <Glyph name="users" size={80} color="#C9CED8" />
      <div style={{ position: "absolute", right: -12, top: -12, width: 40, height: 40, borderRadius: "50%", background: theme.red, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${x})` }}>
        <Glyph name="x" size={24} color="white" />
      </div>
    </In>
  );
  return (
    <Center>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 60 }}>
        <Outsider i={0} />
        <Outsider i={1} />
        <In t={t} fps={fps} at={26.5}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <Circle icon="building" size={140} bg={theme.blueSoft} color={theme.blue} />
            <div style={{ fontFamily: theme.font, fontWeight: 600, fontSize: 28, color: theme.navy }}>le cabinet</div>
          </div>
        </In>
        <Outsider i={2} />
        <Outsider i={3} />
      </div>
      <In t={t} fps={fps} at={28.6}>
        <Big size={44} color={theme.red}>7ta wa7ed makay3erfek</Big>
      </In>
    </Center>
  );
};

const Expertise: React.FC<P> = ({ t, fps }) => {
  const a = fade(t, 32.0, 32.6);
  return (
    <Center>
      <Row gap={20}>
        <In t={t} fps={fps} at={31.5}>
          <Row gap={14}>
            <Glyph name="users" size={64} color={theme.blue} />
            <Big size={60}>nnas</Big>
          </Row>
        </In>
        <div style={{ width: 160, height: 6, background: theme.blue, borderRadius: 3, transformOrigin: "left", transform: `scaleX(${a})`, position: "relative" }}>
          <div style={{ position: "absolute", right: -18, top: -14, opacity: a }}>
            <Glyph name="arrow" size={34} color={theme.blue} />
          </div>
        </div>
        <In t={t} fps={fps} at={32.4}>
          <Row gap={14}>
            <Glyph name="star" size={60} color={theme.blue} fill />
            <Big size={60}>l'expertise</Big>
          </Row>
        </In>
      </Row>
      <In t={t} fps={fps} at={32.6}>
        <Pill>m7tajin</Pill>
      </In>
      <In t={t} fps={fps} at={33.6}>
        <Big size={46}>
          walakin: <span style={{ color: theme.blue }}>fin yl9awha?</span>
        </Big>
      </In>
    </Center>
  );
};

const Search: React.FC<P> = ({ t, fps }) => {
  const q = "doktor";
  const typed = q.slice(0, Math.floor(interpolate(t, [36.7, 37.6], [0, q.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const solved = t > 38.6;
  return (
    <div style={{ position: "absolute", inset: 0, padding: "36px 44px", display: "flex", flexDirection: "column", gap: 22 }}>
      <Row gap={14} style={{ justifyContent: "space-between" }}>
        <Label icon="tag" text="Bzaf dyal patients" />
        <Row gap={8}>
          {Array.from({ length: 5 }).map((_, i) => (
            <In key={i} t={t} fps={fps} at={35.6 + i * 0.1}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: theme.blueSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Glyph name="users" size={26} color={theme.blue} />
              </div>
            </In>
          ))}
        </Row>
      </Row>
      <In t={t} fps={fps} at={36.5}>
        <Row gap={16} style={{ border: `3px solid ${solved ? theme.blue : theme.line}`, borderRadius: 18, padding: "16px 24px", background: "#FBFAF7" }}>
          <Glyph name="search" size={40} color={theme.blue} />
          <div style={{ fontFamily: theme.font, fontWeight: 600, fontSize: 42, color: theme.navy }}>
            {typed}
            <span style={{ opacity: Math.floor(t * 3) % 2 ? 1 : 0, color: theme.blue }}>|</span>
          </div>
        </Row>
      </In>
      <div style={{ position: "relative", flex: 1 }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", gap: 12, opacity: 1 - fade(t, 38.4, 38.6) }}>
          {[0, 1].map((i) => (
            <In key={i} t={t} fps={fps} at={37.7 + i * 0.15}>
              <div style={{ height: 34, width: `${80 - i * 25}%`, borderRadius: 10, background: "#EEE8DD" }} />
            </In>
          ))}
        </div>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <In t={t} fps={fps} at={38.6}>
            <Row gap={20}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#1BA784", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${pop(t, 38.8, fps, 300, 9)})` }}>
                <Glyph name="check" size={44} color="white" />
              </div>
              <Big size={58} color={theme.blue}>la solution</Big>
            </Row>
          </In>
        </div>
      </div>
    </div>
  );
};

const Contenu: React.FC<P> = ({ t, fps }) => {
  const x = pop(t, 47.6, fps, 260, 14);
  return (
    <div style={{ position: "absolute", inset: 0, padding: "36px 44px", display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
      <In t={t} fps={fps} at={45.0}>
        <Label icon="tag" text="Création de contenu" />
      </In>
      <Row gap={26}>
        {[0, 1, 2].map((i) => (
          <In key={i} t={t} fps={fps} at={45.9 + i * 0.15}>
            <div style={{ width: 150, height: 200, borderRadius: 18, background: i === 1 ? theme.blue : theme.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Glyph name="play" size={56} color="white" />
            </div>
          </In>
        ))}
        <In t={t} fps={fps} at={47.2}>
          <div style={{ position: "relative", width: 150, height: 150, borderRadius: "50%", background: "#FCE9E7", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 20 }}>
            <Glyph name="share" size={72} color={theme.red} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${x})` }}>
              <Glyph name="x" size={150} color={theme.red} />
            </div>
          </div>
        </In>
      </Row>
    </div>
  );
};

const Etapes: React.FC<P> = ({ t, fps }) => {
  const at = [51.1, 51.7, 52.3];
  const line = fade(t, 51.1, 52.3);
  return (
    <Center>
      <In t={t} fps={fps} at={50.6}>
        <Label icon="tag" text="Les étapes" />
      </In>
      <div style={{ position: "relative", display: "flex", gap: 150, alignItems: "center" }}>
        <div style={{ position: "absolute", left: 60, right: 60, top: "50%", height: 8, marginTop: -4, background: theme.line, borderRadius: 4 }} />
        <div style={{ position: "absolute", left: 60, width: `calc((100% - 120px) * ${line})`, top: "50%", height: 8, marginTop: -4, background: theme.blue, borderRadius: 4 }} />
        {at.map((a, i) => {
          const on = t >= a;
          return (
            <In key={i} t={t} fps={fps} at={50.8 + i * 0.1}>
              <div style={{ width: 120, height: 120, borderRadius: "50%", background: on ? theme.blue : "white", border: `5px solid ${on ? theme.blue : theme.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: theme.font, fontWeight: 700, fontSize: 52, color: on ? "white" : theme.gray, transform: `scale(${on ? 1 + 0.15 * (1 - pop(t, a, fps, 300, 10)) : 1})` }}>
                {i + 1}
              </div>
            </In>
          );
        })}
      </div>
    </Center>
  );
};

const Cta: React.FC<P> = ({ t, fps }) => {
  const pulse = 1 + Math.max(0, Math.sin((t - 60.5) * 5)) * 0.04;
  return (
    <Center>
      <In t={t} fps={fps} at={59.7}>
        <Label icon="tag" text="4media" />
      </In>
      <In t={t} fps={fps} at={59.9}>
        <div style={{ textAlign: "center" }}>
          <Big size={92}>Réservez</Big>
          <Big size={92} color={theme.blue}>maintenant</Big>
        </div>
      </In>
      <In t={t} fps={fps} at={60.5}>
        <div style={{ transform: `scale(${pulse})` }}>
          <Pill>
            <span style={{ fontSize: 44 }}>4media.ma</span>
            <Glyph name="arrow" size={40} color="white" />
          </Pill>
        </div>
      </In>
    </Center>
  );
};

export const SceneContent: React.FC<P & { id: SceneId }> = ({ id, ...p }) => {
  switch (id) {
    case "intro": return <Intro {...p} />;
    case "medecins": return <Medecins {...p} />;
    case "experience": return <Experience {...p} />;
    case "resultats": return <Resultats {...p} />;
    case "cabinet": return <Cabinet {...p} />;
    case "expertise": return <Expertise {...p} />;
    case "search": return <Search {...p} />;
    case "contenu": return <Contenu {...p} />;
    case "etapes": return <Etapes {...p} />;
    case "cta": return <Cta {...p} />;
  }
};
