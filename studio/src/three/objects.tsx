import { RoundedBox } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { ThreeElements } from "@react-three/fiber";

type G = ThreeElements["group"];

// Clay-premium 3D object kit for Remotion + react-three-fiber (procedural, no downloads).
export const P = {
  terra: "#E8743B",
  terraDeep: "#C4561F",
  sage: "#7FB58F",
  sky: "#6FA8DC",
  butter: "#F2C14E",
  cream: "#FFF4E6",
  paper: "#FBF7EF",
  ink: "#2A2420",
  phone: "#23262C",
  red: "#E5484D",
  wood: "#C98B5A",
};

const mat = (color: string, rough = 0.42, metal = 0) => <meshStandardMaterial color={color} roughness={rough} metalness={metal} />;

/** soft studio lighting + PBR room environment */
export const Studio: React.FC<{ envIntensity?: number }> = ({ envIntensity = 0.9 }) => {
  const { gl, scene } = useThree();
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    return pm.fromScene(new RoomEnvironment(), 0.04).texture;
  }, [gl]);
  useEffect(() => {
    scene.environment = env;
    scene.environmentIntensity = envIntensity;
  }, [scene, env, envIntensity]);
  return (
    <>
      <hemisphereLight args={["#FFF6EC", "#E9C9A9", 0.7]} />
      <directionalLight position={[4, 7, 6]} intensity={1.8} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} />
      <directionalLight position={[-5, 2, 3]} intensity={0.5} color="#FFD9B8" />
    </>
  );
};

/** hardcover book; open: 0 closed .. 1 front cover fully open */
export const Book: React.FC<{ color?: string; open?: number; pages?: number } & G> = ({ color = P.terra, open = 0, pages = 0, ...g }) => {
  const W = 1.5;
  const H = 2;
  const T = 0.32;
  return (
    <group {...g}>
      <RoundedBox args={[W, H, 0.06]} radius={0.03} position={[0, 0, -T / 2]} castShadow>{mat(color, 0.5)}</RoundedBox>
      <RoundedBox args={[0.08, H, T + 0.04]} radius={0.03} position={[-W / 2, 0, 0]} castShadow>{mat(color, 0.5)}</RoundedBox>
      <mesh position={[0.02, 0, 0]} castShadow>
        <boxGeometry args={[W - 0.1, H - 0.1, T - 0.06]} />
        {mat(P.paper, 0.85)}
      </mesh>
      {Array.from({ length: Math.round(pages * 6) }).map((_, i) => (
        <group key={i} position={[-W / 2 + 0.04, 0, T / 2 - 0.04]} rotation={[0, -Math.PI * Math.min(1, pages * 1.2 - i * 0.12), 0]}>
          <mesh position={[(W - 0.12) / 2, 0, 0]}>
            <boxGeometry args={[W - 0.12, H - 0.12, 0.008]} />
            {mat(P.paper, 0.9)}
          </mesh>
        </group>
      ))}
      <group position={[-W / 2, 0, T / 2]} rotation={[0, -open * Math.PI * 0.92, 0]}>
        <RoundedBox args={[W, H, 0.06]} radius={0.03} position={[W / 2, 0, 0]} castShadow>{mat(color, 0.5)}</RoundedBox>
        <mesh position={[W / 2, 0.25, 0.035]}>
          <circleGeometry args={[0.32, 48]} />
          {mat(P.butter, 0.4)}
        </mesh>
        <RoundedBox args={[0.9, 0.12, 0.02]} radius={0.04} position={[W / 2, -0.45, 0.04]}>{mat(P.cream, 0.5)}</RoundedBox>
        <RoundedBox args={[0.6, 0.1, 0.02]} radius={0.04} position={[W / 2, -0.65, 0.04]}>{mat(P.cream, 0.5)}</RoundedBox>
      </group>
    </group>
  );
};

/** smartphone with glowing screen */
export const Phone: React.FC<{ glow?: number; dim?: number } & G> = ({ glow = 1, dim = 0, ...g }) => {
  const screen = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 512;
    const x = c.getContext("2d")!;
    const gr = x.createLinearGradient(0, 0, 256, 512);
    gr.addColorStop(0, "#7B61FF");
    gr.addColorStop(0.5, "#FF5FA2");
    gr.addColorStop(1, "#FFB443");
    x.fillStyle = gr;
    x.fillRect(0, 0, 256, 512);
    x.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) {
      x.beginPath();
      x.roundRect(28 + i * 54, 70 + j * 70, 40, 40, 10);
      x.fill();
    }
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
  }, []);
  return (
    <group {...g}>
      <RoundedBox args={[1.05, 2.1, 0.12]} radius={0.12} smoothness={6} castShadow>{mat(P.phone, 0.25, 0.4)}</RoundedBox>
      <mesh position={[0, 0, 0.062]}>
        <planeGeometry args={[0.93, 1.96]} />
        <meshStandardMaterial map={screen} emissive="#ffffff" emissiveMap={screen} emissiveIntensity={0.55 * glow * (1 - dim)} roughness={0.2} color={dim ? "#555" : "#fff"} />
      </mesh>
      <RoundedBox args={[0.3, 0.06, 0.02]} radius={0.03} position={[0, 0.9, 0.07]}>{mat("#0E0F12", 0.3)}</RoundedBox>
    </group>
  );
};

