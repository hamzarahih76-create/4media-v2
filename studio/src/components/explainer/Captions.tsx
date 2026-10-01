import { theme } from "../../data/insp01";
import { pop, type Rect } from "./anim";

type Phrase = { start: number; end: number; text: string };

// Reference caption style: 1-2 words at a time, bold white, the word being said sits in a blue box.
// Anchored on the bottom edge of the speaker window.
export const Captions: React.FC<{ t: number; fps: number; phrases: Phrase[]; anchor: Rect }> = ({ t, fps, phrases, anchor }) => {
  const p = phrases.find((x) => t >= x.start && t < x.end + 0.1);
  if (!p) return null;
  const words = p.text.split(" ");
  const weights = words.map((w) => w.length + 2);
  const total = weights.reduce((s, x) => s + x, 0);
  const times: number[] = [];
  let acc = p.start;
  for (const w of weights) {
    times.push(acc);
    acc += ((p.end - p.start) * w) / total;
  }
  // chunks of 2 words (long words alone)
  const chunks: number[][] = [];
  for (let i = 0; i < words.length; ) {
    if (words[i].length > 9 || i === words.length - 1 || words[i + 1].length > 9) {
      chunks.push([i]);
      i += 1;
    } else {
      chunks.push([i, i + 1]);
      i += 2;
    }
  }
  const ci = chunks.findLastIndex((c) => t >= times[c[0]]);
  if (ci < 0) return null;
  const chunk = chunks[ci];
  const active = chunk.findLast((i) => t >= times[i]) ?? chunk[0];
  const s = pop(t, times[chunk[0]], fps, 320, 16);

  return (
    <div
      style={{
        position: "absolute",
        left: anchor.x - 100,
        width: anchor.w + 200,
        top: anchor.y + anchor.h - 52,
        display: "flex",
        justifyContent: "center",
        gap: 6,
        transform: `scale(${0.8 + 0.2 * s})`,
        opacity: s,
      }}
    >
      {chunk.map((i) => (
        <span
          key={i}
          style={{
            fontFamily: theme.font,
            fontWeight: 700,
            fontSize: 68,
            lineHeight: 1,
            color: "white",
            padding: "8px 18px 12px",
            borderRadius: 14,
            background: i === active ? theme.blue : "transparent",
            boxShadow: i === active ? "0 6px 0 rgba(20,40,90,0.25)" : "none",
            textShadow: i === active ? "none" : "0 3px 12px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.4)",
          }}
        >
          {words[i]}
        </span>
      ))}
    </div>
  );
};
