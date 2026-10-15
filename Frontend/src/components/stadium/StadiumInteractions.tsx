import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import Text from "./StadiumLabel";
import * as THREE from "three";
import { SEATS } from "./stadiumConfig";

export function SeatMarkers({
  onSelect,
}: {
  onSelect: (index: number) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <group>
      {SEATS.map((seat, i) => (
        <group
          key={seat.id}
          position={[seat.position[0], seat.position[1] + 3, seat.position[2]]}
        >
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              onSelect(i);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(i);
            }}
            onPointerOut={() => setHovered(null)}
          >
            <sphereGeometry args={[hovered === i ? 2 : 1.5, 16, 12]} />
            <meshBasicMaterial color={hovered === i ? "#ffffff" : "#b28aff"} />
          </mesh>
          <Text
            position={[0, 3, 0]}
            fontSize={1.4}
            color="#dcd0ef"
            outlineWidth={0.08}
            outlineColor="#171220"
            anchorX="center"
          >
            {i + 1} · {seat.label}
          </Text>
        </group>
      ))}
    </group>
  );
}

function XRButton({
  position,
  label,
  onClick,
}: {
  position: [number, number, number];
  label: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <group position={position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.73, 0.22, 0.04]} />
        <meshBasicMaterial color={hovered ? "#5e389b" : "#292038"} />
      </mesh>
      <Text
        position={[0, 0, 0.03]}
        fontSize={0.055}
        color="#e8e0f5"
        anchorX="center"
        raycast={() => null}
      >
        {label}
      </Text>
    </group>
  );
}

export function HeadsetMenu({
  seatIndex,
  soundOn,
  onSeat,
  onSound,
  onCheer,
  onExit,
}: {
  seatIndex: number;
  soundOn: boolean;
  onSeat: () => void;
  onSound: () => void;
  onCheer: () => void;
  onExit: () => void;
}) {
  const seat = SEATS[seatIndex];
  const yaw = Math.atan2(
    seat.position[0] - seat.target[0],
    seat.position[2] - seat.target[2],
  );
  return (
    <group position={[...seat.position]} rotation={[0, yaw, 0]}>
      <group position={[0, -0.35, -2]}>
        <mesh position={[0, 0, -0.02]}>
          <boxGeometry args={[1.75, 0.85, 0.04]} />
          <meshBasicMaterial color="#120d1b" />
        </mesh>
        <Text
          position={[0, 0.28, 0.02]}
          fontSize={0.06}
          color="#b28aff"
          raycast={() => null}
        >
          SPRX DEMO · {seat.label}
        </Text>
        <XRButton
          position={[-0.41, 0.07, 0]}
          label="Next seat"
          onClick={onSeat}
        />
        <XRButton
          position={[0.41, 0.07, 0]}
          label={soundOn ? "Mute crowd" : "Crowd on"}
          onClick={onSound}
        />
        <XRButton position={[-0.41, -0.2, 0]} label="Cheer" onClick={onCheer} />
        <XRButton position={[0.41, -0.2, 0]} label="Exit VR" onClick={onExit} />
      </group>
    </group>
  );
}

// A small offline football simulation gives the arena movement and scale.
// This is deliberately labelled as a demo, never a real sports broadcast.
export function DemoMatch({
  paused,
  goalSequence,
}: {
  paused: boolean;
  goalSequence: number;
}) {
  const red = useRef<THREE.InstancedMesh>(null);
  const blue = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const ball = useRef<THREE.Mesh>(null);
  const timer = useRef(0);
  const goalTimer = useRef(100);
  const lastGoal = useRef(goalSequence);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, delta) => {
    if (lastGoal.current !== goalSequence) {
      lastGoal.current = goalSequence;
      goalTimer.current = 0;
    }
    if (!paused) {
      timer.current += Math.min(delta, 0.05);
      goalTimer.current += Math.min(delta, 0.05);
    }
    const t = timer.current;
    for (let team = 0; team < 2; team++) {
      const mesh = team === 0 ? red.current : blue.current;
      if (!mesh || !heads.current) continue;
      for (let i = 0; i < 11; i++) {
        const keeper = i === 0;
        const x = keeper
          ? team
            ? 49
            : -49
          : (team ? 1 : -1) * (8 + (i % 4) * 9) + Math.sin(t * 0.5 + i) * 6;
        const z = keeper
          ? Math.sin(t * 0.6) * 2
          : ((i % 3) - 1) * 16 + Math.sin(t * 0.8 + i * 2 + team) * 5;
        dummy.position.set(
          x,
          0.95 + Math.abs(Math.sin(t * 7 + i)) * (keeper ? 0 : 0.08),
          z,
        );
        dummy.rotation.set(0, Math.sin(t * 0.5 + i), 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        dummy.position.y += 0.85;
        dummy.updateMatrix();
        heads.current.setMatrixAt(team * 11 + i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (heads.current) heads.current.instanceMatrix.needsUpdate = true;
    if (ball.current) {
      const shooting = goalTimer.current < 2;
      const p = Math.min(goalTimer.current / 1.8, 1);
      ball.current.position.set(
        shooting ? 25 + p * 29 : Math.sin(t * 0.38) * 32,
        shooting ? 0.22 + Math.sin(p * Math.PI) * 2 : 0.23,
        shooting ? (1 - p) * 8 : Math.cos(t * 0.6) * 19,
      );
      ball.current.rotation.z = -t * 3;
    }
  });
  return (
    <group>
      <instancedMesh
        ref={red}
        args={[undefined, undefined, 11]}
        castShadow
        frustumCulled={false}
      >
        <capsuleGeometry args={[0.3, 0.9, 4, 8]} />
        <meshStandardMaterial color="#ed554c" roughness={0.85} />
      </instancedMesh>
      <instancedMesh
        ref={blue}
        args={[undefined, undefined, 11]}
        castShadow
        frustumCulled={false}
      >
        <capsuleGeometry args={[0.3, 0.9, 4, 8]} />
        <meshStandardMaterial color="#62a5ff" roughness={0.85} />
      </instancedMesh>
      <instancedMesh
        ref={heads}
        args={[undefined, undefined, 22]}
        castShadow
        frustumCulled={false}
      >
        <sphereGeometry args={[0.23, 8, 8]} />
        <meshStandardMaterial color="#d8ad88" />
      </instancedMesh>
      <mesh ref={ball} castShadow>
        <sphereGeometry args={[0.23, 12, 12]} />
        <meshStandardMaterial
          color="#fafaf0"
          roughness={0.6}
          wireframe={false}
        />
      </mesh>
    </group>
  );
}
