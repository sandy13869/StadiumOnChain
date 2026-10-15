import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Supplies the texture painted onto the jumbotron.
 *
 * A DOM `<iframe>` (what this used to use) cannot be sampled into a WebGL
 * texture, and drei's `<Html>` layer is not drawn at all inside a WebXR
 * session - so the old screen went blank the moment you put a headset on.
 * A texture works everywhere: desktop, handheld and headset alike.
 *
 * Two sources are supported, in priority order:
 *   1. `src` - a direct, CORS-enabled video URL rendered through VideoTexture.
 *   2. A procedurally animated "broadcast" canvas, so the screen is always
 *      showing live content with no network access and no bundled assets.
 */

export interface FeedSource {
  /** Stable id, used as the React key when cycling feeds. */
  id: string;
  /** Human-readable label shown in the stadium controls. */
  label: string;
  /** Scoreline bug drawn over the feed, e.g. "ARS 2 - 1 CHE". */
  score: string;
  /** Accent colour for the HUD, ticker and screen glow. */
  accent: string;
  /** Optional direct video URL. Must send CORS headers to be usable. */
  src?: string;
  paused?: boolean;
  clock?: string;
}

/** Texture size. 2.5:1 matches the jumbotron's 25m x 9.5m content area. */
const W = 1280;
const H = 512;
/** Fraction of the canvas height taken up by the far stand. */
const HORIZON = H * 0.21;
/** How often the procedural feed redraws, in frames per second. */
const CANVAS_FPS = 24;

/** Small deterministic PRNG so the stands look the same every reload. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Maps pitch-space coordinates (0..1 across, 0..1 away) onto the canvas using
 * a simple one-point perspective, so the feed reads as a camera looking down
 * the field from behind one goal.
 */
function project(x: number, y: number) {
  const depth = Math.pow(y, 0.72);
  const sy = HORIZON + depth * (H - HORIZON);
  // 0.82 keeps a sliver of run-off visible either side of the touchlines.
  const halfW = (W / 2) * 0.82 * (0.16 + 0.84 * depth);
  return {
    sx: W / 2 + (x - 0.5) * 2 * halfW,
    sy,
    scale: 0.16 + 0.84 * depth,
  };
}

/** Traces a quad spanning the pitch from (x0,y0) to (x1,y1) in pitch space. */
function bandPath(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
) {
  const a = project(x0, y0);
  const b = project(x1, y0);
  const c = project(x1, y1);
  const d = project(x0, y1);
  ctx.beginPath();
  ctx.moveTo(a.sx, a.sy);
  ctx.lineTo(b.sx, b.sy);
  ctx.lineTo(c.sx, c.sy);
  ctx.lineTo(d.sx, d.sy);
  ctx.closePath();
}

/** Rounded rectangle path - `roundRect` is not available in every browser. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * The far stand never changes, so it is rendered once into an offscreen canvas
 * and blitted each frame. That keeps the per-frame cost to the pitch and the
 * handful of moving figures.
 */
function buildStandsLayer() {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = Math.ceil(HORIZON);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const rand = mulberry32(20260912);
  const gradient = ctx.createLinearGradient(0, 0, 0, HORIZON);
  gradient.addColorStop(0, "#0a0e18");
  gradient.addColorStop(1, "#151b2c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, HORIZON);

  // Tiered rows of spectators: brighter dots toward the front.
  const rows = 16;
  for (let r = 0; r < rows; r += 1) {
    const y = (r / rows) * HORIZON + 1;
    const brightness = 0.25 + (r / rows) * 0.6;
    const step = 4 + r * 0.35;
    for (let x = 2; x < W; x += step) {
      const jitterX = (rand() - 0.5) * step;
      const jitterY = (rand() - 0.5) * 2.4;
      const v = brightness * (0.5 + rand() * 0.5);
      const hue = rand() > 0.82 ? 40 : 215;
      ctx.fillStyle = `hsla(${hue}, ${hue === 40 ? 70 : 25}%, ${v * 55}%, ${0.5 + rand() * 0.5})`;
      ctx.fillRect(
        x + jitterX,
        y + jitterY,
        1.6 + rand() * 1.4,
        2 + rand() * 2,
      );
    }
  }

  // Roof shadow along the very top, and a lit walkway just above the pitch.
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, W, HORIZON * 0.22);
  ctx.fillStyle = "rgba(150, 190, 255, 0.10)";
  ctx.fillRect(0, HORIZON - 5, W, 5);

  return canvas;
}

