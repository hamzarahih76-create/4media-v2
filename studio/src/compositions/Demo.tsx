import { AbsoluteFill, Sequence } from "remotion";
import { FlashCut } from "../components/FlashCut";
import { PunchZoom } from "../components/PunchZoom";
import { WordCaptions, type Word } from "../components/WordCaptions";

// Smoke-test template: proves the pipeline renders. Real templates are built
// from a recipe in /recipes and use footage from public/media/.
export const demoSchema = {
  words: [
    { text: "4MEDIA", start: 0.2, end: 1.2 },
    { text: "STUDIO", start: 1.2, end: 2.2 },
    { text: "READY", start: 2.6, end: 4.8 },
  ] as Word[],
};

const shots = ["#1d1d1f", "#3a0ca3", "#d00000"];

export const Demo: React.FC<typeof demoSchema> = ({ words }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {shots.map((color, i) => (
        <Sequence key={color} from={i * 50} durationInFrames={50}>
          <PunchZoom at={0}>
            <AbsoluteFill
              style={{ background: `radial-gradient(circle, ${color}, black)` }}
            />
          </PunchZoom>
          {i > 0 && <FlashCut />}
        </Sequence>
      ))}
      <WordCaptions words={words} />
    </AbsoluteFill>
  );
};
