# Recipe: insp04 - "Apple keynote VSL" (Handel 90-day challenge VSL)

Reference: `media/refs/insp04.mp4` (1280x720, 25fps, 159s; uploaded in chat, not in git).
User words: keep the Apple keynote feel, be creative, do 3D design. Applied to media-02 ->
`src/compositions/Alk02.tsx`, components `src/components/keynote/Keynote.tsx`, data `src/data/alk02.ts`.

## Structure of the reference
- Speaker shots (desk, city window) alternate with FULL-SCREEN clean scenes while the voice continues.
- Speaker shots carry small white pill tags with a blue check, stacking one under another beside the
  head as each point is said ("Not information / Not your circle / Not discipline").
- Scenes on an off-white stage (#F4F1EA): one big blue word with a dark period ("System."), floating
  white rounded tiles with real depth of field (near/far blurred), 3D tilted UI cards, a perspective grid
  of blue squares filling day by day, counting numbers + dashed rotating ring + check, dark-blue 3D
  carousels of thumbnails, avatar network, gift box, dashboard with progress rings.
- Transitions: soft blur/scale dissolves, nothing hard. No captions. Very calm, premium, Apple-like.

## Values used (1080x1920)
- bg #F4F1EA, blue #3A7CC2, deep #1F4E79, soft #DCE7F5, ink #1E2A3A, gray #8B93A1.
- IBM Plex Sans Arabic 500/600/700 for Arabic UI, Inter for Latin/numbers.
- Easing bezier(.22,1,.36,1); scenes fade in with blur 22->0 and scale 1.06->1 while the speaker
  blurs 26px and pushes in 14% (blur-through). Perspective 1800. DOF = blur(|z - focus| / 28).

## Applied to El Khanssaa (media-02)
- Scenes: "البديل." tiles (3-7.9) | phone card flips to book card (12.7-17) | 3 tilted object cards
  (17-23) | 00:00 -> 05:00 counter + ring + check (27.4-31.3) | "بلا شاشات." perspective grid of
  phone tiles flipping to white in a wave (40.9-45.3) | "ركن القراية." 4 tiles flying into a 3D tray
  (53.1-58) | "Screen vs Book" dashboard rings (58-63.9).
- Pill stacks on the speaker for the step titles, the child's questions and the screen-free moments.

## Feedback log
- 2026-10-02: v1 rendered (alk02.mp4).
