import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface MainScreenProps {
  eventId?: number;
  youtubeEmbedUrl?: string;
}

export default function MainScreen({ eventId, youtubeEmbedUrl }: MainScreenProps) {
  const screenRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <group position={[0, 8, -15]}>
      {/* Screen Frame */}
      <mesh castShadow>
        <boxGeometry args={[18, 10, 0.5]} />
        <meshStandardMaterial 
          color="#1a1a2e"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Screen Surface */}
      <mesh position={[0, 0, 0.3]} ref={screenRef}>
        <planeGeometry args={[17, 9.5]} />
        <meshStandardMaterial 
          color="#000000"
          emissive="#8247e5"
          emissiveIntensity={0.3}
          metalness={0.5}
          roughness={0.1}
        />
      </mesh>

      {/* Glow Effect */}
      <mesh position={[0, 0, 0.25]} ref={glowRef}>
        <planeGeometry args={[17.5, 10]} />
        <meshStandardMaterial 
          color="#8247e5"
          emissive="#8247e5"
          emissiveIntensity={0.5}
          transparent
          opacity={0.3}
        />
      </mesh>

      <Html transform position={[0, 0, 0.36]} distanceFactor={8}>
        <div className="stadium-screen-video-shell">
          {youtubeEmbedUrl ? (
            <iframe
              className="stadium-screen-video"
              src={youtubeEmbedUrl}
              title="Stadium Screen Feed"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="stadium-screen-video stadium-screen-fallback">No feed available</div>
          )}
        </div>
      </Html>

      {/* Support Pillars */}
      <mesh position={[-8, -6, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 12, 16]} />
        <meshStandardMaterial color="#2a2a3e" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[8, -6, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 12, 16]} />
        <meshStandardMaterial color="#2a2a3e" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}
