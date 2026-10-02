// media-02 (alkhansaa.mp4): orthophoniste explains how to take the phone away from a child
// by offering an alternative, in 3 steps. Design "Warm Editorial 3D" (recipes/alk01-warm-editorial.md).
// Transcript: scripts/transcribe.py (Whisper turbo) + manual Darija reconstruction -> TO REVIEW by the user.

export const C = {
  cream: "#FFF4E6",
  terra: "#E8743B",
  terraDeep: "#C4561F",
  green: "#2E6B4F",
  ink: "#1A1410",
  gold: "#E9B44C",
  glass: "rgba(255,244,230,0.16)",
};

export const hook = { start: 0, end: 2.75, word: "البديل", kicker: "كيفاش تبعدي ولدك على التيليفون؟" };

export const steps = [
  { n: "01", label: "الخطوة الأولى", title: "البديل خاصو يكون باين", start: 8.0, end: 12.6 },
  { n: "02", label: "الخطوة الثانية", title: "شاركي معاه أول 5 دقايق", start: 23.2, end: 27.4 },
  { n: "03", label: "الخطوة الثالثة", title: "منطقة بلا شاشات", start: 40.9, end: 45.3 },
];

// Darija captions (key phrases only). hl = word(s) underlined in terracotta.
export const captions = [
  { start: 3.0, end: 5.4, text: "إلا بغيتي تبعدي ولدك على التيليفون", hl: ["التيليفون"] },
  { start: 5.5, end: 7.9, text: "شي كتاب ولا شي لعبة", hl: ["كتاب", "لعبة"] },
  { start: 15.0, end: 17.0, text: "قبل ما تحيدي ليه التيليفون", hl: ["قبل"] },
  { start: 25.9, end: 28.9, text: "ما تسنايش الطفل يبدا بوحدو", hl: ["بوحدو"] },
  { start: 29.1, end: 31.2, text: "گلسي معاه وحلي الكتاب", hl: ["گلسي"] },
  { start: 45.5, end: 50.2, text: "حددي أوقات وأماكن ممنوعة فيها الشاشة تماما", hl: ["ممنوعة"] },
  { start: 64.0, end: 66.2, text: "دابا عرفتي كيفاش تقدمي ليه البديل", hl: ["البديل"] },
];

// three floating objects (17-23s)
export const objects = {
  start: 17.1,
  end: 23.0,
  items: [
    { at: 17.5, icon: "palette" as const, label: "لعبة ملونة" },
    { at: 18.9, icon: "puzzle" as const, label: "Puzzle" },
    { at: 20.3, icon: "book" as const, label: "كتاب فيه صور" },
  ],
};

export const swap = { start: 12.7, end: 15.0 }; // phone card slides out, book card in
export const timer = { start: 27.5, end: 31.3 }; // 5 min ring
export const bubbles = { start: 33.6, end: 39.0, items: [{ at: 33.9, text: "شنو هادا؟", side: "left" as const }, { at: 35.0, text: "فين كيتركب؟", side: "right" as const }] };
export const noScreen = { start: 45.5, end: 50.3 };
export const moments = { start: 50.4, end: 53.0, items: [{ at: 50.5, icon: "plate" as const, text: "وقت الماكلة" }, { at: 51.5, icon: "moon" as const, text: "30 دقيقة قبل النعاس" }] };
export const corner = { start: 53.1, end: 58.0, title: "ركن القراية واللعب", sub: "مريح ومغري للطفل" };
export const versus = { start: 58.1, end: 63.8, left: { icon: "bolt" as const, title: "الشاشة", text: "متعة سريعة" }, right: { icon: "brain" as const, title: "الكتاب", text: "كيبني دماغ متزن" } };
export const outro = { start: 64.0, end: 68.8, name: "El Khanssaa", role: "Orthophoniste" };

// camera: step punch-ins, otherwise slow push
export const punches = steps.map((s) => ({ start: s.start, end: s.end }));
