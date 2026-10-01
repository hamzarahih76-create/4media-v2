// "Cinematic red" style learned from media/refs/insp02.mp4 (see recipes/insp02-cinematic.md),
// applied to media-01. Times in seconds. On-screen texts are French ad copy summarising the Darija speech.

export const red = { main: "#E24A5B", neon: "#FF3D55", dark: "#0B0708", yellow: "#F2E400", slate: "rgba(38,48,58,0.88)" };

export const intro = { start: 0.15, end: 2.4, title: ["VISIBILITÉ", "DES", "MÉDECINS"], name: "4media", role: "Création de contenu médical" };

export const chapters = [
  { n: "01", start: 12.0, end: 13.75, title: ["Le problème"], text: "Beaucoup de médecins ont l'expérience et de bons résultats, mais leur cabinet reste vide." },
  { n: "02", start: 27.65, end: 29.45, title: ["Personne ne", "vous connaît"], text: "Votre expertise reste enfermée dans votre cabinet, alors que les patients vous cherchent." },
  { n: "03", start: 42.85, end: 44.8, title: ["La solution"], text: "La création de contenu met votre expertise devant les patients qui en ont besoin." },
];

export const panels = [
  { start: 7.4, end: 12.0, header: "Un problème fréquent", items: [{ at: 7.7, text: "Cabinet vide" }, { at: 8.5, text: "Beaucoup de médecins le vivent" }, { at: 11.5, text: "Les autres, plus tard" }] },
  { start: 15.9, end: 24.7, header: "Vous avez déjà", items: [{ at: 16.3, text: "L'expérience" }, { at: 20.4, text: "Des résultats" }, { at: 22.9, text: "Des patients satisfaits" }] },
  { start: 31.4, end: 40.2, header: "Ce que cherchent les patients", items: [{ at: 31.8, text: "Une vraie expertise" }, { at: 36.8, text: "Un bon médecin" }, { at: 38.7, text: "La solution" }] },
];

// 1-10 scale with a moving cursor (decorative "evaluation" beat between ideas)
export const scales = [
  { start: 0.15, end: 2.4, side: "left" as const },
  { start: 13.75, end: 15.9, side: "right" as const },
  { start: 24.7, end: 27.65, side: "right" as const },
  { start: 40.2, end: 42.85, side: "right" as const },
];

export const checklist = { start: 50.8, end: 54.13, items: [{ at: 51.0, text: "Créer du contenu" }, { at: 51.7, text: "Le partager" }, { at: 52.4, text: "Être trouvé par vos patients" }] };

export const endScreen = 54.133;
export const ctaAt = 59.533;
