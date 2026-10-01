import { Composition } from "remotion";
import { Demo, demoSchema } from "./compositions/Demo";

// Every finished template is registered here. One <Composition> per template.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Demo"
        component={Demo}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={demoSchema}
      />
    </>
  );
};
