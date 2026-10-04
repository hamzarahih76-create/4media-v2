// media_3 "ghita dentiste" (7.mp4, 42.5s) edited to match media/refs/insp05.mp4 (= insp03, El Khanssaa toys reel)
// beat for beat. Topic: Dyson smart toothbrush with an AI camera. Darija reconstructed from Whisper -> TO REVIEW.
export const G = { teal: "rgba(64,92,108,0.62)", dark: "rgba(24,28,32,0.78)", blue: "#4FA3FF", white: "#FFFFFF" };

export const hookTitle = { start: 1.25, end: 3.25, small: "tkhayel", big: "L'AI", spaced: "f snanek" };
export const windowCard = { start: 0.9, end: 5.15 };

export const captions = [
  { start: 5.25, end: 7.5, text: "شركة Dyson من بعد ما بدعات فـ l'aspirateur" },
  { start: 15.0, end: 16.5, text: "تزادت فيها كاميرا صغيرة" },
  { start: 18.05, end: 21.05, text: "الخدمة ديالها تعرف البلايص بين السنان" },
  { start: 21.2, end: 23.9, text: "وكتطلق الماء باش تنقي داك البلاصة" },
  { start: 39.0, end: 41.45, text: "ولا غادي تعوض الطبيب؟" },
];

export const flashes = [7.6, 29.0]; // white flash transitions (insp at 7.5 / 28.5)
export const full = [
  { id: "A" as const, start: 7.75, end: 10.05, small: "Dyson daba dkhlat l", big: "SNAN" },
  { id: "B" as const, start: 10.05, end: 12.55, small: "chita dial snan", big: "DKIYA" },
];
export const floatBrush = { start: 12.6, end: 15.0 };
export const bigNumber = { start: 16.55, end: 18.0, n: "28", label: "PHOTOS / S" };
export const handPills = [
  { at: 24.1, text: "كاميرا صغيرة" },
  { at: 25.4, text: "ذكاء اصطناعي" },
  { at: 26.7, text: "كتنقي بالماء" },
  { at: 27.9, text: "28 صورة فالثانية" },
];
export const handPillsEnd = 28.95;
export const cards = { start: 26.5, end: 28.95, images: ["media/ghita/lens.png", "media/ghita/plaque.png"] };
export const stack = { start: 29.2, end: 34.0, items: [{ at: 29.4, text: "الكالكير" }, { at: 31.6, text: "بداية السوسة" }, { at: 32.8, text: "قبل الطبيب" }] };
export const questionPill = { start: 36.5, end: 39.0, lines: ["واش هادي هي مستقبل", "الوقاية؟"] };
export const finalPill = { start: 41.55, end: 42.5, text: "رأيكم؟" };
