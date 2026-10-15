import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PITCH_LENGTH, PITCH_WIDTH } from "./Pitch";

/**
 * Four pitch-side LED advertising boards, one per touchline, sitting in the
 * run-off area just outside the playing surface.
 */
const BOARD_HALF_LENGTH = PITCH_LENGTH / 2 + 4;
const BOARD_HALF_WIDTH = PITCH_WIDTH / 2 + 4;
const BOARD_Y = 0.85;
const BOARD_LENGTH = 44;
const BOARD_HEIGHT = 1.5;

interface AdBoardProps {
  position: [number, number, number];
  rotationY: number;
  color: string;
}

function AdBoard({ position, rotationY, color }: AdBoardProps) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const shellRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    // Boards pulse and drift slightly, like a real LED ribbon.
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = 1.1 + Math.sin(time * 0.8 + position[0]) * 0.35;
    }
    if (shellRef.current) {
      shellRef.current.position.y = position[1] + Math.sin(time * 0.9 + position[2]) * 0.05;
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group ref={shellRef} position={[0, 0, 0]}>
        {/* Chassis */}
        <mesh castShadow>
          <boxGeometry args={[BOARD_LENGTH, BOARD_HEIGHT, 0.28]} />
          <meshStandardMaterial color="#15181f" metalness={0.6} roughness={0.4} />
        </mesh>

        {/* LED face */}
        <mesh position={[0, 0, 0.16]}>
          <planeGeometry args={[BOARD_LENGTH - 1, BOARD_HEIGHT - 0.3]} />
          <meshStandardMaterial
            ref={materialRef}
            color="#05070a"
            emissive={color}
            emissiveIntensity={1.2}
            roughness={0.25}
            metalness={0.2}
          />
        </mesh>

        {/* Support feet */}
        {[-BOARD_LENGTH / 2 + 2, 0, BOARD_LENGTH / 2 - 2].map((x) => (
          <mesh key={x} position={[x, -BOARD_HEIGHT / 2 - 0.3, 0]} castShadow>
            <boxGeometry args={[0.4, 0.6, 0.6]} />
            <meshStandardMaterial color="#20242e" metalness={0.5} roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* Wash of light from the ribbon onto the surrounding grass */}
      <pointLight
        position={[0, 0.4, 2.2]}
        intensity={0.42}
        distance={16}
        color={color}
        decay={2}
      />
    </group>
  );
}

export default function SideScreens() {
  return (
    <>
      {/* Behind the north goal */}
      <AdBoard position={[-BOARD_HALF_LENGTH, BOARD_Y, 0]} rotationY={Math.PI / 2} color="#00d395" />
      {/* Behind the south goal */}
      <AdBoard position={[BOARD_HALF_LENGTH, BOARD_Y, 0]} rotationY={-Math.PI / 2} color="#ff4757" />
      {/* Along the west touchline */}
      <AdBoard position={[0, BOARD_Y, -BOARD_HALF_WIDTH]} rotationY={0} color="#8247e5" />
      {/* Along the east touchline */}
      <AdBoard position={[0, BOARD_Y, BOARD_HALF_WIDTH]} rotationY={Math.PI} color="#4b9bff" />
    </>
  );
}
