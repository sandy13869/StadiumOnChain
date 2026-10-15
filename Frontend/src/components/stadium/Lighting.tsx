import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PITCH_LENGTH, PITCH_WIDTH } from "./Pitch";

/**
 * Stadium lighting rig built entirely from local lights (no external HDR),
 * so the scene loads and renders identically offline and on a headset.
 *
 * The pitch is 105m x 68m, so the shadow camera is sized to cover the whole
 * playing surface plus a margin for the surrounding track.
 */

/** Height of the floodlight pylon heads. */
const TOWER_HEIGHT = 34;
/** Pylon positions sit outside the pitch footprint. */
const TOWER_X = PITCH_LENGTH / 2 + 12;
const TOWER_Z = PITCH_WIDTH / 2 + 10;

interface FloodlightRigProps {
  /** Position of the pylon, in metres. */
  position: [number, number, number];
  /** Yaw applied to the lamp head so it faces the pitch centre. */
  rotationY: number;
  /** Colour of the lamp bank. */
  color: string;
  /** Intensity multiplier for the point light. */
  intensity: number;
}

function FloodlightRig({ position, rotationY, color, intensity }: FloodlightRigProps) {
  const lampRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (!lampRef.current) return;
    // Very subtle mains flicker - real floodlights are never perfectly steady.
    const flicker = 0.985 + Math.sin(state.clock.elapsedTime * 11.3) * 0.008;
    lampRef.current.intensity = intensity * flicker;
  });

  const lampGrid = useMemo(() => {
    const rows = 3;
    const cols = 5;
    const cells: Array<[number, number]> = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        cells.push([(c - (cols - 1) / 2) * 1.5, (r - (rows - 1) / 2) * 1.3]);
      }
    }
    return cells;
  }, []);

  return (
    <group position={position}>
      {/* Mast */}
      <mesh position={[0, TOWER_HEIGHT / 2, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.85, TOWER_HEIGHT, 10]} />
        <meshStandardMaterial color="#3a3f4a" metalness={0.75} roughness={0.45} />
      </mesh>

      {/* Base plinth */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.1, 2.6, 1.2, 12]} />
        <meshStandardMaterial color="#2b3038" metalness={0.5} roughness={0.7} />
      </mesh>

      {/* Lattice cross-bracing rings up the mast */}
      {[8, 14, 20, 26].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <torusGeometry args={[0.75, 0.09, 6, 12]} />
          <meshStandardMaterial color="#4a505c" metalness={0.7} roughness={0.5} />
        </mesh>
      ))}

      {/* Lamp head on a tilted yoke */}
      <group position={[0, TOWER_HEIGHT + 1.6, 0]} rotation={[0.42, rotationY, 0]}>
        <mesh castShadow>
          <boxGeometry args={[8.2, 4.4, 0.7]} />
          <meshStandardMaterial color="#22262e" metalness={0.7} roughness={0.35} />
        </mesh>

        {/* Individual lamp reflectors */}
        {lampGrid.map(([x, y]) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0.45]}>
            <circleGeometry args={[0.55, 16]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={2.4}
              roughness={0.15}
              metalness={0.2}
            />
          </mesh>
        ))}

        {/* Forward glow card */}
        <mesh position={[0, 0, 0.85]}>
          <planeGeometry args={[8.4, 4.6]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.22}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>

      <pointLight
        ref={lampRef}
        position={[0, TOWER_HEIGHT + 4, 0]}
        color={color}
        intensity={intensity}
        distance={190}
        decay={1.15}
      />
    </group>
  );
}

export default function Lighting() {
  const spotRef = useRef<THREE.SpotLight>(null);
  const rigRef = useRef<THREE.DirectionalLight>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Slow, deliberate sweep of the main broadcast spotlight.
    if (spotRef.current) {
      spotRef.current.position.x = Math.sin(time * 0.22) * 34;
      spotRef.current.position.z = Math.cos(time * 0.22) * 22;
    }

    // Gentle intensity breathing on the key light.
    if (rigRef.current) {
      rigRef.current.intensity = 1.05 + Math.sin(time * 0.6) * 0.06;
    }
  });

  return (
    <>
      {/* Night-sky ambient fill so nothing reads as pure black */}
      <ambientLight intensity={0.5} color="#9fb4d4" />
      <hemisphereLight intensity={0.6} color="#c7d8f5" groundColor="#1a4a2c" />

      {/* Key light from above - this is what casts the pitch shadows. The
          shadow camera is sized to cover the whole bowl, not just the pitch,
          otherwise the far tiers fall outside the frustum and stay unlit. */}
      <directionalLight
        ref={rigRef}
        position={[24, 58, 18]}
        intensity={1.25}
        color="#eef4ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-camera-left={-140}
        shadow-camera-right={140}
        shadow-camera-top={125}
        shadow-camera-bottom={-125}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
      />

      {/* Cool rim light from behind the far stand */}
      <directionalLight position={[-30, 32, -34]} intensity={0.5} color="#a8c4ff" />

      {/* Broadcast spotlight tracking across the pitch. Kept deliberately soft
          (wide angle, high penumbra, short range) so it brightens the playing
          surface without strobing the stands. */}
      <spotLight
        ref={spotRef}
        position={[0, 32, -18]}
        angle={0.55}
        penumbra={0.92}
        intensity={1.5}
        distance={90}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Four corner floodlight pylons */}
      <FloodlightRig position={[-TOWER_X, 0, -TOWER_Z]} rotationY={Math.PI * 0.75} color="#eef4ff" intensity={3.4} />
      <FloodlightRig position={[TOWER_X, 0, -TOWER_Z]} rotationY={-Math.PI * 0.75} color="#eef4ff" intensity={3.4} />
      <FloodlightRig position={[-TOWER_X, 0, TOWER_Z]} rotationY={Math.PI * 0.25} color="#eef4ff" intensity={3.4} />
      <FloodlightRig position={[TOWER_X, 0, TOWER_Z]} rotationY={-Math.PI * 0.25} color="#eef4ff" intensity={3.4} />

      {/* Fill so the stands on the near side are not left in the dark. */}
      <pointLight position={[0, 26, 62]} intensity={1.5} color="#f2f6ff" distance={150} decay={1.25} />

      {/* Sponsor-coloured accent wash, low to the ground */}
      <pointLight position={[-38, 4, 26]} intensity={0.6} color="#8247e5" distance={44} />
      <pointLight position={[38, 4, 26]} intensity={0.6} color="#00d395" distance={44} />
    </>
  );
}
