// Ghita v2 (user feedback on v1): no background blur, silences cut (jump cuts with punch transitions),
// 2D Apple-like write-on captions that follow the speech, more transitions. All times below are SOURCE
// seconds (7.mp4); the composition maps output time -> source time through `cuts`.

// kept source ranges (silences > 0.3s removed, 0.08s padding) - from ffmpeg silencedetect -32dB
export const cuts: [number, number][] = [
  [0.0, 2.38], [2.56, 3.05], [5.15, 5.96], [6.17, 7.1], [7.35, 8.17], [8.39, 10.38],
  [10.56, 20.97], [21.17, 23.34], [23.52, 31.2], [31.48, 41.8],
];

// Darija from Whisper large-v3 + turbo, reconstructed -> to be checked by the user
export const captions = [
  { start: 5.2, end: 7.55, text: "شركة Dyson من بعد ما بدعات فـ l'aspirateur", hl: ["Dyson"] },
  { start: 12.7, end: 14.9, text: "ولكن الجديد: شيتة ديال السنان ذكية", hl: ["ذكية"] },
  { start: 15.03, end: 16.5, text: "زادو فيها كاميرا صغيرة", hl: ["كاميرا"] },
  { start: 18.05, end: 20.95, text: "الخدمة ديالها تعرف البلايص بين السنان", hl: ["البلايص"] },
  { start: 21.2, end: 23.3, text: "وكتطلق الما باش تنقي داك البلاصة", hl: ["الما"] },
  { start: 23.55, end: 24.9, text: "تخيلو معايا هاد التكنولوجيا", hl: ["التكنولوجيا"] },
  { start: 34.0, end: 36.4, text: "الطبيب كيشوفك مرة فالعام", hl: ["مرة"] },
  { start: 39.0, end: 40.75, text: "عطيوني رأيكم", hl: ["رأيكم"] },
];

export const hook = { start: 0.9, end: 3.0, small: "tkhayel", big: "L'AI", spaced: "f snanek" };
export const windowCard = { start: 0.5, end: 3.05 };
export const flashes = [7.6, 29.0];
export const full = [
  { id: "A" as const, start: 7.75, end: 10.05, small: "Dyson daba dkhlat l", big: "SNAN" },
  { id: "B" as const, start: 10.05, end: 12.55, small: "chita dial snan", big: "DKIYA" },
];
export const floatBrush = { start: 12.6, end: 15.0 };
export const count = { start: 16.5, end: 18.0, n: 28, label: "صورة فالثانية" };
export const handPills = [
  { at: 25.0, text: "كاميرا كتدخل لفمك" },
  { at: 26.3, text: "جوج مرات فالنهار" },
  { at: 27.5, text: "كتنقي بالما" },
];
export const handPillsEnd = 28.95;
export const cards = { start: 26.3, end: 28.95, images: ["media/ghita/lens.png", "media/ghita/plaque.png"] };
export const stack = { start: 29.2, end: 33.95, items: [{ at: 29.6, text: "الكالكير" }, { at: 30.6, text: "الالتهابات" }, { at: 31.9, text: "بداية السوسة" }] };
export const questionPill = { start: 36.5, end: 39.0, lines: ["واش هادي هي مستقبل", "الوقاية؟"] };
export const finalPill = { start: 40.8, end: 41.8, text: "رأيكم؟" };
