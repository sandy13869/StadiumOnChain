import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function Floor() {
  const floorRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (floorRef.current) {
      const material = floorRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <group>
      {/* Main Floor */}
      <mesh 
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]} 
        receiveShadow
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial 
          color="#0a0a0f"
          emissive="#8247e5"
          emissiveIntensity={0.1}
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>

      {/* Grid Pattern */}
      <gridHelper 
        args={[100, 50, "#8247e5", "#2a2a3e"]} 
        position={[0, 0.01, 0]}
      />

      {/* Stage Platform */}
      <mesh position={[0, 0.5, -12]} castShadow receiveShadow>
        <boxGeometry args={[22, 1, 8]} />
        <meshStandardMaterial 
          color="#1a1a2e"
          emissive="#8247e5"
          emissiveIntensity={0.2}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Stage Edge Lights */}
      <mesh position={[-11, 0.5, -8]} castShadow>
        <boxGeometry args={[0.2, 1, 8]} />
        <meshStandardMaterial 
          color="#8247e5"
          emissive="#8247e5"
          emissiveIntensity={1}
        />
      </mesh>
      <mesh position={[11, 0.5, -8]} castShadow>
        <boxGeometry args={[0.2, 1, 8]} />
        <meshStandardMaterial 
          color="#8247e5"
          emissive="#8247e5"
          emissiveIntensity={1}
        />
      </mesh>
    </group>
  );
}
