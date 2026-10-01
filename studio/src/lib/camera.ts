import { Easing, interpolate } from "remotion";
import type { Shot } from "../data/montage01";

// Virtual camera over an already-edited video: computes scale + blur + flash per frame.
// - "two-camera" jump zooms on the talking head, switching on musical phrases (every N beats)
// - slow push-in inside each block so the frame never feels static
// - punch transitions into/out of b-roll, a zoom-in hook on the first frames
// - beat pulse on the final call-to-action

export type CameraOptions = {
  shots: Shot[];
  beats: number[];
  beatsPerBlock: number;
  levels: number[]; // zoom levels cycled on talking-head blocks
  push: number; // extra zoom gained over one block
  ctaStart: number;
};

export type CameraState = { scale: number; blur: number; flash: number };

const ease = Easing.out(Easing.cubic);

export function buildBlocks(opts: CameraOptions) {
  // Block boundaries = every Nth beat inside a talk shot, kept away from shot edges.
  const blocks: { start: number; end: number; level: number }[] = [];
  let li = 0;
  for (const shot of opts.shots) {
    if (shot.kind !== "talk") continue;
    const cuts = opts.beats
      .filter((_, i) => i % opts.beatsPerBlock === 0)
      .filter((b) => b > shot.start + 1.2 && b < shot.end - 1.2);
    const edges = [shot.start, ...cuts, shot.end];
    for (let i = 0; i < edges.length - 1; i++) {
      blocks.push({ start: edges[i], end: edges[i + 1], level: opts.levels[li % opts.levels.length] });
      li++;
    }
  }
  return blocks;
}

export function cameraAt(t: number, fps: number, opts: CameraOptions, blocks: ReturnType<typeof buildBlocks>): CameraState {
  let scale = 1;
  let blur = 0;
  let flash = 0;

  const shot = opts.shots.find((s) => t >= s.start && t < s.end) ?? opts.shots[opts.shots.length - 1];

  if (shot.kind === "talk") {
    const b = blocks.find((x) => t >= x.start && t < x.end);
    if (b) {
      const p = (t - b.start) / (b.end - b.start);
      scale = b.level + opts.push * p;
    }
  } else if (shot.kind === "broll") {
    // Ken Burns push on b-roll
    const p = (t - shot.start) / (shot.end - shot.start);
    scale = 1.02 + 0.08 * p;
  }

  // Punch transition at every shot change: overshoot then settle, short blur + flash
  const d = 7 / fps;
  for (const s of opts.shots) {
    if (s.start === 0) continue;
    const dt = t - s.start;
    if (dt >= 0 && dt < d) {
      const k = ease(dt / d);
      scale *= interpolate(k, [0, 1], [1.14, 1]);
      blur = Math.max(blur, interpolate(k, [0, 1], [6, 0]));
      flash = Math.max(flash, interpolate(dt, [0, 2 / fps, d], [0.22, 0.12, 0], { extrapolateRight: "clamp" }));
    }
  }

  // Hook: fast zoom-in from wide on the very first frames
  const hook = 14 / fps;
  if (t < hook) {
    const k = ease(t / hook);
    scale *= interpolate(k, [0, 1], [1.3, 1]);
    blur = Math.max(blur, interpolate(k, [0, 1], [12, 0]));
  }

  // CTA: pulse on every beat
  if (t >= opts.ctaStart) {
    const prev = [...opts.beats].reverse().find((b) => b <= t);
    if (prev !== undefined) {
      const k = Math.min(1, (t - prev) / 0.35);
      scale *= 1 + 0.035 * (1 - ease(k));
    }
  }

  return { scale, blur, flash };
}
