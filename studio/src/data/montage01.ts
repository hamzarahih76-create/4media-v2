import beats from "./montage01-beats.json";

// Shot map of media-01 (0608.2.mov), measured with scene + color-similarity detection.
export type Shot = { kind: "talk" | "broll" | "end"; start: number; end: number }; // seconds

export const montage01 = {
  src: "media/src.mp4",
  duration: 63.15,
  bpm: 123,
  beats: beats as number[],
  brand: "#5BE34B",
  shots: [
    { kind: "talk", start: 0, end: 12.067 },
    { kind: "broll", start: 12.067, end: 13.3 },
    { kind: "talk", start: 13.3, end: 27.733 },
    { kind: "broll", start: 27.733, end: 29.0 },
    { kind: "talk", start: 29.0, end: 42.933 },
    { kind: "broll", start: 42.933, end: 44.6 },
    { kind: "talk", start: 44.6, end: 54.133 },
    { kind: "end", start: 54.133, end: 63.15 },
  ] as Shot[],
  ctaStart: 59.533,
};
