import { ContactShadows } from "@react-three/drei";
import { ThreeCanvas } from "@remotion/three";
import { interpolate } from "remotion";
import { springAt } from "../components/warm/Warm";
import { Block, Book, Bubble, Clock, Crayons, Moon, NoSign, P, Phone, Plate, Puzzle, Room, Scale, Studio } from "./objects";
import { Text3D } from "./Text3D";

// 3D scenes for Alk03 (El Khanssaa v3). Overlay canvases are transparent over the speaker;
// studio canvases are full-screen sets on a warm backdrop.
export const AR = "fonts/cairo-ar-900.woff";
export const NUM = "fonts/playfair-800i.woff";
export const U = 117.1; // px per unit on the z=0 plane (fov 35, camera z 26, 1920px)
export const px = (x: number, y: number) => ({ left: 540 + x * U, top: 960 - y * U });

type T = { t: number; fps: number };
const cl = (v: number) => Math.min(1, Math.max(0, v));
const inv = (t: number, a: number, b: number) => interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** pop-in transform for a 3D object: spring scale + spin, gentle float */
const usePop = (t: number, fps: number, at: number, end: number, seed = 0) => {
  const s = springAt(t, at, fps, 13, 150);
  const out = inv(t, end - 0.3, end);
  const k = s * (1 - out);
  return {
    scale: Math.max(0.0001, k),
    rotY: (1 - s) * 2.4 + Math.sin(t * 0.9 + seed) * 0.25,
    rotX: Math.sin(t * 0.7 + seed) * 0.12,
    dy: Math.sin(t * 1.3 + seed) * 0.12 + (1 - s) * -1.2,
  };
};

const Canvas: React.FC<{ children: React.ReactNode; fov?: number; z?: number; cam?: [number, number, number] }> = ({ children, fov = 35, cam = [0, 0, 26] }) => (
  <ThreeCanvas width={1080} height={1920} camera={{ fov, position: cam }} shadows gl={{ antialias: true, alpha: true }} style={{ position: "absolute", inset: 0 }}>
    <Studio />
    {children}
  </ThreeCanvas>
);

// ---------------- hook: 3D word behind the speaker ----------------
export const HookWord3D: React.FC<T & { end: number }> = ({ t, fps, end }) => {
  const s = springAt(t, 0.05, fps, 15, 110);
  const out = inv(t, end - 0.15, end + 0.35);
  return (
    <Canvas>
      <Text3D text="البديل" font={AR} size={2.45} depth={0.8} bevel={0.06} color={P.terra} sideColor={P.terraDeep} position={[0, 2.2 + (1 - s) * -3 + out * 3, -1]} rotation={[0.12, (1 - s) * 1.4 + Math.sin(t * 0.8) * 0.08, 0]} scale={Math.max(0.001, s * (1 - out))} />
    </Canvas>
  );
};

// ---------------- overlay sections ----------------
const StepTitle: React.FC<T & { n: string; title: string; start: number; end: number }> = ({ t, fps, n, title, start, end }) => {
  const a = usePop(t, fps, start, end, 1);
  const b = usePop(t, fps, start + 0.25, end, 2);
  return (
    <>
      <group position={[0, 6.55 + a.dy * 0.6, 1]} rotation={[a.rotX, a.rotY * 0.6, 0]} scale={a.scale}>
        <Text3D text={n} font={NUM} size={1.9} depth={0.6} bevel={0.05} color={P.butter} sideColor="#B7832F" />
      </group>
      <group position={[0, 4.75 + b.dy * 0.4, 1]} rotation={[b.rotX * 0.5, b.rotY * 0.3, 0]} scale={b.scale}>
        <Text3D text={title} font={AR} size={1.05} depth={0.35} bevel={0.035} color={P.cream} sideColor={P.terra} />
      </group>
    </>
  );
};

