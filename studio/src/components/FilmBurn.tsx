import { AbsoluteFill, random } from "remotion";

// Procedural film-burn transition (reusable): hot orange/red light blobs sweep across the frame with
// screen blending, an overexposed white-hot core at the peak and a few frames of film grain.
// `p` runs 0 -> 1 over the transition (peak at 0.5, i.e. on the cut); `seed` varies the look per cut.

const burnColors = ["#FF2000", "#FF5A00", "#FF9A1F", "#E01000", "#FFC060"];

export const FilmBurn: React.FC<{ p: number; seed: string | number; frame: number; strength?: number }> = ({ p, seed, frame, strength = 1 }) => {
  if (p <= 0 || p >= 1) return null;
  const peak = Math.sin(Math.PI * p) * strength; // 0 -> 1 -> 0
  const dir = random(`dir${seed}`) > 0.5 ? 1 : -1;
  const blobs = Array.from({ length: 5 }, (_, i) => {
    const r = (k: string) => random(`${seed}-${i}-${k}`);
    const x0 = dir > 0 ? -30 + r("x") * 40 : 90 + r("x") * 40;
    const x = x0 + dir * (p * (90 + r("v") * 60));
    const y = 10 + r("y") * 80 + Math.sin(p * 6 + i) * 6;
    const size = 45 + r("s") * 55;
    const c = burnColors[i % burnColors.length];
    return { x, y, size, c, o: 0.55 + r("o") * 0.45 };
  });
  const grainSeed = Math.floor(frame) % 7;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* warm exposure lift of the whole frame */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,110,20,1) 20%, rgba(150,10,0,1) 100%)", mixBlendMode: "multiply", opacity: peak * 0.55 }} />
      {/* moving burn blobs */}
      <AbsoluteFill style={{ mixBlendMode: "screen", opacity: Math.min(1, peak * 1.6) }}>
        {blobs.map((b, i) => (
          <div key={i} style={{ position: "absolute", left: `${b.x}%`, top: `${b.y}%`, width: `${b.size * 1.8}%`, height: `${b.size}%`, transform: "translate(-50%, -50%)", borderRadius: "50%", background: `radial-gradient(closest-side, ${b.c} 0%, ${b.c}AA 35%, transparent 100%)`, filter: "blur(28px)", opacity: b.o }} />
        ))}
        {/* edge burn: the frame "catches fire" from one side */}
        <AbsoluteFill style={{ background: `linear-gradient(${dir > 0 ? 90 : 270}deg, rgba(255,40,0,1) 0%, rgba(255,110,10,0.75) ${18 + peak * 30}%, transparent ${40 + peak * 40}%)` }} />
      </AbsoluteFill>
      {/* white-hot core right on the cut */}
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${dir > 0 ? 35 : 65}% 45%, #FFF3D0 0%, rgba(255,170,60,0.85) 22%, transparent 55%)`, mixBlendMode: "screen", opacity: Math.max(0, (peak - 0.6) / 0.4) }} />
      {/* film grain */}
      <AbsoluteFill style={{ opacity: peak * 0.35, mixBlendMode: "overlay" }}>
        <svg width="100%" height="100%">
          <filter id={`g${grainSeed}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={grainSeed} />
          </filter>
          <rect width="100%" height="100%" filter={`url(#g${grainSeed})`} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
