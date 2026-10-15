// A friend drawn for the dex: its cultures laid out in their real
// arrangement (one, a pair, a triangle, a chain, a ring), in their strains'
// colours, on a small cell grid painted through the dish's bloom. Like Dr. E,
// each culture is darker at its core, lit at its membrane and seamed where it
// meets a partner, and the membrane flickers slowly. Unfound friends are dim
// silhouettes. One shared loop animates every specimen on screen at a few
// frames a second.
import { LIFEFORM_IDENTITIES, type LifeformIdentityId } from '../content/lifeformIdentity';
import type { DexEntry } from '../game/friendsDex';
import { drawBloomLayers } from './render';

export const SPECIMEN_TUNING = {
  gridSize: 32,
  pxPerCell: 4,
  fps: 8,
  wobble: 0.05,
  /** The membrane's wobble period and flicker step. */
  wobbleMs: 900,
  flickerMs: 140,
  flicker: 0.1,
  coreShade: 0.4,
  membraneLight: 0.38,
  seamLight: 0.22,
  silhouette: [28, 44, 48] as const,
  control: [255, 59, 69] as const,
};

type Rgb = readonly [number, number, number];

interface Blob {
  x: number;
  y: number;
  r: number;
  colour: Rgb;
}

/** Centres and radii (fractions of the grid) for an arrangement. */
export function layoutCultures(count: number, touching: ReadonlyArray<readonly [number, number]>): Array<{ x: number; y: number; r: number }> {
  if (count <= 1) return [{ x: 0, y: 0, r: 0.34 }];
  if (count === 2) return [{ x: -0.17, y: 0, r: 0.21 }, { x: 0.17, y: 0, r: 0.21 }];
  const degree = Array.from({ length: count }, (_, i) => touching.filter(([a, b]) => a === i || b === i).length);
  if (count === 3 && touching.length === 2) {
    // A chain: the culture touching both sits in the middle.
    const middle = degree.indexOf(2);
    const ends = [0, 1, 2].filter((i) => i !== middle);
    const out: Array<{ x: number; y: number; r: number }> = [];
    out[middle] = { x: 0, y: 0, r: 0.16 };
    out[ends[0]!] = { x: -0.3, y: 0, r: 0.16 };
    out[ends[1]!] = { x: 0.3, y: 0, r: 0.16 };
    return out;
  }
  if (count === 4 && touching.length === 4 && degree.every((d) => d === 2)) {
    // A ring: walk the cycle so neighbours sit on adjacent corners.
    const order = [0];
    while (order.length < 4) {
      const last = order[order.length - 1]!;
      const next = touching.map(([a, b]) => (a === last ? b : b === last ? a : -1)).find((n) => n >= 0 && !order.includes(n))!;
      order.push(next);
    }
    const out: Array<{ x: number; y: number; r: number }> = [];
    order.forEach((id, k) => {
      const angle = Math.PI / 4 + (k * Math.PI) / 2;
      out[id] = { x: Math.cos(angle) * 0.2, y: Math.sin(angle) * 0.2, r: 0.15 };
    });
    return out;
  }
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    return { x: Math.cos(angle) * 0.17, y: Math.sin(angle) * 0.17, r: 0.19 };
  });
}

function strainColour(strain: string): Rgb {
  if (strain === 'control') return SPECIMEN_TUNING.control;
  return LIFEFORM_IDENTITIES[strain as LifeformIdentityId]?.colors.primary ?? [91, 233, 214];
}

function shade(colour: Rgb, k: number): Rgb {
  const target = k >= 0 ? 255 : 0;
  const a = Math.abs(k);
  return [colour[0] + (target - colour[0]) * a, colour[1] + (target - colour[1]) * a, colour[2] + (target - colour[2]) * a];
}

