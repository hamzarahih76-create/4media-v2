# Recipe: alk03 - real 3D (three.js) for media-02 El Khanssaa

User feedback on v1/v2: flat icons and small cards look cheap ("nul"). Wants real 3D animations and 3D
icons, clear and creative, a finished video they don't have to touch.

## Stack
- @remotion/three + @react-three/fiber 9 + @react-three/drei 10 + three. Render with `--gl=angle`.
- `src/three/objects.tsx`: procedural clay-premium kit - Book (cover opens, pages flip), Phone (glowing
  screen canvas texture), Puzzle (extruded), Crayons, Block, Clock (hands + progress ring), NoSign,
  Plate, Moon, Bubble (extruded, tail left/right), Scale (balance), Room (reading-corner diorama).
  Lighting: hemisphere + 2 directional + RoomEnvironment PMREM (no downloads), ContactShadows.
- `src/three/Text3D.tsx`: extruded 3D text from font files with opentype.js (Arabic contextual forms +
  RTL work). Fonts in public/fonts. MUST preload with `useFonts3D()` outside the canvas, otherwise the
  frame is captured before the geometry exists.
- Overlay mode: transparent canvas over the speaker (camera fov 35, z 26 => 117 px per unit; helper px()).
  Studio mode: full-screen 3D set on a warm radial backdrop, blur-through transitions with the speaker.

## Timeline used
hook 3D word behind speaker (cutout) | studio "البديل": book drops on the phone and opens, crayons roll,
blocks fall | 3D 01 + "البديل باين" | studio phone flips into an open book | crayons/puzzle/picture book
pop around her | 3D 02 + "شاركي معاه" | studio alarm clock to 5 min | 3D speech bubbles | 3D 03 +
"بلا شاشات" | phone + red no-sign | plate & moon | studio reading-corner diorama builds | studio balance:
phone vs 3 books, tips to books | name tag + 3D book closing.

## Feedback log
- 2026-10-02: v3 rendered (alk03.mp4).
