import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import Text from "./StadiumLabel";
import * as THREE from "three";
import { SCREEN_Y, SCREEN_Z, SCREEN_H } from "./MainScreen";

export default function ScoreBoard({
  homeScore = 2,
  clock = "78:00",
}: {
  homeScore?: number;
  clock?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y =
        SCREEN_Y +
        SCREEN_H +
        1.6 +
        Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={[0, SCREEN_Y + SCREEN_H + 1.6, SCREEN_Z]}>
      {/* Scoreboard Background */}
      <mesh castShadow>
        <boxGeometry args={[16, 4, 0.3]} />
        <meshStandardMaterial
          color="#1a1a2e"
          emissive="#8247e5"
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Scoreboard Border */}
      <mesh position={[0, 0, 0.2]}>
        <boxGeometry args={[16.2, 4.2, 0.1]} />
        <meshStandardMaterial
          color="#8247e5"
          emissive="#8247e5"
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Team 1 */}
      <Text
        position={[-5.4, 0.7, 0.3]}
        fontSize={1}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        HOME
      </Text>
      <Text
        position={[-5.4, -0.7, 0.3]}
        fontSize={1.6}
        color="#00d395"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {homeScore}
      </Text>

      {/* Clock */}
      <Text
        position={[0, 0.7, 0.3]}
        fontSize={0.9}
        color="#a0a0a0"
        anchorX="center"
        anchorY="middle"
      >
        {clock}
      </Text>
      <Text
        position={[0, -0.7, 0.3]}
        fontSize={0.7}
        color="#ffd166"
        anchorX="center"
        anchorY="middle"
      >
        DEMO MATCH
      </Text>

      {/* Team 2 */}
      <Text
        position={[5.4, 0.7, 0.3]}
        fontSize={1}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        AWAY
      </Text>
      <Text
        position={[5.4, -0.7, 0.3]}
        fontSize={1.6}
        color="#ff4757"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        1
      </Text>

      {/* Suspension cables up to the roof */}
      <mesh position={[-7, 6, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 12, 8]} />
        <meshStandardMaterial color="#2a2a3e" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[7, 6, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 12, 8]} />
        <meshStandardMaterial color="#2a2a3e" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}
