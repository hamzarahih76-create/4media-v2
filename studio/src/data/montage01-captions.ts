// Darija transcript of media-01, read off the original burned-in captions (timings in seconds).
// `hl` = words highlighted in brand color.
export type Phrase = { start: number; end: number; text: string; hl?: string[] };

export const captions01: Phrase[] = [
  { start: 0.33, end: 0.95, text: "أه دكتورة" },
  { start: 1.07, end: 2.35, text: "راني فهمتك، فهمت أنه كي قلتي ليا" },
  { start: 4.4, end: 5.2, text: "ولا خاوي" },
  { start: 5.5, end: 6.9, text: "هاد المشكل راه ماشي غير بوحدك كتعاني منه" },
  { start: 7.5, end: 9.4, text: "راه بزاف ديال Les Médecins كيعانيو من نفس الحاجة", hl: ["Les", "Médecins"] },
  { start: 10.0, end: 11.2, text: "واللي ما كيعانيش منها دابا" },
  { start: 11.5, end: 12.65, text: "فعرفي أنه غيعاني منها من بعد" },
  { start: 13.0, end: 14.3, text: "إلا مكنتيش عارفة هادشي اللي غنقول ليك أنايا" },
  { start: 16.0, end: 17.9, text: "ممكن عندك l'expérience", hl: ["l'expérience"] },
  { start: 18.0, end: 19.25, text: "أنا هادي متفق معاك عليها" },
  { start: 20.0, end: 22.25, text: "ممكن تقولي ليا أنه راه بزاف ديال النتائج", hl: ["النتائج"] },
  { start: 22.5, end: 24.6, text: "كيخرجو ليك زوينين مع Les Patients ما عندي ما نسولك", hl: ["Les", "Patients"] },
  { start: 26.5, end: 27.75, text: "راه كيبقى غير وسط Cabinet", hl: ["Cabinet"] },
  { start: 27.9, end: 29.2, text: "راه حتى شي واحد ما كيعرفو من غيرك" },
  { start: 30.5, end: 31.3, text: "اللي بغيت نفهمك دكتور" },
  { start: 31.5, end: 33.3, text: "هو الناس راه محتاجين l'expertise", hl: ["l'expertise"] },
  { start: 33.5, end: 34.95, text: "ولكن راه ما عارفينش فين يلقاوها" },
  { start: 35.5, end: 36.5, text: "راه بزاف ديال patients", hl: ["patients"] },
  { start: 36.6, end: 38.25, text: "كتلقاهم كيقلبو على واحد دكتور" },
  { start: 38.5, end: 40.05, text: "vraiment غتلقى معاه la solution", hl: ["la", "solution"] },
  { start: 45.9, end: 46.9, text: "création de contenu", hl: ["création", "de", "contenu"] },
  { start: 47.1, end: 48.4, text: "وما كتبارطاجي حتى شي حاجة" },
  { start: 49.4, end: 50.4, text: "الحاجة اللي بغيت نقول ليك دكتور" },
  { start: 50.9, end: 52.45, text: "كاينين واحد Les étapes", hl: ["Les", "étapes"] },
];

export type Card = { start: number; end: number; label: string; icon: "cross" | "chart" | "users" | "star" | "check" | "play" | "steps" };

export const cards01: Card[] = [
  { start: 7.9, end: 9.6, label: "Les Médecins", icon: "cross" },
  { start: 20.9, end: 22.4, label: "Les résultats", icon: "chart" },
  { start: 23.1, end: 24.8, label: "Les Patients", icon: "users" },
  { start: 32.2, end: 33.5, label: "L'expertise", icon: "star" },
  { start: 39.2, end: 40.9, label: "La solution", icon: "check" },
  { start: 45.9, end: 47.0, label: "Création de contenu", icon: "play" },
  { start: 51.4, end: 53.9, label: "Les étapes", icon: "steps" },
];
