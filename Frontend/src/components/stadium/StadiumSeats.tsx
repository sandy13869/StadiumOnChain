import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SEATS } from "./stadiumConfig";

/**
 * Tiered stadium bowl built around the 105m x 68m pitch.
 *
 * Everything heavy is instanced: the concrete tiers/roof are merged into two
 * meshes, and the ~14k seats plus the crowd are drawn with a handful of
 * InstancedMesh batches. That keeps draw calls low enough for standalone VR.
 */

/** Number of seating tiers. */
const ROWS = 24;
/** Vertical rise between tiers. */
const ROW_RISE = 0.55;
/** Horizontal depth of each tier. */
const ROW_DEPTH = 0.95;
/** Every N tiers a wider vomitory/access step is inserted. */
const WALK_GAP_EVERY = 8;
/** Polygon resolution used for the bowl outline. */
const SEGMENTS = 144;
/** Distance from pitch centre to the front row (half-extents). */
const INNER_HX = 72;
const INNER_HZ = 52;
/** Lateral distance between two seats. */
const SEAT_SPACING = 0.72;
/** Superellipse exponent - higher = straighter sides, tighter corners. */
const SUPER_ELLIPSE = 3.4;
/** Fraction of seats that have somebody in them. */
const OCCUPANCY = 0.7;

const SHIRT_COLORS = [
  "#e8564b",
  "#3f8fe0",
  "#f2c14e",
  "#5ec98a",
  "#a86fe0",
  "#e8e8ea",
];
const SEAT_COLORS = ["#2b3245", "#3a4360", "#8247e5"];
const SKIN_TONES = ["#f0c8a0", "#c98f66", "#8a5a3b"];

function lerp3(offset: number, k: number) {
  return offset * k;
}

/** Sample the bowl outline as a superellipse (stadium-ish rounded rectangle). */
function samplePolygon(hx: number, hz: number, segments: number) {
  const pts: THREE.Vector2[] = [];
  const power = 2 / SUPER_ELLIPSE;
  for (let i = 0; i < segments; i += 1) {
    const t = (i / segments) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = hx * Math.sign(c) * Math.abs(c) ** power;
    const z = hz * Math.sign(s) * Math.abs(s) ** power;
    pts.push(new THREE.Vector2(x, z));
  }
  return pts;
}

function polygonLength(pts: THREE.Vector2[]) {
  let total = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    total += a.distanceTo(b);
  }
  return total;
}

/**
 * Append a quad strip between two corresponding polygons. Passing the same
 * polygon for both produces a vertical wall.
 */
function pushBand(
  target: number[],
  innerPts: THREE.Vector2[],
  outerPts: THREE.Vector2[],
  yInner: number,
  yOuter: number,
  flip = false,
) {
  const n = innerPts.length;
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    const a = innerPts[i];
    const b = innerPts[j];
    const c = outerPts[j];
    const d = outerPts[i];

    const aY = yInner;
    const bY = yInner;
    const cY = yOuter;
    const dY = yOuter;

    if (!flip) {
      target.push(a.x, aY, a.y, b.x, bY, b.y, c.x, cY, c.y);
      target.push(a.x, aY, a.y, c.x, cY, c.y, d.x, dY, d.y);
    } else {
      target.push(a.x, aY, a.y, c.x, cY, c.y, b.x, bY, b.y);
      target.push(a.x, aY, a.y, d.x, dY, d.y, c.x, cY, c.y);
    }
  }
}

function geometryFromPositions(positions: number[]) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

interface IPerson {
  matrix: THREE.Matrix4;
  phase: number;
}

