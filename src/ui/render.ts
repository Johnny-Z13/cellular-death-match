import type { SimState, CellId } from '../sim/types';
import { ARCHETYPE_INFO, type EnemySpawn } from '../content/enemies';

export interface Renderer {
  render(state: SimState, archetypes?: ReadonlyMap<CellId, EnemySpawn>): void;
}

// Cached palette indexed by CellId.
// - cells[0] (empty) = black.
// - cells[1] = red lineage, the fixed objective anchor.
// - cells[2+] (lifeforms) stay in blue/cyan/teal families. Tool effects own
//   green-gold (nutrient) and purple (toxin), so those hues stay readable.
function buildPalette(nCells: number): Uint8ClampedArray[] {
  const out: Uint8ClampedArray[] = [];
  out.push(new Uint8ClampedArray([0, 0, 0, 255]));        // empty
  out.push(new Uint8ClampedArray([186, 32, 42, 255]));    // red invasive lineage
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

  return {
    render(state: SimState, archetypes?: ReadonlyMap<CellId, EnemySpawn>) {
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

      // Draw bullets on top, in display coordinates.
      const sx = canvas.width / LX;
      const sy = canvas.height / LY;
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
    const archetype = archetypes?.get(id)?.archetype;
    out[id] = archetype ? rgba(ARCHETYPE_INFO[archetype].color) : fallback;
  }
  out[0] = fallbackBase[0]!;
  out[1] = fallbackBase[1]!;
  return out;
}
