import { ContactShadows } from "@react-three/drei";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Studio, Tooth, Toothbrush } from "./objects";

// Still "photos" of 3D objects used as cards / window images in Ghita01 (render with remotion still --props).
export type Shot = "window" | "lens" | "plaque" | "icon";
const BG: Record<Shot, string> = {
  window: "radial-gradient(circle at 50% 40%, #DDEBF5, #8FB3CC)",
  lens: "radial-gradient(circle at 50% 45%, #EAF3FB, #A9C6DA)",
  plaque: "radial-gradient(circle at 50% 45%, #FFF3EA, #E9C9B4)",
  icon: "transparent",
};

export const GhitaShots: React.FC<{ shot: Shot }> = ({ shot }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: BG[shot] }}>
      <ThreeCanvas width={width} height={height} camera={{ fov: 30, position: [0, 0, 14] }} shadows flat gl={{ alpha: true, antialias: true }}>
        <Studio />
        {shot === "window" && (
          <>
            <Toothbrush position={[-1.0, -0.2, 0]} rotation={[0.15, 0.6, -0.35]} water={0.6} />
            <Tooth position={[1.9, -0.9, 0.5]} rotation={[0.35, -0.5, 0.1]} scale={0.9} scan={0.1} />
            <ContactShadows position={[0, -4.2, 0]} opacity={0.35} scale={12} blur={2.5} />
          </>
        )}
        {shot === "lens" && <Toothbrush position={[0, -2.6, 2.5]} rotation={[0.2, Math.PI + 0.45, 0.2]} scale={1.9} lensGlow={1.6} />}
        {shot === "plaque" && (
          <>
            <Tooth position={[0, 0.3, 0]} rotation={[0.3, -0.4, 0]} scale={1.6} plaque={1} scan={0.35} />
            <ContactShadows position={[0, -3.8, 0]} opacity={0.35} scale={10} blur={2.5} />
          </>
        )}
        {shot === "icon" && <Tooth position={[0, 0.2, 0]} rotation={[0.3, -0.5, 0.1]} scale={2.2} />}
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
