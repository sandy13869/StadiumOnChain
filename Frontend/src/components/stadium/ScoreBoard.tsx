import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

export default function ScoreBoard() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = 14 + Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={[0, 14, -15]}>
      {/* Scoreboard Background */}
      <mesh castShadow>
        <boxGeometry args={[12, 3, 0.3]} />
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
        <boxGeometry args={[12.2, 3.2, 0.1]} />
        <meshStandardMaterial 
          color="#8247e5"
          emissive="#8247e5"
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Team 1 */}
      <Text
        position={[-4, 0.5, 0.3]}
        fontSize={0.8}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        TEAM A
      </Text>
      <Text
        position={[-4, -0.5, 0.3]}
        fontSize={1.2}
        color="#00d395"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        2
      </Text>

      {/* VS */}
      <Text
        position={[0, 0, 0.3]}
        fontSize={0.6}
        color="#a0a0a0"
        anchorX="center"
        anchorY="middle"
      >
        VS
      </Text>

      {/* Team 2 */}
      <Text
        position={[4, 0.5, 0.3]}
        fontSize={0.8}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        TEAM B
      </Text>
      <Text
        position={[4, -0.5, 0.3]}
        fontSize={1.2}
        color="#ff4757"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        1
      </Text>

      {/* Support */}
      <mesh position={[-5.5, -3, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 6, 16]} />
        <meshStandardMaterial color="#2a2a3e" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[5.5, -3, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 6, 16]} />
        <meshStandardMaterial color="#2a2a3e" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}