export const Overlay3D: React.FC<T> = ({ t, fps }) => {
  const show = (a: number, b: number) => t >= a - 0.05 && t < b + 0.05;
  const ob = (at: number, end: number, seed: number) => usePop(t, fps, at, end, seed);
  const cr = ob(17.5, 23.0, 1);
  const pz = ob(18.9, 23.0, 2);
  const bk = ob(20.3, 23.0, 3);
  const b1 = ob(33.9, 39.0, 4);
  const b2 = ob(35.0, 39.0, 5);
  const ns = ob(45.5, 50.3, 6);
  const pl = ob(50.5, 53.0, 7);
  const mo = ob(51.5, 53.0, 8);
  const fb = ob(64.6, 69, 9);
  return (
    <Canvas>
      {show(8.0, 12.6) && <StepTitle t={t} fps={fps} n="01" title="البديل باين" start={8.0} end={12.6} />}
      {show(23.2, 27.4) && <StepTitle t={t} fps={fps} n="02" title="شاركي معاه" start={23.2} end={27.4} />}
      {show(40.9, 45.3) && <StepTitle t={t} fps={fps} n="03" title="بلا شاشات" start={40.9} end={45.3} />}

      {show(17.4, 23.0) && (
        <>
          <group position={[-3.0, 4.9 + cr.dy, 0]} rotation={[cr.rotX + 0.2, cr.rotY, 0.2]} scale={cr.scale * 1.1}><Crayons /></group>
          <group position={[0, 6.1 + pz.dy, 0]} rotation={[pz.rotX + 0.3, pz.rotY, 0.25]} scale={pz.scale * 1.4}><Puzzle color={P.sage} /></group>
          <group position={[3.0, 4.9 + bk.dy, 0]} rotation={[bk.rotX + 0.15, bk.rotY - 0.5, 0]} scale={bk.scale * 0.95}><Book color={P.sky} open={cl((t - 20.6) / 0.8) * 0.75} pages={cl((t - 20.9) / 1.4) * 0.6} /></group>
        </>
      )}

      {show(33.8, 39.0) && (
        <>
          <group position={[-2.1, 5.2 + b1.dy * 0.6, 0]} rotation={[b1.rotX * 0.5, b1.rotY * 0.25, 0.05]} scale={b1.scale}>
            <Bubble w={3.6} h={1.35} color={P.cream} />
            <Text3D text="شنو هادا؟" font={AR} size={0.62} depth={0.12} bevel={0.01} color={P.ink} position={[0, 0.02, 0.24]} />
          </group>
          <group position={[2.0, 3.2 + b2.dy * 0.6, 0]} rotation={[b2.rotX * 0.5, b2.rotY * 0.25, -0.05]} scale={b2.scale}>
            <Bubble w={3.8} h={1.35} color={P.butter} tail="right" />
            <Text3D text="فين كيتركب؟" font={AR} size={0.6} depth={0.12} bevel={0.01} color={P.ink} position={[0, 0.02, 0.24]} />
          </group>
        </>
      )}

      {show(45.4, 50.3) && (
        <group position={[0, 5.4 + ns.dy, 0]} rotation={[ns.rotX, ns.rotY * 0.5, 0]} scale={ns.scale * 1.05}>
          <Phone dim={1} />
          <NoSign k={cl((t - 45.9) / 0.6)} />
        </group>
      )}

      {show(50.4, 53.0) && (
        <>
          <group position={[-2.4, 5.2 + pl.dy, 0]} rotation={[0.55 + pl.rotX, pl.rotY * 0.5, 0]} scale={pl.scale * 1.15}><Plate /></group>
          <group position={[2.4, 5.2 + mo.dy, 0]} rotation={[mo.rotX, mo.rotY * 0.5, 0.3]} scale={mo.scale * 1.2}><Moon /></group>
        </>
      )}

      {t > 64.5 && (
        <group position={[0, 5.4 + fb.dy, 0]} rotation={[0.25, fb.rotY * 0.5 + 0.45, 0]} scale={fb.scale * 1.1}>
          <Book color={P.terra} open={0.85 - cl((t - 66.5) / 1.2) * 0.85} pages={0.35 - cl((t - 66.3) / 1.0) * 0.35} />
        </group>
      )}
    </Canvas>
  );
};

