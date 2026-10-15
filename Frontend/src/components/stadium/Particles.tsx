import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PITCH_LENGTH, PITCH_WIDTH } from "./Pitch";

interface ParticlesProps {
  /** Number of motes to draw. */
  count?: number;
}

/**
 * Thin haze / floating dust caught in the floodlight beams. Warm tint instead
 * of the old neon purple so it reads as stadium atmosphere.
 */
export default function Particles({ count = 900 }: ParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * (PITCH_LENGTH + 40);
      positions[i3 + 1] = Math.random() * 30 + 1;
      positions[i3 + 2] = (Math.random() - 0.5) * (PITCH_WIDTH + 40);

      // Warm floodlit haze with occasional cool rim highlights.
      const warm = Math.random() > 0.25;
      color.setHSL(
        warm ? 0.11 : 0.58,
        warm ? 0.35 : 0.4,
        0.72 + Math.random() * 0.2,
      );
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    return { positions, colors };
  }, [count]);

  useFrame((state, delta) => {
    if (!particlesRef.current) return;
    const time = state.clock.elapsedTime;
    const frameScale = Math.min(delta, 0.05) * 60;
    const positions = particlesRef.current.geometry.attributes.position
      .array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Gentle upward drift, slowly recycled.
      positions[i3 + 1] +=
        (0.012 + Math.sin(time * 0.4 + i) * 0.004) * frameScale;
      positions[i3] += Math.sin(time * 0.17 + i * 0.5) * 0.006 * frameScale;

      if (positions[i3 + 1] > 32) {
        positions[i3 + 1] = 1;
      }
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.16}
        vertexColors
        transparent
        opacity={0.42}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
