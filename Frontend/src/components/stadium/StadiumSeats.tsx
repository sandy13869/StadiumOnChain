import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function StadiumSeats() {
  const seatsRef = useRef<THREE.Group>(null);
  const audienceRefs = useRef<Array<THREE.Group | null>>([]);

  const seatPalette = ["#4b9bff", "#2ee39d", "#8247e5", "#ff6b6b", "#ffd166"];
  const seatData = useMemo(() => {
    const rows = 8;
    const seatsPerRow = 20;
    const generated = [] as Array<{
      key: string;
      x: number;
      y: number;
      z: number;
      rotationY: number;
      isOccupied: boolean;
      seatColor: string;
      shirtColor: string;
      phase: number;
    }>;

    for (let row = 0; row < rows; row++) {
      for (let seat = 0; seat < seatsPerRow; seat++) {
        const angle = ((seat - seatsPerRow / 2) / seatsPerRow) * Math.PI * 0.6;
        const radius = 15 + row * 1.5;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius - 5;
        const y = row * 0.8;
        const dx = -x;
        const dz = -15 - z;
        const rotationY = Math.atan2(dx, dz);
        const phase = (row * 13 + seat * 7) * 0.12;
        const occupiedSeed = (row * 31 + seat * 17) % 10;
        const isOccupied = occupiedSeed > 2;
        const seatColor = isOccupied ? "#8247e5" : "#2a2a3e";
        const shirtColor = seatPalette[(row + seat) % seatPalette.length];

        generated.push({
          key: `${row}-${seat}`,
          x,
          y,
          z,
          rotationY,
          isOccupied,
          seatColor,
          shirtColor,
          phase,
        });
      }
    }

    return generated;
  }, []);

  useFrame((state) => {
    if (seatsRef.current) {
      seatsRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.02;
    }

    audienceRefs.current.forEach((person) => {
      if (!person) return;
      const phase = Number(person.userData.phase || 0);
      person.position.y = 0.52 + Math.sin(state.clock.elapsedTime * 2 + phase) * 0.035;
      person.rotation.z = Math.sin(state.clock.elapsedTime * 1.5 + phase) * 0.06;
    });
  });

  const seats = seatData.map((seat, index) => (
        <group key={seat.key} position={[seat.x, seat.y, seat.z]} rotation={[0, seat.rotationY, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.6, 0.8, 0.6]} />
            <meshStandardMaterial 
              color={seat.seatColor}
              emissive={seat.isOccupied ? "#8247e5" : "#000000"}
              emissiveIntensity={seat.isOccupied ? 0.25 : 0}
              metalness={0.3}
              roughness={0.7}
            />
          </mesh>
          <mesh position={[0, 0.6, -0.25]} castShadow>
            <boxGeometry args={[0.6, 0.8, 0.1]} />
            <meshStandardMaterial 
              color={seat.seatColor}
              emissive={seat.isOccupied ? "#8247e5" : "#000000"}
              emissiveIntensity={seat.isOccupied ? 0.25 : 0}
              metalness={0.3}
              roughness={0.7}
            />
          </mesh>

          {seat.isOccupied && (
            <group
              ref={(node) => {
                audienceRefs.current[index] = node;
              }}
              userData={{ phase: seat.phase }}
              position={[0, 0.52, -0.04]}
            >
              <mesh castShadow>
                <capsuleGeometry args={[0.16, 0.34, 4, 8]} />
                <meshStandardMaterial color={seat.shirtColor} roughness={0.6} metalness={0.08} />
              </mesh>
              <mesh position={[0, 0.36, 0.01]} castShadow>
                <sphereGeometry args={[0.11, 14, 14]} />
                <meshStandardMaterial color="#f0c8a0" roughness={0.65} metalness={0.02} />
              </mesh>
            </group>
          )}
        </group>
  ));

  return <group ref={seatsRef}>{seats}</group>;
}
