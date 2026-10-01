import { interpolate, spring } from "remotion";

// Spring 0->1 starting at time t0 (seconds).
export const pop = (t: number, t0: number, fps: number, stiffness = 200, damping = 15) =>
  t < t0 ? 0 : spring({ frame: (t - t0) * fps, fps, config: { stiffness, damping } });

export const fade = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export type Rect = { x: number; y: number; w: number; h: number };
export const lerpRect = (a: Rect, b: Rect, k: number): Rect => ({
  x: a.x + (b.x - a.x) * k,
  y: a.y + (b.y - a.y) * k,
  w: a.w + (b.w - a.w) * k,
  h: a.h + (b.h - a.h) * k,
});
