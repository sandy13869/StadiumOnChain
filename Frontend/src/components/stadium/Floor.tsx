import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The wider stadium grounds: the perimeter apron that surrounds the pitch bowl
 * and the access concourse. The playing surface itself lives in `Pitch.tsx`.
 */
export default function Floor() {
  const apronRef = useRef<THREE.Mesh>(null);

  const apronColor = useMemo(() => new THREE.Color("#070b14"), []);

  useFrame((state) => {
    if (!apronRef.current) return;
    const material = apronRef.current.material as THREE.MeshStandardMaterial;
    // Barely-there shimmer so the apron is not a dead flat plane.
    material.roughness = 0.94 + Math.sin(state.clock.elapsedTime * 0.4) * 0.03;
  });

  return (
    <group>
      {/* Perimeter apron extending well beyond the stands so the horizon
          never shows an edge. */}
      <mesh ref={apronRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <planeGeometry args={[520, 440]} />
        <meshStandardMaterial color={apronColor} roughness={0.95} metalness={0.08} />
      </mesh>

      {/* Concourse ring lighting strip around the bowl base */}
      {[
        [-96, 0, 0],
        [96, 0, 0],
        [0, 0, -72],
        [0, 0, 72],
      ].map(([x, y, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.12, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[x === 0 ? 180 : 2.2, x === 0 ? 2.2 : 140]} />
          <meshBasicMaterial color="#2f6fed" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
