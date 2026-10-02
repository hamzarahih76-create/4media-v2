import { Composition } from "remotion";
import { Demo, demoSchema } from "./compositions/Demo";
import { Montage01 } from "./compositions/Montage01";
import { Montage02 } from "./compositions/Montage02";
import { Insp01 } from "./compositions/Insp01";
import { Insp02 } from "./compositions/Insp02";
import { Alk01 } from "./compositions/Alk01";
import { Alk02 } from "./compositions/Alk02";
import { ObjTest } from "./three/ObjTest";
import { Alk03 } from "./compositions/Alk03";
import { montage01 } from "./data/montage01";

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
      <Composition
        id="Montage01"
        component={Montage01}
        durationInFrames={Math.floor(montage01.duration * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Montage02"
        component={Montage02}
        durationInFrames={Math.floor(montage01.duration * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Insp01"
        component={Insp01}
        durationInFrames={Math.floor(montage01.duration * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Insp02"
        component={Insp02}
        durationInFrames={Math.floor(montage01.duration * 30)}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Alk01"
        component={Alk01}
        durationInFrames={Math.floor(68.8 * 60)}
        fps={60}
        width={1080}
        height={1920}
      />
      <Composition
        id="Alk02"
        component={Alk02}
        durationInFrames={Math.floor(68.8 * 60)}
        fps={60}
        width={1080}
        height={1920}
      />
      <Composition id="ObjTest" component={ObjTest} durationInFrames={60} fps={30} width={1080} height={1920} />
      <Composition
        id="Alk03"
        component={Alk03}
        durationInFrames={Math.floor(68.8 * 60)}
        fps={60}
        width={1080}
        height={1920}
      />
    </>
  );
};
