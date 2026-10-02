import opentype from "opentype.js";
import { useEffect, useMemo, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import * as THREE from "three";
import type { ThreeElements } from "@react-three/fiber";

// Real extruded 3D text from a font file (opentype.js shapes Arabic contextual forms + RTL).
// Fonts must be preloaded OUTSIDE the ThreeCanvas with useFonts3D(), then Text3D reads them synchronously.
const store = new Map<string, opentype.Font>();

export const useFonts3D = (files: string[]) => {
  const [ready, setReady] = useState(() => files.every((f) => store.has(f)));
  const [h] = useState(() => (ready ? null : delayRender("3d fonts")));
  useEffect(() => {
    if (ready) return;
    Promise.all(
      files.map((f) =>
        fetch(staticFile(f))
          .then((r) => r.arrayBuffer())
          .then((b) => store.set(f, opentype.parse(b))),
      ),
    )
      .then(() => setReady(true))
      .finally(() => h !== null && continueRender(h));
  }, [files, ready, h]);
  return ready;
};

export const Text3D: React.FC<{
  text: string;
  font: string;
  size?: number;
  depth?: number;
  bevel?: number;
  color?: string;
  sideColor?: string;
} & ThreeElements["group"]> = ({ text, font, size = 1, depth = 0.25, bevel = 0.03, color = "#E8743B", sideColor, ...g }) => {
  const f = store.get(font);
  const geo = useMemo(() => {
    if (!f) return null;
    const path = f.getPath(text, 0, 0, 100);
    const sp = new THREE.ShapePath();
    for (const c of path.commands) {
      if (c.type === "M") sp.moveTo(c.x, -c.y);
      else if (c.type === "L") sp.lineTo(c.x, -c.y);
      else if (c.type === "Q") sp.quadraticCurveTo(c.x1, -c.y1, c.x, -c.y);
      else if (c.type === "C") sp.bezierCurveTo(c.x1, -c.y1, c.x2, -c.y2, c.x, -c.y);
    }
    const s = size / 100;
    const gm = new THREE.ExtrudeGeometry(sp.toShapes(), { depth: depth / s, bevelEnabled: bevel > 0, bevelSize: bevel / s, bevelThickness: bevel / s, bevelSegments: 4, curveSegments: 10 });
    gm.scale(s, s, s);
    gm.computeBoundingBox();
    const b = gm.boundingBox!;
    gm.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, -(b.max.z + b.min.z) / 2);
    gm.computeVertexNormals();
    return gm;
  }, [f, text, size, depth, bevel]);
  const mats = useMemo(
    () => [new THREE.MeshStandardMaterial({ color, roughness: 0.35 }), new THREE.MeshStandardMaterial({ color: sideColor ?? color, roughness: 0.45 })],
    [color, sideColor],
  );
  if (!geo) return null;
  return (
    <group {...g}>
      <mesh geometry={geo} castShadow material={mats} />
    </group>
  );
};
