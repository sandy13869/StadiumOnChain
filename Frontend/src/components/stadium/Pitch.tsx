import { useMemo } from "react";
import * as THREE from "three";

/**
 * Regulation soccer pitch (105m x 68m) with procedurally generated grass,
 * mown stripes, painted markings and goal frames. Everything is generated at
 * runtime so no external texture assets are required.
 */

export const PITCH_LENGTH = 105;
export const PITCH_WIDTH = 68;
export const HALF_LENGTH = PITCH_LENGTH / 2;
export const HALF_WIDTH = PITCH_WIDTH / 2;

const GOAL_WIDTH = 7.32;
const GOAL_HEIGHT = 2.44;
const GOAL_DEPTH = 2;

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function useGrassTexture() {
  return useMemo(() => {
    const size = 1024;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Base turf colour.
    ctx.fillStyle = "#2b9445";
    ctx.fillRect(0, 0, size, size);

    // Alternating mowing bands running across the pitch.
    const bands = 14;
    const bandWidth = size / bands;
    for (let i = 0; i < bands; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? "#33a552" : "#24873a";
      ctx.fillRect(i * bandWidth, 0, bandWidth, size);
    }

    // Fine grass speckle for surface variation.
    for (let i = 0; i < 140000; i += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const bright = Math.random() > 0.55;
      const r = bright ? 150 : 12;
      const g = bright ? 210 : 70;
      const b = bright ? 140 : 24;
      ctx.fillStyle = `rgba(${r},${g},${b},${0.03 + Math.random() * 0.07})`;
      ctx.fillRect(x, y, 1.6, 1.6);
    }

    // Soft diagonal wear patches to break up uniformity.
    for (let i = 0; i < 26; i += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 40 + Math.random() * 120;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, "rgba(120,160,60,0.16)");
      gradient.addColorStop(1, "rgba(120,160,60,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }, []);
}

/**
 * Painted markings are drawn on a transparent overlay so they never z-fight
 * with the grass and stay crisp when the camera is close.
 * Canvas scale: 10px per metre.
 */
function useMarkingsTexture() {
  return useMemo(() => {
    const px = 10;
    const width = PITCH_LENGTH * px;
    const height = PITCH_WIDTH * px;
    const canvas = makeCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const cx = width / 2;
    const cy = height / 2;
    const inset = 0.6 * px;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(240,248,244,0.92)";
    ctx.fillStyle = "rgba(240,248,244,0.92)";
    ctx.lineWidth = 0.14 * px;
    ctx.lineJoin = "round";

    // Touch lines and goal lines.
    ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);

    // Halfway line.
    ctx.beginPath();
    ctx.moveTo(cx, inset);
    ctx.lineTo(cx, height - inset);
    ctx.stroke();

    // Centre circle and spot.
    ctx.beginPath();
    ctx.arc(cx, cy, 9.15 * px, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 0.25 * px, 0, Math.PI * 2);
    ctx.fill();

    const penaltyAreaDepth = 16.5 * px;
    const penaltyAreaHalf = (40.32 / 2) * px;
    const goalAreaDepth = 5.5 * px;
    const goalAreaHalf = (18.32 / 2) * px;
    const penaltySpot = 11 * px;

    [-1, 1].forEach((dir) => {
      const goalLineX = dir === -1 ? inset : width - inset;

      // Penalty area.
      ctx.strokeRect(
        dir === -1 ? goalLineX : goalLineX - penaltyAreaDepth,
        cy - penaltyAreaHalf,
        penaltyAreaDepth,
        penaltyAreaHalf * 2
      );

      // Goal area.
      ctx.strokeRect(
        dir === -1 ? goalLineX : goalLineX - goalAreaDepth,
        cy - goalAreaHalf,
        goalAreaDepth,
        goalAreaHalf * 2
      );

      // Penalty spot.
      const spotX = goalLineX + dir * penaltySpot;
      ctx.beginPath();
      ctx.arc(spotX, cy, 0.25 * px, 0, Math.PI * 2);
      ctx.fill();

      // Penalty arc (only the portion outside the penalty area).
      ctx.beginPath();
      if (dir === -1) {
        ctx.arc(spotX, cy, 9.15 * px, -0.927, 0.927);
      } else {
        ctx.arc(spotX, cy, 9.15 * px, Math.PI - 0.927, Math.PI + 0.927);
      }
      ctx.stroke();
    });

    // Corner arcs.
    const cornerRadius = 1 * px;
    const corners: Array<[number, number, number, number]> = [
      [inset, inset, 0, Math.PI / 2],
      [width - inset, inset, Math.PI / 2, Math.PI],
      [width - inset, height - inset, Math.PI, Math.PI * 1.5],
      [inset, height - inset, Math.PI * 1.5, Math.PI * 2],
    ];
    corners.forEach(([x, y, start, end]) => {
      ctx.beginPath();
      ctx.arc(x, y, cornerRadius, start, end);
      ctx.stroke();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }, []);
}

function useNetTexture() {
  return useMemo(() => {
    const size = 128;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= 16; i += 1) {
      const p = (i * size) / 16;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);
}

function Goal({ side }: { side: -1 | 1 }) {
  const netTexture = useNetTexture();
  const postMaterial = useMemo(
    () => ({ color: "#f8fafc", metalness: 0.35, roughness: 0.35 }),
    []
  );

  const goalX = side * (HALF_LENGTH - 0.15);
  const halfGoal = GOAL_WIDTH / 2;

  const netMaterial = useMemo(() => {
    if (!netTexture) return null;
    const texture = netTexture.clone();
    texture.needsUpdate = true;
    texture.repeat.set(4, 3);
    return new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
      roughness: 0.9,
    });
  }, [netTexture]);

  const frameGeometry = useMemo(() => {
    const post = new THREE.CylinderGeometry(0.07, 0.07, GOAL_HEIGHT, 16);
    const bar = new THREE.CylinderGeometry(0.07, 0.07, GOAL_WIDTH, 16);
    return { post, bar };
  }, []);

  const backOffset = side * GOAL_DEPTH;

  return (
    <group position={[goalX, 0, 0]}>
      {/* Goal posts */}
      <mesh position={[0, GOAL_HEIGHT / 2, -halfGoal]} geometry={frameGeometry.post} castShadow>
        <meshStandardMaterial {...postMaterial} />
      </mesh>
      <mesh position={[0, GOAL_HEIGHT / 2, halfGoal]} geometry={frameGeometry.post} castShadow>
        <meshStandardMaterial {...postMaterial} />
      </mesh>
      {/* Crossbar */}
      <mesh
        position={[0, GOAL_HEIGHT, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        geometry={frameGeometry.bar}
        castShadow
      >
        <meshStandardMaterial {...postMaterial} />
      </mesh>

      {netMaterial && (
        <group>
          {/* Back net */}
          <mesh position={[backOffset, GOAL_HEIGHT / 2, 0]} material={netMaterial}>
            <planeGeometry args={[GOAL_WIDTH, GOAL_HEIGHT]} />
          </mesh>
          {/* Roof net */}
          <mesh
            position={[backOffset / 2, GOAL_HEIGHT, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            material={netMaterial}
          >
            <planeGeometry args={[GOAL_DEPTH, GOAL_WIDTH]} />
          </mesh>
          {/* Side nets */}
          <mesh
            position={[backOffset / 2, GOAL_HEIGHT / 2, -halfGoal]}
            rotation={[0, Math.PI / 2, 0]}
            material={netMaterial}
          >
            <planeGeometry args={[GOAL_DEPTH, GOAL_HEIGHT]} />
          </mesh>
          <mesh
            position={[backOffset / 2, GOAL_HEIGHT / 2, halfGoal]}
            rotation={[0, Math.PI / 2, 0]}
            material={netMaterial}
          >
            <planeGeometry args={[GOAL_DEPTH, GOAL_HEIGHT]} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default function Pitch() {
  const grassTexture = useGrassTexture();
  const markingsTexture = useMarkingsTexture();

  const surroundingsColor = useMemo(() => new THREE.Color("#0d2b1c"), []);

  return (
    <group>
      {/* Terrain / run-off area around the pitch. Sized to reach just under the
          front row of the stands without poking through the outer bowl wall. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[PITCH_LENGTH + 60, PITCH_WIDTH + 50]} />
        <meshStandardMaterial color={surroundingsColor} roughness={0.95} metalness={0} />
      </mesh>

      {/* Grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[PITCH_LENGTH, PITCH_WIDTH]} />
        <meshStandardMaterial
          map={grassTexture ?? undefined}
          color="#ffffff"
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Painted markings overlay */}
      {markingsTexture && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <planeGeometry args={[PITCH_LENGTH, PITCH_WIDTH]} />
          <meshStandardMaterial
            map={markingsTexture}
            transparent
            opacity={0.95}
            depthWrite={false}
            roughness={0.8}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      )}

      <Goal side={-1} />
      <Goal side={1} />

      {/* Corner flags */}
      {[
        [-HALF_LENGTH, -HALF_WIDTH],
        [-HALF_LENGTH, HALF_WIDTH],
        [HALF_LENGTH, -HALF_WIDTH],
        [HALF_LENGTH, HALF_WIDTH],
      ].map(([x, z]) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <mesh position={[0, 0.75, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 1.5, 8]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0.18, 1.4, 0]}>
            <planeGeometry args={[0.36, 0.24]} />
            <meshStandardMaterial color="#f5c542" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