interface Figure {
  /** Base position in pitch space. */
  x: number;
  y: number;
  /** Drift amplitude and phase, so each figure wanders independently. */
  fx: number;
  fy: number;
  ax: number;
  ay: number;
  team: 0 | 1;
}

function buildFigures(count: number) {
  const rand = mulberry32(778811);
  const figures: Figure[] = [];
  for (let i = 0; i < count; i += 1) {
    figures.push({
      x: 0.1 + rand() * 0.8,
      y: 0.08 + rand() * 0.84,
      fx: 0.6 + rand() * 0.9,
      fy: 0.5 + rand() * 0.7,
      ax: 0.06 + rand() * 0.12,
      ay: 0.04 + rand() * 0.09,
      team: rand() > 0.5 ? 1 : 0,
    });
  }
  return figures;
}

interface Painter {
  stands: HTMLCanvasElement;
  figures: Figure[];
  sponsors: string[];
}

const KITS = [
  ["#e8eef7", "#1d3f8f"],
  ["#f03d4e", "#2a1016"],
];

function paint(
  ctx: CanvasRenderingContext2D,
  painter: Painter,
  source: FeedSource,
  time: number,
) {
  // --- Stands + run-off --------------------------------------------------
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(painter.stands, 0, 0);

  // Run-off area around the pitch. Painted full-bleed so the slow camera pan
  // below can never expose an unpainted edge.
  ctx.fillStyle = "#15371f";
  ctx.fillRect(0, HORIZON, W, H - HORIZON);

  // Slow broadcast camera pan.
  const pan = Math.sin(time * 0.13) * W * 0.035;
  ctx.save();
  ctx.translate(pan, 0);

  // --- Pitch -------------------------------------------------------------
  ctx.fillStyle = "#216a33";
  bandPath(ctx, 0, 1, 0, 1);
  ctx.fill();

  // Mown stripes.
  const bands = 16;
  for (let i = 0; i < bands; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? "#2e8b46" : "#257038";
    bandPath(ctx, i / bands, (i + 1) / bands, 0, 1);
    ctx.fill();
  }

  // Markings: touchlines, halfway line, centre circle and penalty boxes.
  ctx.strokeStyle = "rgba(230, 245, 235, 0.55)";
  ctx.lineWidth = 2;
  const topLeft = project(0, 0);
  const topRight = project(1, 0);
  const bottomLeft = project(0, 1);
  const bottomRight = project(1, 1);
  ctx.beginPath();
  ctx.moveTo(topLeft.sx, topLeft.sy);
  ctx.lineTo(topRight.sx, topRight.sy);
  ctx.lineTo(bottomRight.sx, bottomRight.sy);
  ctx.lineTo(bottomLeft.sx, bottomLeft.sy);
  ctx.closePath();
  ctx.stroke();

  const halfA = project(0, 0.5);
  const halfB = project(1, 0.5);
  ctx.beginPath();
  ctx.moveTo(halfA.sx, halfA.sy);
  ctx.lineTo(halfB.sx, halfB.sy);
  ctx.stroke();

  const centre = project(0.5, 0.5);
  ctx.beginPath();
  ctx.ellipse(
    centre.sx,
    centre.sy,
    (halfB.sx - halfA.sx) * 0.09,
    14 * centre.scale,
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();

  [0.02, 0.98].forEach((y) => {
    ctx.beginPath();
    const a = project(0.26, y);
    const b = project(0.74, y);
    const c = project(0.74, y === 0.02 ? 0.15 : 0.85);
    const d = project(0.26, y === 0.02 ? 0.15 : 0.85);
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.lineTo(c.sx, c.sy);
    ctx.lineTo(d.sx, d.sy);
    ctx.closePath();
    ctx.stroke();
  });

  // --- Figures -----------------------------------------------------------
  const positions = painter.figures.map((f) => {
    const x = Math.min(
      0.98,
      Math.max(0.02, f.x + Math.sin(time * f.fx + f.y * 12) * f.ax),
    );
    const y = Math.min(
      0.98,
      Math.max(0.02, f.y + Math.cos(time * f.fy + f.x * 12) * f.ay),
    );
    return { x, y, team: f.team };
  });

  // Sort far-to-near so nearer figures overlap correctly.
  positions
    .map((p, i) => ({ p, i }))
    .sort((a, b) => a.p.y - b.p.y)
    .forEach(({ p }) => {
      const { sx, sy, scale } = project(p.x, p.y);
      const height = 13 * scale;
      const width = 5.6 * scale;

      // Contact shadow.
      ctx.fillStyle = "rgba(0,0,0,0.32)";
      ctx.beginPath();
      ctx.ellipse(sx, sy, width * 1.2, width * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shirt.
      const [primary, secondary] = KITS[p.team];
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.ellipse(
        sx,
        sy - height * 0.42,
        width * 0.62,
        height * 0.42,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      // Shorts.
      ctx.fillStyle = secondary;
      ctx.fillRect(sx - width * 0.5, sy - height * 0.12, width, height * 0.14);

      // Head.
      ctx.fillStyle = "#c98f6a";
      ctx.beginPath();
      ctx.arc(sx, sy - height * 0.95, width * 0.4, 0, Math.PI * 2);
      ctx.fill();
    });

  // Ball is passed between successive figures on a fixed cadence.
  const window = 2.6;
  const step = Math.floor(time / window);
  const from = positions[step % positions.length];
  const to = positions[(step + 1) % positions.length];
  const raw = (time % window) / window;
  const eased = raw * raw * (3 - 2 * raw);
  const ballX = from.x + (to.x - from.x) * eased;
  const ballY = from.y + (to.y - from.y) * eased;
  const ball = project(ballX, ballY);
  const hop = Math.sin(eased * Math.PI) * 9 * ball.scale;
  const ballR = 3.4 * ball.scale;

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(ball.sx, ball.sy, ballR * 1.1, ballR * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(ball.sx, ball.sy - hop, ballR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // --- Grade ------------------------------------------------------------
  // Vignette.
  const vignette = ctx.createRadialGradient(
    W / 2,
    H / 2,
    H * 0.35,
    W / 2,
    H / 2,
    W * 0.72,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // LED scanlines - this is what sells it as a screen rather than a window.
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  for (let y = 0; y < H; y += 4) {
    ctx.fillRect(0, y, W, 1.4);
  }

  // --- HUD --------------------------------------------------------------
  const accent = source.accent;

  // Score bug, top-left.
  ctx.fillStyle = "rgba(6, 10, 20, 0.76)";
  roundRect(ctx, 26, 22, 372, 74, 10);
  ctx.fill();
  ctx.fillStyle = accent;
  roundRect(ctx, 26, 22, 9, 74, 4);
  ctx.fill();

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(58, 46, 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "bold 21px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(source.src ? "VIDEO" : "DEMO", 74, 47);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 34px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText(source.score, 52, 80);

  // Clock, top-right.
  const minutes = Math.floor(time / 60) % 90;
  const seconds = Math.floor(time) % 60;
  const clock = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  ctx.fillStyle = "rgba(6, 10, 20, 0.76)";
  roundRect(ctx, W - 178, 22, 152, 52, 10);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "bold 30px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(source.clock ?? clock, W - 102, 49);
  ctx.textAlign = "left";

  // Sponsor ticker along the bottom.
  ctx.fillStyle = "rgba(6, 10, 20, 0.80)";
  ctx.fillRect(0, H - 44, W, 44);
  ctx.fillStyle = accent;
  ctx.fillRect(0, H - 44, W, 3);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, H - 44, W, 44);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.font = "bold 19px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  const ticker = `${painter.sponsors.join("     ·     ")}     ·     `;
  const tickerWidth = ctx.measureText(ticker).width;
  const offset = (time * 78) % tickerWidth;
  for (let x = -offset; x < W; x += tickerWidth) {
    ctx.fillText(ticker, x, H - 16);
  }
  ctx.restore();

  // Replay flash every ~19s.
  const cycle = time % 19;
  if (cycle < 2.6) {
    const alpha =
      cycle < 0.5 ? cycle / 0.5 : cycle > 2.1 ? (2.6 - cycle) / 0.5 : 1;
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * alpha})`;
    ctx.lineWidth = 8;
    ctx.strokeRect(14, 14, W - 28, H - 28);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.font =
      "bold 62px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("REPLAY", W / 2, H / 2 - 18);
    ctx.textAlign = "left";
  }
}

/**
 * Wraps a real video file in a `VideoTexture`. Returns null whenever there is
 * no source, or the source fails to load - in which case the caller keeps
 * using the procedural feed.
 */
function useVideoTexture(src: string | undefined) {
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null);

  useEffect(() => {
    if (!src) {
      setTexture(null);
      return;
    }

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = src;

    const created = new THREE.VideoTexture(video);
    created.colorSpace = THREE.SRGBColorSpace;
    created.minFilter = THREE.LinearFilter;
    created.generateMipmaps = false;

    let cancelled = false;

    const onReady = () => {
      if (cancelled) return;
      created.needsUpdate = true;
      video.play().catch(() => undefined);
    };
    const onError = () => {
      if (cancelled) return;
      // Fall back to the procedural feed rather than showing a black rectangle.
      setTexture(null);
    };

    video.addEventListener("loadeddata", onReady);
    video.addEventListener("error", onError);

    setTexture(created);
    video.load();

    return () => {
      cancelled = true;
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onError);
      video.pause();
      video.removeAttribute("src");
      video.load();
      created.dispose();
    };
  }, [src]);

  return texture;
}

/**
 * The always-available procedural feed. Returns a texture that is repainted at
 * `CANVAS_FPS`, which is plenty for a distant jumbotron and keeps the main
 * render loop free for the stadium itself.
 */
function useProceduralTexture(source: FeedSource) {
  const sourceRef = useRef(source);
  sourceRef.current = source;

  const painter = useMemo<Painter | null>(() => {
    if (typeof document === "undefined") return null;
    return {
      stands: buildStandsLayer(),
      figures: buildFigures(20),
      sponsors: [
        "SPRX",
        "POLYGON",
        "AMOY CUP",
        "TOKENIZED ACCESS",
        "USDC PAYMENTS",
      ],
    };
  }, []);

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const created = new THREE.CanvasTexture(canvas);
    created.colorSpace = THREE.SRGBColorSpace;
    created.minFilter = THREE.LinearFilter;
    created.generateMipmaps = false;
    return created;
  }, []);

  const accumulator = useRef(0);
  const playbackTime = useRef(0);

  useFrame((_, delta) => {
    if (!painter) return;
    if (!sourceRef.current.paused) playbackTime.current += delta;
    accumulator.current += delta;
    const interval = 1 / CANVAS_FPS;
    if (accumulator.current < interval) return;
    accumulator.current %= interval;

    const canvas = texture.image as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paint(ctx, painter, sourceRef.current, playbackTime.current);
    texture.needsUpdate = true;
  });

  useEffect(() => () => texture.dispose(), [texture]);

  return texture;
}

/** Picks the best available feed for the jumbotron. */
export function useBroadcastTexture(source: FeedSource) {
  const video = useVideoTexture(source.src);
  const procedural = useProceduralTexture(source);
  return video ?? procedural;
}
