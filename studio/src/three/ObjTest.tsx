import { ContactShadows } from "@react-three/drei";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Text3D, useFonts3D } from "./Text3D";
const FONTS = ["fonts/cairo-ar-900.woff", "fonts/playfair-800i.woff"];
import { Book, Clock, Crayons, Moon, NoSign, Phone, Plate, Puzzle, Room, Scale, Studio, Block, P } from "./objects";

export const ObjTest: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const ry = -0.4 + f * 0.01;
  const ready = useFonts3D(FONTS);
  if (!ready) return null;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, #FFF4E6, #F3D9BE)" }}>
      <ThreeCanvas width={width} height={height} camera={{ fov: 35, position: [0, 0, 26] }} shadows>
        <Studio />
        <Book open={0.6} pages={0.4} position={[-4, 7, 0]} rotation={[0.2, ry, 0]} />
        <Phone position={[0, 7, 0]} rotation={[0.1, ry, 0]} />
        <Puzzle position={[4, 7, 0]} rotation={[0.3, ry, 0.2]} />
        <Crayons position={[-4, 2.5, 0]} rotation={[0.2, ry, 0]} />
        <Clock minutes={4} position={[0, 2.5, 0]} rotation={[0.1, ry, 0]} />
        <group position={[4, 2.5, 0]} rotation={[0.1, ry, 0]}><Phone dim={1} /><NoSign k={1} /></group>
        <Plate position={[-4, -2, 0]} rotation={[0.4, ry, 0]} />
        <Moon position={[0, -2, 0]} rotation={[0.2, ry, 0]} />
        <Block color={P.sky} position={[4, -2, 0]} rotation={[0.4, ry + 0.5, 0]} />
        <Room k={1} position={[-3.5, -9, 0]} rotation={[0.45, 0.6, 0]} scale={0.9} />
        <Scale tilt={0.18} left={<Phone rotation={[-Math.PI / 2, 0, 0]} scale={0.5} position={[0, 0.06, 0]} />} right={<Book rotation={[-Math.PI / 2, 0, 0.3]} scale={0.6} position={[0, 0.2, 0]} />} position={[3.5, -8.5, 0]} rotation={[0.1, -0.3, 0]} scale={0.8} />
        <Text3D text="البديل" font="fonts/cairo-ar-900.woff" size={3} depth={0.6} color="#E8743B" sideColor="#C4561F" position={[0, 5, 4]} rotation={[0.15, ry * 0.5, 0]} />
        <Text3D text="01" font="fonts/playfair-800i.woff" size={3} depth={0.6} color="#F2C14E" sideColor="#C98B5A" position={[0, -5.5, 2]} rotation={[0.1, ry, 0]} />
        <ContactShadows position={[0, -12, 0]} opacity={0.4} scale={30} blur={2.5} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