export default function StadiumSeats({
  cheering = false,
}: {
  cheering?: boolean;
}) {
  const bowlRef = useRef<THREE.Group>(null);
  const cheerUniform = useRef({ value: 0 });
  const timeUniform = useRef({ value: 0 });

  /** Build the tier layout once. */
  const layout = useMemo(() => {
    const rows: Array<{
      innerHx: number;
      innerHz: number;
      outerHx: number;
      outerHz: number;
      baseY: number;
      topY: number;
    }> = [];

    let y = 0;
    let offset = 0;
    for (let r = 0; r < ROWS; r += 1) {
      if (r > 0 && r % WALK_GAP_EVERY === 0) {
        offset += 0.85;
      }
      const innerHx = INNER_HX + offset;
      const innerHz = INNER_HZ + offset;
      const topY = y + ROW_RISE;
      rows.push({
        innerHx,
        innerHz,
        outerHx: innerHx + ROW_DEPTH,
        outerHz: innerHz + ROW_DEPTH,
        baseY: y,
        topY,
      });
      y = topY;
      offset += ROW_DEPTH;
    }
    return rows;
  }, []);

  const { bowlGeometry, roofGeometry } = useMemo(() => {
    const bowl: number[] = [];

    layout.forEach((row) => {
      const inner = samplePolygon(row.innerHx, row.innerHz, SEGMENTS);
      const outer = samplePolygon(row.outerHx, row.outerHz, SEGMENTS);
      // Front riser (vertical face of this tier).
      pushBand(bowl, inner, inner, row.baseY, row.topY, true);
      // Tread (where the seats are bolted).
      pushBand(bowl, inner, outer, row.topY, row.topY);
    });

    const last = layout[layout.length - 1];
    const lastOuter = samplePolygon(last.outerHx, last.outerHz, SEGMENTS);
    const roofY = last.topY + 12;

    // Back wall rising from the last tier up to the roof line.
    pushBand(bowl, lastOuter, lastOuter, last.topY, roofY, true);

    // --- Roof canopy ---------------------------------------------------
    // The canopy springs from the back wall and cantilevers *inward* over the
    // top few tiers, which is what shades the crowd in a real ground. Both the
    // inner lip and the outer fascia are tied to the wall so no seam can open.
    const roof: number[] = [];
    const roofInner = samplePolygon(
      last.outerHx - 16,
      last.outerHz - 16,
      SEGMENTS,
    );
    const roofOuter = samplePolygon(
      last.outerHx + 6,
      last.outerHz + 6,
      SEGMENTS,
    );
    pushBand(roof, roofInner, roofOuter, roofY, roofY);
    // Fascia drop hanging off the outer rim.
    pushBand(roof, roofOuter, roofOuter, roofY, roofY - 4.5, true);
    // Deep inner lip so the canopy reads as a substantial soffit from pitch
    // level instead of a razor-thin sheet, and closes the inner edge.
    pushBand(roof, roofInner, roofInner, roofY, roofY - 2.6, true);

    return {
      bowlGeometry: geometryFromPositions(bowl),
      roofGeometry: geometryFromPositions(roof),
    };
  }, [layout]);

  /** Concrete + roof materials. */
  const bowlMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#4a5064",
        roughness: 0.92,
        metalness: 0.05,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const roofMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1d2231",
        roughness: 0.55,
        metalness: 0.35,
        side: THREE.DoubleSide,
      }),
    [],
  );

  /**
   * Crowd materials get a tiny vertex-shader bob so every supporter moves
   * independently without touching instance matrices each frame.
   */
  const makeCrowdMaterial = (color: string) => {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.72,
      metalness: 0.05,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = timeUniform.current;
      shader.uniforms.uCheer = cheerUniform.current;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nattribute float aPhase;\nuniform float uTime;\nuniform float uCheer;",
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          transformed.y += sin(uTime * (2.1 + uCheer * 5.0) + aPhase) * (0.055 + uCheer * 0.25);
          transformed.x += sin(uTime * 1.3 + aPhase * 1.7) * 0.02;`,
        );
    };
    return material;
  };

  /** Seat + crowd instancing, grouped by colour for cheap batching. */
  const batches = useMemo(() => {
    const seatsByColor: THREE.Matrix4[][] = SEAT_COLORS.map(() => []);
    const bodiesByShirt: IPerson[][] = SHIRT_COLORS.map(() => []);
    const headsBySkin: Array<Array<{ matrix: THREE.Matrix4; phase: number }>> =
      SKIN_TONES.map(() => []);

    const dummy = new THREE.Object3D();
    let seatIndex = 0;

    layout.forEach((row, rowIdx) => {
      const centreHx = (row.innerHx + row.outerHx) / 2;
      const centreHz = (row.innerHz + row.outerHz) / 2;
      const ring = samplePolygon(centreHx, centreHz, SEGMENTS);
      const perimeter = polygonLength(ring);
      const count = Math.max(8, Math.round(perimeter / SEAT_SPACING));
      const seatY = row.topY + 0.02;

      for (let s = 0; s < count; s += 1) {
        // Sample the ring by arc length so seats are evenly spread.
        const targetLen = (s / count) * perimeter;
        let travelled = 0;
        let point = ring[0];
        for (let i = 0; i < ring.length; i += 1) {
          const a = ring[i];
          const b = ring[(i + 1) % ring.length];
          const segLen = a.distanceTo(b);
          if (travelled + segLen >= targetLen) {
            const t = (targetLen - travelled) / (segLen || 1);
            point = new THREE.Vector2().lerpVectors(a, b, t);
            break;
          }
          travelled += segLen;
        }

        // Thin access aisles every so often.
        if (s % 46 < 2) continue;

        const px = point.x;
        const pz = point.y;
        // Seats face the pitch centre.
        const rotationY = Math.atan2(-px, -pz);

        dummy.position.set(px, seatY, pz);
        dummy.rotation.set(0, rotationY, 0);
        dummy.updateMatrix();

        const reserved = SEATS.some(
          (seat) =>
            Math.hypot(px - seat.position[0], pz - seat.position[2]) < 1.8,
        );
        const occupied =
          !reserved &&
          (seatIndex * 7919 + rowIdx * 104729) % 100 < OCCUPANCY * 100;

        const colorIndex = occupied ? 2 : seatIndex % 2 === 0 ? 0 : 1;
        seatsByColor[colorIndex].push(dummy.matrix.clone());

        if (occupied) {
          const phase = (seatIndex % 628) * 0.01 + rowIdx * 0.37;

          // Person body sits on the cushion: seat matrix + 0.36m up, 2cm forward.
          const bodyMatrix = new THREE.Matrix4()
            .copy(dummy.matrix)
            .multiply(new THREE.Matrix4().makeTranslation(0, 0.36, 0.02));

          const shirtIndex =
            (seatIndex * 31 + rowIdx * 7) % SHIRT_COLORS.length;
          bodiesByShirt[shirtIndex].push({ matrix: bodyMatrix, phase });

          // Head.
          const headMatrix = new THREE.Matrix4()
            .copy(bodyMatrix)
            .multiply(new THREE.Matrix4().makeTranslation(0, 0.36, 0.01));
          const skinIndex = (seatIndex * 17 + rowIdx * 3) % SKIN_TONES.length;
          headsBySkin[skinIndex].push({ matrix: headMatrix, phase });
        }

        seatIndex += 1;
      }
    });

    const meshes: THREE.Mesh[] = [];

    // --- Seat cushions -------------------------------------------------
    const cushionGeometry = new THREE.BoxGeometry(0.52, 0.14, 0.5);
    const backrestGeometry = new THREE.BoxGeometry(0.52, 0.42, 0.08);
    const seatMaterials = SEAT_COLORS.map(
      (color) =>
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.78,
          metalness: 0.12,
        }),
    );

    seatsByColor.forEach((matrices, index) => {
      if (!matrices.length) return;
      const cushions = new THREE.InstancedMesh(
        cushionGeometry,
        seatMaterials[index],
        matrices.length,
      );
      const backs = new THREE.InstancedMesh(
        backrestGeometry,
        seatMaterials[index],
        matrices.length,
      );
      const backOffset = new THREE.Matrix4().makeTranslation(0, 0.28, -0.21);
      matrices.forEach((m, i) => {
        cushions.setMatrixAt(i, m);
        backs.setMatrixAt(i, new THREE.Matrix4().copy(m).multiply(backOffset));
      });
      cushions.instanceMatrix.needsUpdate = true;
      backs.instanceMatrix.needsUpdate = true;
      cushions.receiveShadow = true;
      backs.receiveShadow = true;
      meshes.push(cushions, backs);
    });

    // --- Crowd ---------------------------------------------------------
    // Each batch gets its OWN geometry: the per-instance `aPhase` attribute is
    // attached to the geometry, so sharing one would make batches clobber
    // each other's phases.
    const torsoGeometry = new THREE.CapsuleGeometry(0.15, 0.3, 3, 6);
    const headGeometry = new THREE.SphereGeometry(0.105, 10, 8);

    bodiesByShirt.forEach((people, index) => {
      if (!people.length) return;
      const material = makeCrowdMaterial(SHIRT_COLORS[index]);
      const geometry = torsoGeometry.clone();
      const mesh = new THREE.InstancedMesh(geometry, material, people.length);
      const phases = new Float32Array(people.length);
      people.forEach((p, i) => {
        mesh.setMatrixAt(i, p.matrix);
        phases[i] = p.phase;
      });
      geometry.setAttribute(
        "aPhase",
        new THREE.InstancedBufferAttribute(phases, 1),
      );
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      meshes.push(mesh);
    });

    headsBySkin.forEach((people, index) => {
      if (!people.length) return;
      const material = makeCrowdMaterial(SKIN_TONES[index]);
      const geometry = headGeometry.clone();
      const mesh = new THREE.InstancedMesh(geometry, material, people.length);
      const phases = new Float32Array(people.length);
      people.forEach((p, i) => {
        mesh.setMatrixAt(i, p.matrix);
        phases[i] = p.phase;
      });
      geometry.setAttribute(
        "aPhase",
        new THREE.InstancedBufferAttribute(phases, 1),
      );
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      meshes.push(mesh);
    });

    // The prototypes were only templates for `.clone()`.
    torsoGeometry.dispose();
    headGeometry.dispose();

    return { meshes };
  }, [layout]);

  useFrame((state) => {
    timeUniform.current.value = state.clock.elapsedTime;
    cheerUniform.current.value = THREE.MathUtils.lerp(
      cheerUniform.current.value,
      cheering ? 1 : 0,
      0.08,
    );
  });

  /** Clean up generated GPU resources. */
  useEffect(() => {
    return () => {
      bowlGeometry.dispose();
      roofGeometry.dispose();
      bowlMaterial.dispose();
      roofMaterial.dispose();
      batches.meshes.forEach((mesh) => {
        mesh.geometry.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[];
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material.dispose();
      });
    };
  }, [bowlGeometry, roofGeometry, bowlMaterial, roofMaterial, batches]);

  return (
    <group ref={bowlRef}>
      {/* Concrete tiers and back wall */}
      <mesh geometry={bowlGeometry} material={bowlMaterial} receiveShadow />
      {/* Roof canopy */}
      <mesh geometry={roofGeometry} material={roofMaterial} castShadow />

      {/* Instanced seats and crowd */}
      {batches.meshes.map((mesh, index) => (
        <primitive key={index} object={mesh} />
      ))}
    </group>
  );
}
