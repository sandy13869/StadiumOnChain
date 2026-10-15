export type NavigationMode = "seat" | "orbit" | "walk";
export const SEATS = [
  {
    id: "club",
    label: "Club level",
    section: "SOUTH · BLOCK 104",
    detail: "An elevated halfway-line view of the whole pitch.",
    position: [0, 8.8, 64],
    target: [0, 1, 0],
    row: "12",
    seat: "08",
  },
  {
    id: "front",
    label: "Front row",
    section: "SOUTH · BLOCK 101",
    detail: "Close to the touchline, right in the crowd.",
    position: [0, 2.5, 52.5],
    target: [0, 1.2, 0],
    row: "01",
    seat: "16",
  },
  {
    id: "goal",
    label: "Behind the goal",
    section: "EAST · BLOCK 112",
    detail: "See the action from the supporters’ end.",
    position: [76.5, 4.7, 0],
    target: [0, 1.2, 0],
    row: "05",
    seat: "24",
  },
] as const;
export const ORBIT_VIEW = {
  position: [0, 75, 115],
  target: [0, 0, 0],
} as const;
export const WALK_START = [0, 1.7, 43] as const;
export function clampWalkPosition(
  x: number,
  z: number,
): [number, number, number] {
  // The demo walk area stays inside the bowl, clear of tier geometry.
  return [Math.max(-65, Math.min(65, x)), 1.7, Math.max(-45, Math.min(45, z))];
}
export function movementAxes(keys: Set<string>): [number, number] {
  const x = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
  const z = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
  const length = Math.hypot(x, z) || 1;
  return [x / length, z / length];
}
