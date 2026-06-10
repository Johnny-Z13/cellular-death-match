// Live cellular-automata icons for the lifeform rack. Each lifeform swatch gets
// a tiny grid of "cells" that jiggle on the spot, tinted to the organism's
// colour — so the rack reads as a dish full of living specimens. One shared
// requestAnimationFrame loop drives every registered icon (never one timer per
// icon), and only visible canvases are redrawn. Reduced-motion paints a single
// static frame.

const GRID = 11;            // cells per side — small + cheap, reads as a blob
const FPS = 12;             // icon sim is slow; the wobble doesn't need 60fps

interface IconCell {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  color: [number, number, number];
  seed: number;
  phase: number;
}

const reduceMotion = typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let icons: IconCell[] = [];
let running = false;
let lastFrameAt = 0;
let t = 0;

function hash(seed: number, x: number, y: number): number {
  let h = seed * 374761393 + x * 668265263 + y * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// A soft radial blob whose edge wobbles with time — cheap stand-in for a Potts
// colony breathing on the spot.
function drawIcon(icon: IconCell, time: number): void {
  const { ctx, color, seed } = icon;
  const w = icon.canvas.width;
  const cell = w / GRID;
  ctx.clearRect(0, 0, w, w);
  const mid = (GRID - 1) / 2;
  const phase = time * 0.0016 + icon.phase;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const dx = (x - mid) / mid;
      const dy = (y - mid) / mid;
      const dist = Math.hypot(dx, dy);
      // Wobbling membrane radius + per-cell flicker.
      const wobble = 0.16 * Math.sin(phase * 2 + x * 0.9 + y * 1.3)
        + 0.1 * Math.sin(phase * 3 - y);
      const edge = 0.82 + wobble;
      if (dist > edge) continue;
      const flick = hash(seed, x + Math.floor(phase * 2) % 7, y);
      if (dist > 0.5 && flick < 0.16) continue; // sparse, living edge
      const lit = 1 - dist / edge;
      const r = Math.min(255, color[0] + lit * 70);
      const g = Math.min(255, color[1] + lit * 70);
      const b = Math.min(255, color[2] + lit * 70);
      ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${0.35 + lit * 0.6})`;
      ctx.fillRect(Math.floor(x * cell), Math.floor(y * cell), Math.ceil(cell), Math.ceil(cell));
    }
  }
}

function tick(now: number): void {
  if (!running) return;
  if (now - lastFrameAt >= 1000 / FPS) {
    lastFrameAt = now;
    t = now;
    for (const icon of icons) {
      // Skip work for icons not currently on screen.
      if (icon.canvas.offsetParent === null) continue;
      drawIcon(icon, t);
    }
  }
  requestAnimationFrame(tick);
}

export interface IconCellAnimator {
  register(canvas: HTMLCanvasElement, color: [number, number, number], seed: number): void;
  reset(): void;
}

export function createIconCells(): IconCellAnimator {
  return {
    register(canvas, color, seed) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      const icon: IconCell = { canvas, ctx, color, seed, phase: hash(seed, 7, 3) * 6.28 };
      icons.push(icon);
      if (reduceMotion) {
        drawIcon(icon, 1000); // single static frame
        return;
      }
      if (!running) {
        running = true;
        requestAnimationFrame(tick);
      }
    },
    reset() {
      icons = [];
      running = false;
    },
  };
}
