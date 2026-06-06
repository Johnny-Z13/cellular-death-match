import type { SimState, CellId } from '../sim/types';
import { type EnemySpawn } from '../content/enemies';
import type { TraitId } from '../content/ecology';
import { lifeformIdentityForSpawn } from '../content/lifeformIdentity';
import type { DishEventMarker } from '../game/arena';

export interface Renderer {
  render(
    state: SimState,
    archetypes?: ReadonlyMap<CellId, EnemySpawn>,
    dishEvents?: readonly DishEventMarker[],
  ): void;
}

const DISH_EVENT_PALETTES = {
  mutation: ['#f6d365', '#fda085', '#b771ff', '#66e3ff'],
  fold: ['#8f7cff', '#45f0d1', '#f6d365', '#ff6b9d'],
  critical: ['#ff6b4a', '#ffd166', '#ff3b7a', '#ffffff'],
} as const;

// Cached palette indexed by CellId.
// - cells[0] (empty) = black.
// - cells[1] = control sample, the fixed reference culture.
// - cells[2+] use lifeform identity colors. Tool effects own green-gold
//   (nutrient) and purple (toxin), so those hues stay readable.
function buildPalette(nCells: number): Uint8ClampedArray[] {
  const out: Uint8ClampedArray[] = [];
  out.push(new Uint8ClampedArray([0, 0, 0, 255]));        // empty
  out.push(new Uint8ClampedArray([186, 32, 42, 255]));    // control sample
  const lifeColors: Array<[number, number, number]> = [
    [42, 150, 214],
    [62, 202, 218],
    [48, 176, 156],
    [73, 118, 214],
    [105, 205, 192],
    [39, 93, 174],
    [91, 180, 224],
    [54, 139, 164],
  ];
  for (let i = 0; i < Math.max(1, nCells - 1); i++) {
    out.push(rgba(lifeColors[i % lifeColors.length]!));
  }
  return out;
}

function rgba([r, g, b]: [number, number, number]): Uint8ClampedArray {
  return new Uint8ClampedArray([r, g, b, 255]);
}

function mixColor(
  base: Uint8ClampedArray,
  tint: [number, number, number],
  amount: number,
): Uint8ClampedArray {
  return new Uint8ClampedArray([
    base[0]! * (1 - amount) + tint[0] * amount,
    base[1]! * (1 - amount) + tint[1] * amount,
    base[2]! * (1 - amount) + tint[2] * amount,
    255,
  ]);
}

function traitColor(base: Uint8ClampedArray, traits: readonly TraitId[] | undefined): Uint8ClampedArray {
  const trait = traits?.at(-1);
  if (trait === 'fleet') return mixColor(base, [212, 255, 72], 0.42);
  if (trait === 'gelatinous') return mixColor(base, [224, 88, 255], 0.34);
  if (trait === 'toxin_resistant') return mixColor(base, [225, 255, 255], 0.44);
  if (trait === 'fragile') return mixColor(base, [255, 174, 64], 0.38);
  if (trait === 'budding') return mixColor(base, [91, 255, 154], 0.4);
  return base;
}