function hash01(x: number, y: number, step: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(step | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

interface Specimen {
  canvas: HTMLCanvasElement;
  blobs: Blob[];
  found: boolean;
  seed: number;
  /** Reused every paint: the part grid, the grid-sized canvas and its pixels. */
  grid: Int8Array;
  offscreen: HTMLCanvasElement;
  image: ImageData;
}

const live = new Set<Specimen>();
let raf = 0;
let lastPaint = 0;

function paint(specimen: Specimen, timeMs: number, reducedMotion: boolean): void {
  const T = SPECIMEN_TUNING;
  const N = T.gridSize;
  const { canvas, blobs, found, grid, offscreen, image } = specimen;
  grid.fill(-1);
  image.data.fill(0);
  const step = reducedMotion ? 0 : Math.floor(timeMs / T.flickerMs);
  const w = reducedMotion ? 0 : timeMs / T.wobbleMs;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const px = (x - (N - 1) / 2) / N;
      const py = (y - (N - 1) / 2) / N;
      let best = -1;
      let bestScore = Infinity;
      blobs.forEach((blob, i) => {
        const angle = Math.atan2(py - blob.y, px - blob.x);
        const rim = blob.r * (1 + T.wobble * Math.sin(3 * angle + w + i + specimen.seed));
        const score = Math.hypot(px - blob.x, py - blob.y) / rim;
        if (score <= 1 && score < bestScore) {
          best = i;
          bestScore = score;
        }
      });
      grid[y * N + x] = best;
    }
  }
  const octx = offscreen.getContext('2d')!;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const part = grid[i]!;
      if (part < 0) continue;
      const at = (dx: number, dy: number) => {
        const nx = x + dx;
        const ny = y + dy;
        return nx < 0 || ny < 0 || nx >= N || ny >= N ? -1 : grid[ny * N + nx]!;
      };
      const neighbours = [at(1, 0), at(-1, 0), at(0, 1), at(0, -1)];
      const membrane = neighbours.includes(-1);
      // The membrane drops a cell now and then, like a living culture.
      if (membrane && found && hash01(x + specimen.seed, y, step) < T.flicker) continue;
      const blob = blobs[part]!;
      let colour: Rgb = found ? blob.colour : T.silhouette;
      if (found) {
        const r = Math.min(1, Math.hypot(x / N - 0.5 - blob.x, y / N - 0.5 - blob.y) / blob.r);
        colour = shade(colour, -T.coreShade * (1 - r) ** 1.3);
        if (membrane) colour = shade(blob.colour, T.membraneLight);
        else if (neighbours.some((n) => n !== part)) colour = shade(colour, T.seamLight);
      } else if (membrane || neighbours.some((n) => n !== part)) {
        colour = shade(colour, 0.12);
      }
      const o = i * 4;
      image.data[o] = colour[0];
      image.data[o + 1] = colour[1];
      image.data[o + 2] = colour[2];
      image.data[o + 3] = 255;
    }
  }
  octx.putImageData(image, 0, 0);
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (found) drawBloomLayers(ctx, offscreen, canvas.width, canvas.height, true);
  else {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
  }
}

function loop(now: number): void {
  raf = live.size > 0 ? requestAnimationFrame(loop) : 0;
  if (document.hidden || now - lastPaint < 1000 / SPECIMEN_TUNING.fps) return;
  lastPaint = now;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const specimen of live) {
    if (!specimen.canvas.isConnected) {
      live.delete(specimen);
      continue;
    }
    if (specimen.canvas.getClientRects().length === 0) continue;
    paint(specimen, now, reducedMotion);
  }
}

/** Draw `entry` into `canvas` and keep it alive while it is on screen. */
export function createSpecimen(canvas: HTMLCanvasElement, entry: DexEntry, found: boolean): { destroy(): void } {
  const T = SPECIMEN_TUNING;
  canvas.width = T.gridSize * T.pxPerCell;
  canvas.height = T.gridSize * T.pxPerCell;
  const strains = entry.strains.length > 0 ? entry.strains : ['swarmlet'];
  const layout = layoutCultures(strains.length, entry.touching);
  const offscreen = document.createElement('canvas');
  offscreen.width = T.gridSize;
  offscreen.height = T.gridSize;
  const specimen: Specimen = {
    canvas,
    found,
    seed: entry.number * 7,
    blobs: layout.map((spot, i) => ({ ...spot, colour: strainColour(strains[i]!) })),
    grid: new Int8Array(T.gridSize * T.gridSize),
    offscreen,
    image: offscreen.getContext('2d')!.createImageData(T.gridSize, T.gridSize),
  };
  live.add(specimen);
  paint(specimen, performance.now(), true);
  if (!raf) raf = requestAnimationFrame(loop);
  return { destroy: () => { live.delete(specimen); } };
}
