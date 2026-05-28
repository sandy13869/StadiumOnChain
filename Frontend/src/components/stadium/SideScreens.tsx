import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function SideScreens() {
  const leftScreenRef = useRef<THREE.Group>(null);
  const rightScreenRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (leftScreenRef.current) {
      leftScreenRef.current.rotation.y = Math.sin(time * 0.5) * 0.05 - 0.3;
    }
    if (rightScreenRef.current) {
      rightScreenRef.current.rotation.y = Math.cos(time * 0.5) * 0.05 + 0.3;
    }
  });

  return (
    <>
      {/* Left Screen */}
      <group ref={leftScreenRef} position={[-18, 6, -8]} rotation={[0, -0.3, 0]}>
        <mesh castShadow>
          <boxGeometry args={[8, 5, 0.3]} />
          <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.2]}>
          <planeGeometry args={[7.5, 4.5]} />
          <meshStandardMaterial 
            color="#000000"
            emissive="#00d395"
            emissiveIntensity={0.4}
            metalness={0.5}
            roughness={0.1}
          />
        </mesh>
        <mesh position={[-3.5, -4, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 8, 16]} />
          <meshStandardMaterial color="#2a2a3e" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Right Screen */}
      <group ref={rightScreenRef} position={[18, 6, -8]} rotation={[0, 0.3, 0]}>
        <mesh castShadow>
          <boxGeometry args={[8, 5, 0.3]} />
          <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.2]}>
          <planeGeometry args={[7.5, 4.5]} />
          <meshStandardMaterial 
            color="#000000"
            emissive="#ff4757"
            emissiveIntensity={0.4}
            metalness={0.5}
            roughness={0.1}
          />
        </mesh>
        <mesh position={[3.5, -4, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 8, 16]} />
          <meshStandardMaterial color="#2a2a3e" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </>
  );
}