const puzzleShape = () => {
  const s = new THREE.Shape();
  const k = 0.5;
  s.moveTo(-k, -k);
  s.lineTo(-0.15, -k);
  s.absarc(0, -k, 0.15, Math.PI, 0, false);
  s.lineTo(k, -k);
  s.lineTo(k, -0.15);
  s.absarc(k, 0, 0.15, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(k, k);
  s.lineTo(0.15, k);
  s.absarc(0, k, 0.15, 0, Math.PI, true);
  s.lineTo(-k, k);
  s.lineTo(-k, -k);
  return s;
};
export const Puzzle: React.FC<{ color?: string } & G> = ({ color = P.sage, ...g }) => {
  const geo = useMemo(() => new THREE.ExtrudeGeometry(puzzleShape(), { depth: 0.22, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 6, curveSegments: 24 }), []);
  return (
    <group {...g}>
      <mesh geometry={geo} castShadow position={[0, 0, -0.11]}>{mat(color, 0.38)}</mesh>
    </group>
  );
};

export const Crayon: React.FC<{ color: string } & G> = ({ color, ...g }) => (
  <group {...g}>
    <mesh castShadow>
      <cylinderGeometry args={[0.13, 0.13, 1.4, 32]} />
      {mat(color, 0.45)}
    </mesh>
    <mesh position={[0, 0.82, 0]} castShadow>
      <coneGeometry args={[0.13, 0.26, 32]} />
      {mat(color, 0.45)}
    </mesh>
    <mesh position={[0, 0.1, 0]}>
      <cylinderGeometry args={[0.135, 0.135, 0.7, 32]} />
      {mat(P.paper, 0.8)}
    </mesh>
  </group>
);

export const Crayons: React.FC<G> = (g) => (
  <group {...g}>
    <Crayon color={P.terra} rotation={[0, 0, 0.25]} position={[-0.35, 0, 0]} />
    <Crayon color={P.sky} position={[0, 0.1, 0.1]} />
    <Crayon color={P.butter} rotation={[0, 0, -0.25]} position={[0.35, 0, 0]} />
  </group>
);

export const Block: React.FC<{ color: string } & G> = ({ color, ...g }) => (
  <group {...g}>
    <RoundedBox args={[0.7, 0.7, 0.7]} radius={0.09} smoothness={5} castShadow>{mat(color, 0.4)}</RoundedBox>
    <RoundedBox args={[0.42, 0.42, 0.05]} radius={0.06} position={[0, 0, 0.35]}>{mat(P.cream, 0.4)}</RoundedBox>
  </group>
);

export const Clock: React.FC<{ minutes: number } & G> = ({ minutes, ...g }) => (
  <group {...g}>
    <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[1.25, 1.25, 0.3, 64]} />
      {mat(P.terra, 0.4)}
    </mesh>
    <mesh position={[0, 0, 0.16]}>
      <circleGeometry args={[1.08, 64]} />
      {mat(P.cream, 0.6)}
    </mesh>
    <mesh position={[0, 0, 0.16]} rotation={[0, 0, Math.PI / 2 - (5 / 60) * Math.PI * 2]}>
      <ringGeometry args={[0.92, 1.0, 64, 1, 0, (Math.min(minutes, 5) / 60) * Math.PI * 2]} />
      <meshStandardMaterial color={P.sage} roughness={0.5} />
    </mesh>
    {Array.from({ length: 12 }).map((_, i) => (
      <mesh key={i} position={[Math.sin((i / 12) * Math.PI * 2) * 0.85, Math.cos((i / 12) * Math.PI * 2) * 0.85, 0.18]}>
        <circleGeometry args={[i % 3 === 0 ? 0.06 : 0.035, 16]} />
        {mat(P.ink, 0.5)}
      </mesh>
    ))}
    <group rotation={[0, 0, -(minutes / 60) * Math.PI * 2]} position={[0, 0, 0.2]}>
      <RoundedBox args={[0.07, 0.85, 0.04]} radius={0.02} position={[0, 0.38, 0]}>{mat(P.ink, 0.4)}</RoundedBox>
    </group>
    <group rotation={[0, 0, -(minutes / 720) * Math.PI * 2 - 0.5]} position={[0, 0, 0.22]}>
      <RoundedBox args={[0.09, 0.55, 0.04]} radius={0.02} position={[0, 0.24, 0]}>{mat(P.terraDeep, 0.4)}</RoundedBox>
    </group>
    <mesh position={[0, 0, 0.25]}>
      <cylinderGeometry args={[0.08, 0.08, 0.05, 24]} />
      {mat(P.ink, 0.3)}
    </mesh>
    {[-0.7, 0.7].map((x) => (
      <mesh key={x} position={[x, 1.25, -0.05]} castShadow>
        <sphereGeometry args={[0.25, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {mat(P.butter, 0.35, 0.2)}
      </mesh>
    ))}
  </group>
);

export const NoSign: React.FC<{ k: number } & G> = ({ k, ...g }) => (
  <group {...g}>
    <mesh scale={k}>
      <torusGeometry args={[1.45, 0.14, 24, 96]} />
      {mat(P.red, 0.35)}
    </mesh>
    <mesh rotation={[0, 0, Math.PI / 4]} scale={[1, k, 1]} position={[0, 0, 0.05]}>
      <boxGeometry args={[0.26, 2.9, 0.26]} />
      {mat(P.red, 0.35)}
    </mesh>
  </group>
);

export const Plate: React.FC<G> = (g) => (
  <group {...g}>
    <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.95, 0.7, 0.12, 64]} />
      {mat(P.paper, 0.35)}
    </mesh>
    <mesh position={[0, 0, 0.07]}>
      <circleGeometry args={[0.6, 48]} />
      {mat(P.cream, 0.5)}
    </mesh>
    <mesh position={[0.15, 0.05, 0.12]} castShadow>
      <sphereGeometry args={[0.22, 32, 16]} />
      {mat(P.sage, 0.5)}
    </mesh>
    <mesh position={[-0.2, -0.1, 0.12]} castShadow>
      <sphereGeometry args={[0.18, 32, 16]} />
      {mat(P.terra, 0.5)}
    </mesh>
    <RoundedBox args={[0.1, 1.4, 0.06]} radius={0.03} position={[-1.15, 0, 0]} castShadow>{mat("#B9BEC6", 0.25, 0.8)}</RoundedBox>
    <RoundedBox args={[0.12, 1.4, 0.06]} radius={0.03} position={[1.15, 0, 0]} castShadow>{mat("#B9BEC6", 0.25, 0.8)}</RoundedBox>
  </group>
);