// Lighten an RGB color by `factor` toward white (0..1).
function lighten(c: Uint8ClampedArray, factor: number): Uint8ClampedArray {
  return new Uint8ClampedArray([
    255 * factor + c[0]! * (1 - factor),
    255 * factor + c[1]! * (1 - factor),
    255 * factor + c[2]! * (1 - factor),
    255,
  ]);
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  nCells: number,
): Renderer {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  ctx.imageSmoothingEnabled = false;

  // Build palette: base color + boundary-lightened color.
  const fallbackBase = buildPalette(nCells);

  let imageData: ImageData | null = null;
  let offscreen: HTMLCanvasElement | null = null;
  let offCtx: CanvasRenderingContext2D | null = null;
  let frame = 0;
  const reduceMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    render(
      state: SimState,
      archetypes?: ReadonlyMap<CellId, EnemySpawn>,
      dishEvents: readonly DishEventMarker[] = [],
    ) {
      frame += 1;
      const { LX, LY, cells, boundary } = state.grid;
      const base = buildRenderPalette(nCells, state.cells, archetypes, fallbackBase);
      const boundaryColors = base.map((c) => lighten(c, 0.3));
      // Lazy init when we know the grid size.
      if (!imageData || imageData.width !== LX || imageData.height !== LY) {
        offscreen = document.createElement('canvas');
        offscreen.width = LX;
        offscreen.height = LY;
        const o = offscreen.getContext('2d');
        if (!o) throw new Error('No 2D context for offscreen');
        offCtx = o;
        imageData = offCtx.createImageData(LX, LY);
      }

      const data = imageData.data;
      // Convention: grid (x, y) = (column, row) where x is horizontal, y is
      // vertical. Storage is x-major: cells[x * LY + y]. ImageData is row-major,
      // so pixel (x, y) lives at byte index (y * LX + x) * 4.
      for (let x = 0; x < LX; x++) {
        for (let y = 0; y < LY; y++) {
          const cellIdx = x * LY + y;
          const id = cells[cellIdx] as CellId;
          const onBoundary = boundary.has(cellIdx);
          const palette = onBoundary ? boundaryColors[id] : base[id];
          // Fall back to black if id out of palette range.
          const color = palette ?? base[0]!;

          const pixIdx = (y * LX + x) * 4;
          data[pixIdx]     = color[0]!;
          data[pixIdx + 1] = color[1]!;
          data[pixIdx + 2] = color[2]!;
          data[pixIdx + 3] = 255;
        }
      }

      offCtx!.putImageData(imageData, 0, 0);
      // Scale up to display canvas.
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offscreen!, 0, 0, canvas.width, canvas.height);
      const flash = dishFlashForEvents(dishEvents, reduceMotion);
      if (flash) {
        ctx.save();
        ctx.globalAlpha = flash.alpha;
        ctx.fillStyle = flash.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      // Draw bullets on top, in display coordinates.
      const sx = canvas.width / LX;
      const sy = canvas.height / LY;
      for (const event of dishEvents) {
        drawDishEventMarker(ctx, event, sx, sy, frame, reduceMotion);
      }
      for (const b of state.bullets) {
        const palette = base[b.ownerId] ?? base[0]!;
        // Lighten by 0.5 for the bullet color (slightly brighter than boundary).
        const r = 255 * 0.5 + palette[0]! * 0.5;
        const g = 255 * 0.5 + palette[1]! * 0.5;
        const bl = 255 * 0.5 + palette[2]! * 0.5;
        ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${bl | 0})`;
        ctx.beginPath();
        // Display (x, y) maps directly to grid (x, y). Bullet pos is in grid coords.
        const cx = (b.pos[0] + 0.5) * sx;
        const cy = (b.pos[1] + 0.5) * sy;
        const radius = Math.max(b.size * sx * 0.5, 2);
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.fill();
      }
    },
  };
}

function drawDishEventMarker(
  ctx: CanvasRenderingContext2D,
  event: DishEventMarker,
  sx: number,
  sy: number,
  frame: number,
  reduceMotion: boolean,
): void {
  const visual = dishEventMarkerVisual(event, frame, reduceMotion);
  const radiusScale = (sx + sy) * 0.5;
  ctx.save();
  ctx.globalAlpha = visual.globalAlpha;
  ctx.strokeStyle = visual.strokeStyle;
  ctx.lineWidth = visual.lineWidth;
  ctx.beginPath();
  ctx.arc(
    event.pos[0] * sx,
    event.pos[1] * sy,
    (event.radius + visual.radiusExpansion) * radiusScale,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
  ctx.restore();
}

export function dishEventMarkerVisual(
  event: DishEventMarker,
  frame: number,
  reduceMotion: boolean,
): {
  globalAlpha: number;
  strokeStyle: string;
  lineWidth: number;
  radiusExpansion: number;
} {
  const t = Math.max(0, event.ttl / event.maxTtl);
  const flashMarker = event.label.includes('FLASH');
  return {
    globalAlpha: Math.min(1, 0.18 + 0.55 * t + (flashMarker ? 0.16 : 0)),
    strokeStyle: flashMarker ? '#ffffff' : cycledDishEventColor(event, frame, reduceMotion),
    lineWidth: 1.5 + (1 - t) * 3 + (flashMarker ? 1.6 : 0),
    radiusExpansion: (1 - t) * 12 + (flashMarker ? 8 : 0),
  };
}

function cycledDishEventColor(
  event: DishEventMarker,
  frame: number,
  reduceMotion: boolean,
): string {
  const palette = DISH_EVENT_PALETTES[event.kind as keyof typeof DISH_EVENT_PALETTES];
  if (!palette || reduceMotion) return colorForDishEvent(event.color);
  const speed = event.kind === 'critical' ? 3 : 5;
  return palette[Math.floor(frame / speed) % palette.length]!;
}

function colorForDishEvent(color: DishEventMarker['color']): string {
  if (color === 'cyan') return '#7ee6ff';
  if (color === 'green') return '#84f5a8';
  if (color === 'red') return '#ff6b4a';
  if (color === 'violet') return '#b771ff';
  return '#f6d365';
}

export function dishFlashForEvents(
  dishEvents: readonly DishEventMarker[],
  reduceMotion: boolean,
): { color: string; alpha: number } | null {
  if (reduceMotion) return null;
  let strongest: { color: string; alpha: number } | null = null;
  for (const event of dishEvents) {
    const intensity = flashIntensityForDishEvent(event.kind);
    if (intensity === 0) continue;
    const freshness = Math.max(0, Math.min(1, event.ttl / event.maxTtl));
    if (freshness <= 0) continue;
    const flashMarker = event.label.includes('FLASH');
    const alpha = 0.02 + freshness * (flashMarker ? intensity * 1.55 : intensity);
    const color = flashMarker ? '#ffffff' : event.kind === 'fold' ? '#b771ff' : colorForDishEvent(event.color);
    if (!strongest || alpha > strongest.alpha) strongest = { color, alpha };
  }
  return strongest;
}

function flashIntensityForDishEvent(kind: DishEventMarker['kind']): number {
  if (kind === 'critical') return 0.2;
  if (kind === 'fold') return 0.16;
  if (kind === 'discovery') return 0.11;
  if (kind === 'mutation') return 0.08;
  if (kind === 'caution') return 0.055;
  return 0;
}

function buildRenderPalette(
  nCells: number,
  cells: ReadonlyMap<CellId, unknown>,
  archetypes: ReadonlyMap<CellId, EnemySpawn> | undefined,
  fallbackBase: Uint8ClampedArray[],
): Uint8ClampedArray[] {
  const size = Math.max(nCells, Math.max(0, ...cells.keys()) + 1);
  const out: Uint8ClampedArray[] = [];
  for (let id = 0; id < size; id++) {
    const fallback = fallbackBase[id] ?? fallbackBase[0]!;
    const spawn = archetypes?.get(id);
    let base = spawn ? rgba(lifeformIdentityForSpawn(spawn).colors.primary) : fallback;
    if (spawn?.breedId) base = mixColor(base, lifeformIdentityForSpawn(spawn).colors.accent, 0.35);
    out[id] = traitColor(base, spawn?.traits);
  }
  out[0] = fallbackBase[0]!;
  out[1] = fallbackBase[1]!;
  return out;
}
