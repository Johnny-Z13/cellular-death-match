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
    goalCellIds?: ReadonlySet<CellId>,
  ): void;
}

export interface RendererOptions {
  additiveBloom?: boolean;
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
    [72, 201, 255],
    [255, 170, 65],
    [72, 226, 112],
    [255, 78, 164],
    [132, 113, 255],
    [255, 87, 74],
    [160, 246, 255],
    [190, 255, 76],
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

// Mutation tints show a culture's newest trait. Amounts are kept low enough
// that a mutated culture still reads as its strain's hue (a budding Swarmlet
// stays cyan rather than turning Splitter green).
const TRAIT_TINT: Partial<Record<TraitId, { rgb: [number, number, number]; amount: number }>> = {
  fleet: { rgb: [212, 255, 72], amount: 0.24 },
  gelatinous: { rgb: [224, 88, 255], amount: 0.2 },
  toxin_resistant: { rgb: [225, 255, 255], amount: 0.26 },
  fragile: { rgb: [255, 174, 64], amount: 0.22 },
  budding: { rgb: [91, 255, 154], amount: 0.22 },
};

function traitColor(base: Uint8ClampedArray, traits: readonly TraitId[] | undefined): Uint8ClampedArray {
  const trait = traits?.at(-1);
  const tint = trait ? TRAIT_TINT[trait] : undefined;
  return tint ? mixColor(base, tint.rgb, tint.amount) : base;
}

/** The colour a culture of this spawn is drawn in, mutation tint included.
 *  Name tags use it so the dot matches the pixels. */
export function displayColorForSpawn(spawn: EnemySpawn): [number, number, number] {
  const base = rgba(lifeformIdentityForSpawn(spawn).colors.primary);
  const color = spawn.breedId ? base : traitColor(base, spawn.traits);
  return [color[0]!, color[1]!, color[2]!];
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
  options: RendererOptions = {},
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
  const supportsCanvasFilter = typeof ctx.filter === 'string';
  const additiveBloom = options.additiveBloom !== false;

  return {
    render(
      state: SimState,
      archetypes?: ReadonlyMap<CellId, EnemySpawn>,
      dishEvents: readonly DishEventMarker[] = [],
      goalCellIds?: ReadonlySet<CellId>,
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
          // Empty pixels stay transparent so the glow underlay shows through
          // around each culture; the black dish is painted as a background.
          data[pixIdx + 3] = id === 0 ? 0 : 255;
        }
      }

      offCtx!.putImageData(imageData, 0, 0);

      // Bloom: blurred glow underlay first, crisp pixels on top, then a faint
      // additive kiss. Glow-under keeps each culture's true color in its body
      // while light bleeds past its edges; the additive pass adds inner
      // luminosity without shifting hues. The blur runs on the GPU via the
      // canvas filter; without ctx.filter the bilinear upscale of the low-res
      // grid still softens the halo.
      ctx.drawImage(agarFor(canvas.width, canvas.height), 0, 0);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      if (supportsCanvasFilter) ctx.filter = `blur(${Math.max(3, canvas.width / 90)}px)`;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(offscreen!, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(offscreen!, 0, 0, canvas.width, canvas.height);

      if (additiveBloom) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.imageSmoothingEnabled = true;
        if (supportsCanvasFilter) ctx.filter = `blur(${Math.max(2, canvas.width / 160)}px)`;
        ctx.globalAlpha = 0.18;
        ctx.drawImage(offscreen!, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

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
      if (goalCellIds && goalCellIds.size > 0) {
        drawGoalRings(ctx, state, goalCellIds, sx, sy, frame, reduceMotion);
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


// Agar substrate behind the cultures: a dark medium with a faint centre
// glow, fine grain and a meniscus at the rim, so an empty dish reads as a
// living plate rather than a void. Static and cached per canvas size; it must
// stay dark enough that nothing in it could be mistaken for a culture.
const AGAR = {
  centre: [10, 22, 24] as const,
  rim: [2, 6, 7] as const,
  grainAlpha: 0.035,
  grainCell: 3,
  meniscusAlpha: 0.08,
  seed: 0x5eed,
};

let agarCache: { width: number; height: number; canvas: HTMLCanvasElement } | null = null;

function agarFor(width: number, height: number): HTMLCanvasElement {
  if (agarCache && agarCache.width === width && agarCache.height === height) return agarCache.canvas;
  const plate = document.createElement('canvas');
  plate.width = width;
  plate.height = height;
  const ctx = plate.getContext('2d')!;
  const cx = width / 2;
  const cy = height / 2;
  const reach = Math.hypot(cx, cy);
  const glow = ctx.createRadialGradient(cx, cy * 0.92, 0, cx, cy, reach);
  glow.addColorStop(0, `rgb(${AGAR.centre.join(',')})`);
  glow.addColorStop(1, `rgb(${AGAR.rim.join(',')})`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Deterministic grain (LCG) so every dish shows the same plate.
  let state = AGAR.seed;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let y = 0; y < height; y += AGAR.grainCell) {
    for (let x = 0; x < width; x += AGAR.grainCell) {
      const light = next();
      if (light < 0.55) continue;
      ctx.fillStyle = `rgba(150, 220, 210, ${(AGAR.grainAlpha * (light - 0.55)) / 0.45})`;
      ctx.fillRect(x, y, AGAR.grainCell, AGAR.grainCell);
    }
  }

  const meniscus = ctx.createRadialGradient(cx, cy, Math.min(cx, cy) * 0.82, cx, cy, reach);
  meniscus.addColorStop(0, 'rgba(120, 196, 200, 0)');
  meniscus.addColorStop(0.35, `rgba(120, 196, 200, ${AGAR.meniscusAlpha})`);
  meniscus.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = meniscus;
  ctx.fillRect(0, 0, width, height);

  agarCache = { width, height, canvas: plate };
  return plate;
}

// A dashed ring around every culture that counts toward the current goal.
// Shape, not colour, carries the meaning: a dark underlay keeps the light
// dashes readable over any culture hue, and the radius is padded past the
// equal-area circle so it clears irregular CPM outlines.
const GOAL_RING = {
  radiusScale: 1.25,
  radiusPadGrid: 3,
  dash: [2.4, 1.6] as const,
  color: 'rgba(214, 255, 249, 0.95)',
  underlay: 'rgba(0, 0, 0, 0.7)',
};

function drawGoalRings(
  ctx: CanvasRenderingContext2D,
  state: SimState,
  goalCellIds: ReadonlySet<CellId>,
  sx: number,
  sy: number,
  frame: number,
  reduceMotion: boolean,
): void {
  const scale = (sx + sy) * 0.5;
  const width = Math.max(2, scale * 0.6);
  ctx.save();
  for (const id of goalCellIds) {
    const cell = state.cells.get(id);
    if (!cell || cell.vol <= 0) continue;
    const radius = (Math.sqrt(cell.vol / Math.PI) * GOAL_RING.radiusScale + GOAL_RING.radiusPadGrid) * scale;
    const cx = (cell.center[0] + 0.5) * sx;
    const cy = (cell.center[1] + 0.5) * sy;
    ctx.setLineDash([]);
    ctx.strokeStyle = GOAL_RING.underlay;
    ctx.lineWidth = width + 3;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([scale * GOAL_RING.dash[0], scale * GOAL_RING.dash[1]]);
    ctx.lineDashOffset = reduceMotion ? 0 : -frame * 0.4;
    ctx.strokeStyle = GOAL_RING.color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
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
    const base = spawn ? rgba(lifeformIdentityForSpawn(spawn).colors.primary) : fallback;
    out[id] = spawn?.breedId ? base : traitColor(base, spawn?.traits);
  }
  out[0] = fallbackBase[0]!;
  out[1] = fallbackBase[1]!;
  return out;
}
