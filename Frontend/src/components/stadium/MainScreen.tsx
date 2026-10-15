import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HALF_WIDTH } from "./Pitch";
import { useBroadcastTexture, type FeedSource } from "./BroadcastFeed";

interface MainScreenProps {
  eventId?: number;
  feed: FeedSource;
}

/**
 * Jumbotron. It hangs from the underside of the roof canopy at the far end of
 * the ground, facing back down the pitch. The top edge meets the roof line so
 * it reads as a mounted structure rather than a floating box.
 *
 * The feed is painted onto the surface with a texture rather than an `<Html>`
 * iframe: DOM overlays are not drawn inside a WebXR session, so an iframe
 * would leave the screen blank the moment a headset is put on.
 */
export const SCREEN_Y = 17.5;
export const SCREEN_Z = -(HALF_WIDTH + 24);
const SCREEN_W = 26;
export const SCREEN_H = 10;
/** The lit area is inset so the emissive surface never bleeds past the bezel. */
const CONTENT_W = SCREEN_W - 1;
const CONTENT_H = SCREEN_H - 0.5;

export default function MainScreen({ feed }: MainScreenProps) {
  const screenRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const texture = useBroadcastTexture(feed);

  const accent = new THREE.Color(feed.accent);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.5 + Math.sin(time * 2) * 0.2;
    }

    // The wash cast by the screen onto the pitch picks up the feed's accent.
    if (lightRef.current) {
      lightRef.current.color.lerp(accent, 0.08);
      lightRef.current.intensity = 1.4 + Math.sin(time * 1.7) * 0.12;
    }
  });

  return (
    <group position={[0, SCREEN_Y, SCREEN_Z]}>
      {/* Screen Frame */}
      <mesh castShadow>
        <boxGeometry args={[SCREEN_W, SCREEN_H, 0.5]} />
        <meshStandardMaterial 
          color="#1a1a2e"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Screen Surface - the live feed itself. `toneMapped={false}` keeps the
          broadcast colours from being crushed by ACES tone mapping. */}
      <mesh position={[0, 0, 0.3]} ref={screenRef}>
        <planeGeometry args={[CONTENT_W, CONTENT_H]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>

      {/* Glow Effect */}
      <mesh position={[0, 0, 0.25]} ref={glowRef}>
        <planeGeometry args={[SCREEN_W + 0.5, SCREEN_H + 0.5]} />
        <meshStandardMaterial 
          color="#8247e5"
          emissive="#8247e5"
          emissiveIntensity={0.5}
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Suspension towers holding the jumbotron above the stand */}
      <mesh position={[-9, 8, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 16, 16]} />
        <meshStandardMaterial color="#2a2a3e" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[9, 8, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 16, 16]} />
        <meshStandardMaterial color="#2a2a3e" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Light spill from the screen onto the pitch */}
      <pointLight
        ref={lightRef}
        position={[0, 0, 6]}
        intensity={1.4}
        distance={60}
        color={feed.accent}
        decay={1.6}
      />
    </group>
  );
}
