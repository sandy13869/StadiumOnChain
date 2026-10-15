import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PointerLockControls } from "@react-three/drei";
import { XROrigin, useXRControllerLocomotion } from "@react-three/xr";
import * as THREE from "three";
import {
  clampWalkPosition,
  movementAxes,
  ORBIT_VIEW,
  SEATS,
  WALK_START,
  type NavigationMode,
} from "./stadiumConfig";

interface NavigationProps {
  mode: NavigationMode;
  seatIndex: number;
  reset: number;
  onLock: (locked: boolean) => void;
}
export function DesktopNavigation({
  mode,
  seatIndex,
  reset,
  onLock,
}: NavigationProps) {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());
  const look = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const pointer = useRef<{ x: number; y: number; id: number } | null>(null);
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  useEffect(() => {
    const view = mode === "orbit" ? ORBIT_VIEW : SEATS[seatIndex];
    const position = mode === "walk" ? WALK_START : view.position;
    camera.position.set(position[0], position[1], position[2]);
    camera.lookAt(view.target[0], view.target[1], view.target[2]);
    look.current.setFromQuaternion(camera.quaternion, "YXZ");
    keys.current.clear();
    if (document.pointerLockElement) document.exitPointerLock();
  }, [camera, mode, seatIndex, reset]);
  useEffect(() => {
    const canvas = gl.domElement;
    const clear = () => {
      keys.current.clear();
      pointer.current = null;
    };
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT|BUTTON/.test(target.tagName)) return;
      if (
        document.activeElement !== canvas &&
        document.pointerLockElement !== canvas
      )
        return;
      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ShiftLeft",
          "ShiftRight",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
        ].includes(e.code)
      ) {
        e.preventDefault();
        keys.current.add(e.code);
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const start = (e: PointerEvent) => {
      if (mode !== "seat" || e.button !== 0) return;
      canvas.focus();
      pointer.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      const previous = pointer.current;
      if (!previous || mode !== "seat") return;
      look.current.y -= (e.clientX - previous.x) * 0.003;
      look.current.x = THREE.MathUtils.clamp(
        look.current.x - (e.clientY - previous.y) * 0.003,
        -1.25,
        1.25,
      );
      camera.quaternion.setFromEuler(look.current);
      previous.x = e.clientX;
      previous.y = e.clientY;
    };
    const stop = () => {
      pointer.current = null;
    };
    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    document.addEventListener("pointerlockchange", clear);
    return () => {
      clear();
      canvas.removeEventListener("pointerdown", start);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", stop);
      canvas.removeEventListener("pointercancel", stop);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
      document.removeEventListener("pointerlockchange", clear);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    };
  }, [camera, gl, mode]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (mode === "seat") {
      const yaw =
        Number(keys.current.has("ArrowLeft")) -
        Number(keys.current.has("ArrowRight"));
      const pitch =
        Number(keys.current.has("ArrowUp")) -
        Number(keys.current.has("ArrowDown"));
      if (yaw || pitch) {
        look.current.y += yaw * dt;
        look.current.x = THREE.MathUtils.clamp(
          look.current.x + pitch * dt,
          -1.25,
          1.25,
        );
        camera.quaternion.setFromEuler(look.current);
      }
    }
    if (mode !== "walk" || document.pointerLockElement !== gl.domElement)
      return;
    const [x, z] = movementAxes(keys.current);
    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(forward.current, camera.up).normalize();
    const speed =
      (keys.current.has("ShiftLeft") || keys.current.has("ShiftRight")
        ? 9
        : 4) * dt;
    camera.position
      .addScaledVector(forward.current, z * speed)
      .addScaledVector(right.current, x * speed);
    camera.position.set(
      ...clampWalkPosition(camera.position.x, camera.position.z),
    );
  });
  return (
    <>
      {mode === "orbit" && (
        <OrbitControls
          key={`${seatIndex}-${reset}`}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={[...ORBIT_VIEW.target]}
          minDistance={12}
          maxDistance={155}
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI / 2.08}
          enablePan={false}
        />
      )}
      {mode === "walk" && (
        <PointerLockControls
          domElement={gl.domElement}
          selector="#stadium-walk-lock"
          onLock={() => {
            gl.domElement.focus();
            onLock(true);
          }}
          onUnlock={() => onLock(false)}
        />
      )}
    </>
  );
}

// Feet, rather than the headset camera, are placed at the selected row.
// Seat changes are instantaneous in VR to avoid artificial camera acceleration.
export function HeadsetNavigation({ seatIndex }: { seatIndex: number }) {
  const origin = useRef<THREE.Group>(null);
  const seat = SEATS[seatIndex];
  useEffect(() => {
    if (!origin.current) return;
    origin.current.position.set(
      seat.position[0],
      seat.position[1] - 1.6,
      seat.position[2],
    );
    origin.current.rotation.y = Math.atan2(
      seat.position[0] - seat.target[0],
      seat.position[2] - seat.target[2],
    );
  }, [seat]);
  useXRControllerLocomotion(origin, false, { type: "snap", degrees: 30 });
  return <XROrigin ref={origin} />;
}
