// "Explainer" style learned from media/refs/insp01.mp4 (see recipes/insp01-explainer.md),
// applied to media-01. Times in seconds.

export const theme = {
  bg: "#FDF7EB",
  glow: "#7FE38C", // light green edge glow (user: green instead of blue)
  navy: "#14213D",
  blue: "#34C759", // accent: open/light green (4media) - key name kept from the reference palette
  blueSoft: "#E3F7E7",
  gray: "#8A93A3",
  line: "#E9E1D3",
  red: "#E0453A",
  font: "Poppins",
};

// Darija in Latin letters (arabizi), like the reference captions.
export const phrases = [
  { start: 0.33, end: 0.95, text: "ah doktora" },
  { start: 1.07, end: 2.35, text: "rani fhamtek, fhamt annahou ki gelti liya" },
  { start: 4.4, end: 5.2, text: "wla khawi" },
  { start: 5.5, end: 6.9, text: "had lmochkil rah machi ghir bou7dek kat3ani menno" },
  { start: 7.5, end: 9.4, text: "rah bzaf dyal les médecins kay3aniw men nefs l7aja" },
  { start: 10.0, end: 11.2, text: "w lli makay3anich menha daba" },
  { start: 11.5, end: 12.65, text: "f3erfi annahou ghay3ani menha men b3d" },
  { start: 13.0, end: 14.3, text: "ila makontich 3arfa hadchi lli ghan9oul lik" },
  { start: 16.0, end: 17.9, text: "momkin 3endek l'expérience" },
  { start: 18.0, end: 19.25, text: "ana hadi mtafe9 m3ak 3liha" },
  { start: 20.0, end: 22.25, text: "momkin t9oul liya rah bzaf dyal nnata2ij" },
  { start: 22.5, end: 24.6, text: "kaykhrjou lik zwinin m3a les patients" },
  { start: 26.5, end: 27.75, text: "rah kaybe9a ghir wast l cabinet" },
  { start: 27.9, end: 29.2, text: "7ta chi wa7ed maky3erfou men ghirek" },
  { start: 30.5, end: 31.3, text: "lli bghit nfahmek doktor" },
  { start: 31.5, end: 33.3, text: "houwa nnas rah m7tajin l'expertise" },
  { start: 33.5, end: 34.95, text: "walakin ma3arfinch fin yl9awha" },
  { start: 35.5, end: 36.5, text: "rah bzaf dyal patients" },
  { start: 36.6, end: 38.25, text: "katl9ahom kay9elbou 3la wa7ed doktor" },
  { start: 38.5, end: 40.05, text: "vraiment ghatl9a m3ah la solution" },
  { start: 45.9, end: 46.9, text: "création de contenu" },
  { start: 47.1, end: 48.4, text: "w ma katpartagi 7ta chi 7aja" },
  { start: 49.4, end: 50.4, text: "l7aja lli bghit n9oul lik doktor" },
  { start: 50.9, end: 52.45, text: "kaynin wa7ed les étapes" },
];

// Where the speaker window sits. card = small 4:3 under the info card, full = big 4:3,
// end = portrait (phone mockups), cta = speaker hidden.
export type Mode = "card" | "full" | "end" | "cta";
export const modes: { start: number; mode: Mode }[] = [
  { start: 0, mode: "full" },
  { start: 1.0, mode: "card" },
  { start: 12.067, mode: "full" },
  { start: 13.3, mode: "card" },
  { start: 30.4, mode: "full" },
  { start: 31.4, mode: "card" },
  { start: 42.933, mode: "full" },
  { start: 44.6, mode: "card" },
  { start: 49.3, mode: "full" },
  { start: 50.5, mode: "card" },
  { start: 54.133, mode: "end" },
  { start: 59.533, mode: "cta" },
];

export type SceneId = "intro" | "medecins" | "experience" | "resultats" | "cabinet" | "expertise" | "search" | "contenu" | "etapes" | "cta";
export const scenes: { id: SceneId; start: number; end: number }[] = [
  { id: "intro", start: 1.0, end: 5.4 },
  { id: "medecins", start: 5.4, end: 12.067 },
  { id: "experience", start: 13.3, end: 19.9 },
  { id: "resultats", start: 19.9, end: 26.3 },
  { id: "cabinet", start: 26.3, end: 30.4 },
  { id: "expertise", start: 31.4, end: 35.4 },
  { id: "search", start: 35.4, end: 42.933 },
  { id: "contenu", start: 44.6, end: 49.3 },
  { id: "etapes", start: 50.5, end: 54.133 },
  { id: "cta", start: 59.533, end: 63.2 },
];
