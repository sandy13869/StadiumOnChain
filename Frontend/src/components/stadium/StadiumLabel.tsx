import { Children, useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";

// Local canvas labels remain visible in WebXR without fetching a font or using
// HTML overlays. Decorative labels do not intercept controller ray clicks.
export default function StadiumLabel({
  children,
  position,
  fontSize = 1,
  color = "#ffffff",
  outlineWidth = 0,
}: {
  children: ReactNode;
  position?: [number, number, number];
  fontSize?: number;
  color?: string;
  anchorX?: string;
  anchorY?: string;
  fontWeight?: string;
  outlineWidth?: number;
  outlineColor?: string;
  raycast?: unknown;
}) {
  const text = Children.toArray(children).join("");
  const { texture, ratio } = useMemo(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas text is unavailable");
    context.font = "600 80px system-ui, sans-serif";
    canvas.width = Math.min(
      2048,
      Math.ceil(context.measureText(text).width) + 32,
    );
    canvas.height = 128;
    context.font = "600 80px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    if (outlineWidth) {
      context.strokeStyle = "#0f0a17";
      context.lineWidth = 8;
      context.strokeText(text, canvas.width / 2, 64, canvas.width - 20);
    }
    context.fillStyle = "#ffffff";
    context.fillText(text, canvas.width / 2, 64, canvas.width - 20);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return { texture, ratio: canvas.width / canvas.height };
  }, [text, outlineWidth]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={position} raycast={() => {}}>
      <planeGeometry args={[fontSize * 1.6 * ratio, fontSize * 1.6]} />
      <meshBasicMaterial
        map={texture}
        color={color}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