export const Moon: React.FC<G> = (g) => {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.absarc(0, 0, 1, Math.PI * 0.35, Math.PI * 1.65, false);
    s.absarc(0.45, 0, 0.82, Math.PI * 1.55, Math.PI * 0.45, true);
    return new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 6, curveSegments: 48 });
  }, []);
  return (
    <group {...g}>
      <mesh geometry={geo} castShadow position={[0, 0, -0.15]}>{mat(P.butter, 0.35, 0.1)}</mesh>
      {[[1.2, 0.8], [1.5, -0.3], [0.9, -1]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0]}>
          <octahedronGeometry args={[0.12 - i * 0.02]} />
          {mat(P.cream, 0.3)}
        </mesh>
      ))}
    </group>
  );
};

export const Bubble: React.FC<{ color?: string; w?: number; h?: number; tail?: "left" | "right" } & G> = ({ color = P.cream, w = 3.2, h = 1.3, tail = "left", ...g }) => {
  const geo = useMemo(() => {
    const r = 0.5;
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    const tx = tail === "left" ? -w / 2 + 0.9 : w / 2 - 1.3;
    s.lineTo(tx, -h / 2);
    s.lineTo(tail === "left" ? tx - 0.45 : tx + 0.85, -h / 2 - 0.45);
    s.lineTo(tx + 0.4, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return new THREE.ExtrudeGeometry(s, { depth: 0.25, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.07, bevelSegments: 6, curveSegments: 24 });
  }, [w, h, tail]);
  return (
    <group {...g}>
      <mesh geometry={geo} castShadow position={[0, 0, -0.12]}>{mat(color, 0.4)}</mesh>
    </group>
  );
};

/** balance scale; tilt in radians (+ = right side down) */
export const Scale: React.FC<{ tilt: number; left: React.ReactNode; right: React.ReactNode } & G> = ({ tilt, left, right, ...g }) => {
  const arm = 2.4;
  const pan = (x: number, content: React.ReactNode) => {
    const y = Math.sin(tilt) * x;
    return (
      <group position={[Math.cos(tilt) * x, 1.8 - y, 0]}>
        <mesh position={[0, -0.6, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.2, 8]} />
          {mat("#9AA0A8", 0.3, 0.7)}
        </mesh>
        <mesh position={[0, -1.2, 0]} castShadow>
          <cylinderGeometry args={[1.0, 0.85, 0.12, 48]} />
          {mat(P.butter, 0.3, 0.35)}
        </mesh>
        <group position={[0, -1.14, 0]}>{content}</group>
      </group>
    );
  };
  return (
    <group {...g}>
      <mesh position={[0, -1.5, 0]} castShadow>
        <cylinderGeometry args={[0.9, 1.1, 0.25, 48]} />
        {mat(P.wood, 0.5)}
      </mesh>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.13, 3.3, 24]} />
        {mat(P.wood, 0.45)}
      </mesh>
      <group position={[0, 1.8, 0]} rotation={[0, 0, -tilt]}>
        <RoundedBox args={[arm * 2 + 0.3, 0.16, 0.16]} radius={0.06} castShadow>{mat(P.wood, 0.45)}</RoundedBox>
      </group>
      <mesh position={[0, 1.95, 0]}>
        <sphereGeometry args={[0.18, 32, 16]} />
        {mat(P.butter, 0.3, 0.4)}
      </mesh>
      <group position={[0, 0, 0]}>
        {pan(-arm, left)}
        {pan(arm, right)}
      </group>
    </group>
  );
};