// HTML labels under overlay objects (screen positions from px())
export const overlayLabels = [
  { start: 17.7, end: 23.0, x: -3.0, y: 3.4, text: "لعبة ملونة" },
  { start: 19.1, end: 23.0, x: 0, y: 4.6, text: "Puzzle" },
  { start: 20.5, end: 23.0, x: 3.0, y: 3.4, text: "كتاب فيه صور" },
  { start: 50.7, end: 53.0, x: -2.4, y: 3.85, text: "وقت الماكلة" },
  { start: 51.7, end: 53.0, x: 2.4, y: 3.85, text: "قبل النعاس" },
];

// ---------------- studio scenes ----------------
const Backdrop: React.FC<{ children: React.ReactNode; tone?: [string, string] }> = ({ children, tone = ["#FFF4E6", "#F2CFAE"] }) => (
  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 38%, ${tone[0]}, ${tone[1]})` }}>{children}</div>
);

export const AltScene: React.FC<T & { start: number }> = ({ t, fps, start }) => {
  const drop = springAt(t, start + 0.5, fps, 9, 120);
  const open = cl((t - start - 1.5) / 0.9);
  const cr = springAt(t, start + 2.1, fps, 12, 120);
  const bl = springAt(t, start + 2.5, fps, 10, 140);
  const orbit = (t - start) * 0.08;
  const tt = springAt(t, start + 0.1, fps, 15, 110);
  return (
    <Backdrop>
      <Canvas cam={[Math.sin(orbit) * 6, 9, 22 * Math.cos(orbit)]} fov={34}>
        <group position={[0, -1.5, 0]}>
          <Phone rotation={[-Math.PI / 2, 0, 0.35]} position={[0, 0.07, 0]} scale={1.5} />
          <group position={[0.1, 0.3 + (1 - drop) * 9, 0.2]} rotation={[-Math.PI / 2, 0, -0.2]} scale={1.45}>
            <Book color={P.terra} open={open * 0.85} pages={open * 0.5} />
          </group>
          <group position={[-3.6 + (1 - cr) * -6, 0.15, 1.6]} rotation={[-Math.PI / 2, 0, 1.2 + (1 - cr) * 6]} scale={1.1}><Crayons /></group>
          <Block color={P.sky} position={[3.2, 0.36 + (1 - bl) * 8, 1.2]} rotation={[0, 0.5 + (1 - bl) * 3, 0]} />
          <Block color={P.butter} position={[3.6, 0.36 + (1 - bl) * 11, 2.2]} rotation={[0, -0.3, 0]} />
          <Block color={P.sage} position={[3.35, 1.08 + (1 - bl) * 14, 1.7]} rotation={[0, 0.2, 0]} />
          <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={22} blur={2.4} far={8} />
        </group>
        <group position={[0, 4.4 + (1 - tt) * 3, 0]} rotation={[0.25, Math.sin(t * 0.6) * 0.1, 0]} scale={Math.max(0.001, tt)}>
          <Text3D text="البديل" font={AR} size={1.9} depth={0.7} bevel={0.05} color={P.terra} sideColor={P.terraDeep} />
        </group>
      </Canvas>
    </Backdrop>
  );
};

export const FlipScene: React.FC<T & { start: number }> = ({ t, fps, start }) => {
  const ent = springAt(t, start, fps, 14, 120);
  const flip = interpolate(t, [start + 1.0, start + 1.9], [0, Math.PI], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => x * x * (3 - 2 * x) });
  const isBook = flip > Math.PI / 2;
  const open = cl((t - start - 2.2) / 0.9);
  return (
    <Backdrop tone={["#FFF6EA", "#EED3B8"]}>
      <Canvas>
        <group position={[0, -0.6 + (1 - ent) * -8, 0]} rotation={[0.12, flip + Math.sin(t * 0.7) * 0.12 + (isBook ? Math.PI : 0), 0]} scale={2.2}>
          {isBook ? <Book color={P.terra} open={open * 0.7} pages={open * 0.55} rotation={[0, 0.25, 0]} /> : <Phone />}
        </group>
        <ContactShadows position={[0, -3.4, 0]} opacity={0.4} scale={14} blur={2.6} far={6} />
      </Canvas>
    </Backdrop>
  );
};

export const ClockScene: React.FC<T & { start: number }> = ({ t, fps, start }) => {
  const ent = springAt(t, start, fps, 13, 120);
  const min = interpolate(t, [start + 0.4, start + 2.4], [0, 5], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x) => 1 - Math.pow(1 - x, 3) });
  const ring = t > start + 2.4 ? Math.sin((t - start - 2.4) * 40) * 0.06 * Math.max(0, 1 - (t - start - 2.4) * 2) : 0;
  const lbl = springAt(t, start + 0.8, fps, 14, 130);
  return (
    <Backdrop tone={["#FFF6EA", "#E9D5BE"]}>
      <Canvas>
        <group position={[0, 1.4, 0]} rotation={[0.08, Math.sin(t * 0.6) * 0.25 + (1 - ent) * 2, ring]} scale={Math.max(0.001, ent) * 2.3}>
          <Clock minutes={min} />
        </group>
        <group position={[0, -3.6, 1]} scale={Math.max(0.001, lbl)} rotation={[0.1, (1 - lbl) * 1.2, 0]}>
          <Text3D text="5" font={NUM} size={2.0} depth={0.6} bevel={0.05} color={P.butter} sideColor="#B7832F" position={[3.3, 0.05, 0]} />
          <Text3D text="دقايق معاه" font={AR} size={0.95} depth={0.35} bevel={0.03} color={P.terra} sideColor={P.terraDeep} position={[-0.75, 0, 0]} />
        </group>
        <ContactShadows position={[0, -5.6, 0]} opacity={0.35} scale={16} blur={2.6} far={6} />
      </Canvas>
    </Backdrop>
  );
};

export const RoomScene: React.FC<T & { start: number }> = ({ t, fps, start }) => {
  const k = cl((t - start - 0.3) / 2.2);
  const orbit = -0.65 + (t - start) * 0.07;
  const tt = springAt(t, start + 0.2, fps, 15, 110);
  return (
    <Backdrop tone={["#FFF4E6", "#EBC9A7"]}>
      <Canvas cam={[Math.sin(orbit) * 15, 10, Math.cos(orbit) * 15]} fov={38}>
        <group position={[0, -2.2, 0]}>
          <Room k={k} />
          <ContactShadows position={[0, -0.31, 0]} opacity={0.4} scale={14} blur={2.4} far={6} />
        </group>
        <group position={[0, 3.6, 0]} rotation={[-0.35, 0, 0]} scale={Math.max(0.001, tt)}>
          <group rotation={[0, Math.atan2(Math.sin(orbit), Math.cos(orbit)), 0]}>
            <Text3D text="ركن القراية" font={AR} size={0.95} depth={0.45} bevel={0.04} color={P.terra} sideColor={P.terraDeep} />
          </group>
        </group>
      </Canvas>
    </Backdrop>
  );
};

export const ScaleScene: React.FC<T & { start: number }> = ({ t, fps, start }) => {
  const ent = springAt(t, start, fps, 15, 110);
  const phoneIn = springAt(t, start + 0.4, fps, 11, 140);
  const books = [start + 2.3, start + 2.7, start + 3.1].map((a) => springAt(t, a, fps, 10, 160));
  const target = -0.22 + books.reduce((s, b) => s + b, 0) * 0.17;
  const tilt = target + Math.sin(t * 2) * 0.01;
  return (
    <Backdrop tone={["#FFF6EA", "#ECD3B7"]}>
      <Canvas>
        <group position={[0, -0.8 + (1 - ent) * -10, 0]} rotation={[0.06, Math.sin(t * 0.4) * 0.15, 0]} scale={1.35}>
          <Scale
            tilt={tilt}
            left={<group position={[0, 0.07 + (1 - phoneIn) * 6, 0]} rotation={[-Math.PI / 2, 0, 0.3]} scale={0.55}><Phone /></group>}
            right={
              <>
                {books.map((b, i) => (
                  <group key={i} position={[0, 0.12 + i * 0.27 + (1 - b) * 7, 0]} rotation={[-Math.PI / 2, 0, 0.2 - i * 0.35]} scale={0.5}>
                    <Book color={[P.terra, P.sky, P.sage][i]} />
                  </group>
                ))}
              </>
            }
          />
        </group>
        <ContactShadows position={[0, -3.0, 0]} opacity={0.4} scale={16} blur={2.6} far={6} />
      </Canvas>
    </Backdrop>
  );
};
