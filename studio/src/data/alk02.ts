// media-02 (El Khanssaa) v2 in the "Apple keynote VSL" style learned from media/refs/insp04.mp4
// (recipes/insp04-keynote.md). Speaker shots + full-screen clean 3D scenes (voice continues) +
// white pill tags next to the speaker. No captions, like the reference.

export const K = {
  bg: "#F4F1EA",
  blue: "#3A7CC2",
  blueDeep: "#1F4E79",
  blueSoft: "#DCE7F5",
  ink: "#1E2A3A",
  gray: "#8B93A1",
  red: "#E0564B",
  green: "#2FA36B",
};

export type SceneId = "alt" | "flip" | "objects" | "five" | "grid" | "corner" | "dash";
export const scenes: { id: SceneId; start: number; end: number }[] = [
  { id: "alt", start: 3.0, end: 7.9 },
  { id: "flip", start: 12.7, end: 17.0 },
  { id: "objects", start: 17.0, end: 23.0 },
  { id: "five", start: 27.4, end: 31.3 },
  { id: "grid", start: 40.9, end: 45.3 },
  { id: "corner", start: 53.1, end: 58.0 },
  { id: "dash", start: 58.0, end: 63.9 },
];

// pill tags stacked next to the speaker: [time, text, kind]
export type Pill = { at: number; text: string; kind?: "check" | "num" | "muted" | "chat"; num?: string };
export const pillGroups: { start: number; end: number; pills: Pill[] }[] = [
  { start: 0.3, end: 2.95, pills: [{ at: 0.4, text: "التيليفون", kind: "muted" }, { at: 1.7, text: "ولا الكتاب؟", kind: "check" }] },
  { start: 7.95, end: 12.65, pills: [{ at: 8.1, text: "الخطوة الأولى", kind: "num", num: "1" }, { at: 9.4, text: "البديل خاصو يكون باين", kind: "check" }] },
  { start: 23.1, end: 27.35, pills: [{ at: 23.3, text: "الخطوة الثانية", kind: "num", num: "2" }, { at: 24.3, text: "شاركي معاه", kind: "check" }, { at: 25.9, text: "ما تسنايش يبدا بوحدو", kind: "check" }] },
  { start: 33.6, end: 39.2, pills: [{ at: 33.9, text: "شنو هادا؟", kind: "chat" }, { at: 35.0, text: "فين كيتركب؟", kind: "chat" }] },
  { start: 45.4, end: 53.0, pills: [{ at: 45.5, text: "الخطوة الثالثة", kind: "num", num: "3" }, { at: 46.6, text: "أوقات بلا شاشة", kind: "check" }, { at: 50.5, text: "وقت الماكلة", kind: "check" }, { at: 51.5, text: "30 دقيقة قبل النعاس", kind: "check" }] },
];
export const nameTag = { at: 64.2, name: "El Khanssaa", role: "Orthophoniste" };