/** cosy reading corner diorama */
export const Room: React.FC<{ k: number } & G> = ({ k, ...g }) => {
  const pop = (i: number) => Math.min(1, Math.max(0, k * 6 - i));
  const books = [P.terra, P.sky, P.sage, P.butter, P.terraDeep, P.sky];
  return (
    <group {...g}>
      <RoundedBox args={[5, 0.3, 5]} radius={0.08} position={[0, -0.15, 0]} receiveShadow>{mat("#F1DCC4", 0.7)}</RoundedBox>
      <RoundedBox args={[5, 3.6, 0.3]} radius={0.08} position={[0, 1.8, -2.35]} receiveShadow>{mat("#F7E8D6", 0.8)}</RoundedBox>
      <RoundedBox args={[0.3, 3.6, 5]} radius={0.08} position={[-2.35, 1.8, 0]} receiveShadow>{mat("#F3E0CB", 0.8)}</RoundedBox>
      <mesh position={[0.4, 0.02, 0.6]} rotation={[-Math.PI / 2, 0, 0]} scale={pop(0)} receiveShadow>
        <circleGeometry args={[1.5, 64]} />
        {mat(P.sage, 0.9)}
      </mesh>
      <group position={[-1.6, 0, -1.7]} scale={pop(1)}>
        <RoundedBox args={[1.4, 2.4, 0.7]} radius={0.06} position={[0, 1.2, 0]} castShadow>{mat(P.wood, 0.55)}</RoundedBox>
        {[0.6, 1.4].map((y) => books.map((c, i) => (
          <RoundedBox key={`${y}-${i}`} args={[0.16, 0.5 - (i % 3) * 0.06, 0.45]} radius={0.03} position={[-0.5 + i * 0.19, y + 0.2, 0.18]} castShadow>{mat(c, 0.5)}</RoundedBox>
        )))}
      </group>
      <group position={[0.5, 0.3, 0.2]} scale={pop(2)}>
        <RoundedBox args={[1.6, 0.5, 1.4]} radius={0.22} smoothness={6} castShadow>{mat(P.terra, 0.6)}</RoundedBox>
        <RoundedBox args={[1.2, 0.35, 0.5]} radius={0.15} smoothness={6} position={[0, 0.35, -0.5]} castShadow>{mat(P.butter, 0.6)}</RoundedBox>
      </group>
      <group scale={pop(3)}>
        <Block color={P.sky} position={[1.6, 0.35, 1.5]} rotation={[0, 0.4, 0]} />
        <Block color={P.butter} position={[1.0, 0.35, 1.9]} rotation={[0, -0.3, 0]} />
        <Block color={P.sage} position={[1.35, 1.05, 1.65]} rotation={[0, 0.1, 0]} />
      </group>
      <group scale={pop(4)}>
        <Book color={P.sky} open={0.55} position={[-0.3, 0.12, 1.4]} rotation={[-Math.PI / 2, 0, 0.4]} scale={0.6} />
      </group>
      <group position={[1.7, 0, -1.6]} scale={pop(5)}>
        <mesh position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 2.2, 12]} />
          {mat(P.ink, 0.4, 0.5)}
        </mesh>
        <mesh position={[0, 2.25, 0]} castShadow>
          <coneGeometry args={[0.45, 0.5, 32, 1, true]} />
          <meshStandardMaterial color={P.butter} emissive={P.butter} emissiveIntensity={0.6} side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[0, 2.0, 0]} intensity={4} distance={4} color="#FFD58A" />
      </group>
    </group>
  );
};
