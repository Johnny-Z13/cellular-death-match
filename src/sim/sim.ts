import { type SimState, type CellId, NEIGHBOR_DIRS } from './types';
import { createGrid, idx, setCell, recomputeBoundary, updateBoundaryAround } from './grid';
import { createCell, addPixel } from './cell';
import { createRng } from './rng';
import { mcStep } from './monte-carlo';
import { stepBullets } from './bullets';

export interface CreateSimOpts {
  LX: number;
  LY: number;
  nCells: number;
  targetVol: number;
  seed: number;
  wrap: boolean;
  wrapBullets?: boolean;       // default true
  betaIsing?: number;
  betaVol?: number;
  betaMov?: number;
}

export function createSim(opts: CreateSimOpts): SimState {
  const grid = createGrid(opts.LX, opts.LY, opts.wrap);
  const cells = new Map<number, ReturnType<typeof createCell>>();

  // Spawn cells in a circle (matches Python start_pattern='circle').
  for (let i = 1; i <= opts.nCells; i++) {
    const c = createCell(i, opts.targetVol);
    cells.set(i, c);

    const theta = (2 * Math.PI * i) / opts.nCells;
    const cx = Math.round(opts.LX / 2 + (opts.LX / 3) * Math.cos(theta));
    const cy = Math.round(opts.LY / 2 + (opts.LY / 3) * Math.sin(theta));

    // Place the cell at (cx, cy) and its 8 neighbors. With wrap, all 9 land on grid.
    for (const [dx, dy] of [[0, 0], ...NEIGHBOR_DIRS]) {
      const nx = ((cx + (dx as number)) % opts.LX + opts.LX) % opts.LX;
      const ny = ((cy + (dy as number)) % opts.LY + opts.LY) % opts.LY;
      // Don't overwrite another cell's pixels (shouldn't happen with reasonable nCells/LX).
      if (grid.cells[idx(grid, nx, ny)] !== 0) continue;
      setCell(grid, nx, ny, i);
      addPixel(c, nx, ny, opts.LX, opts.LY, opts.wrap);
    }
  }

  recomputeBoundary(grid);

  return {
    grid,
    cells,
    bullets: [],
    betaIsing: opts.betaIsing ?? 1,
    betaVol: opts.betaVol ?? 1,
    betaMov: opts.betaMov ?? 1,
    events: [],
    rng: createRng(opts.seed),
    wrapBullets: opts.wrapBullets ?? true,
  };
}

// Run `mcStepsPerTick` Monte Carlo steps + one bullet step. Clears events first.
export function tick(state: SimState, mcStepsPerTick: number): void {
  state.events.length = 0;
  for (let i = 0; i < mcStepsPerTick; i++) mcStep(state);
  stepBullets(state);
}

export interface AddCellOpts {
  id: CellId;
  targetVol: number;
  pos: [number, number];   // grid position to seed pixels around
}

// Add a new cell to the sim mid-tick. Seeds pixels in the 3x3 around `pos`,
// skipping any pixels already owned by another cell. The boundary set is
// updated to reflect the new cell.
export function addCell(state: SimState, opts: AddCellOpts): CellId {
  const cell = createCell(opts.id, opts.targetVol);
  state.cells.set(opts.id, cell);

  const { LX, LY, wrap } = state.grid;
  const cx = Math.round(opts.pos[0]);
  const cy = Math.round(opts.pos[1]);

  // Seed the 3×3 around (cx, cy). Skip pixels that already belong to another cell.
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      let nx = cx + dx;
      let ny = cy + dy;
      if (wrap) {
        nx = ((nx % LX) + LX) % LX;
        ny = ((ny % LY) + LY) % LY;
      } else {
        if (nx < 0 || nx >= LX || ny < 0 || ny >= LY) continue;
      }
      if ((state.grid.cells[idx(state.grid, nx, ny)] ?? 0) !== 0) continue;
      setCell(state.grid, nx, ny, opts.id);
      addPixel(cell, nx, ny, LX, LY, wrap);
    }
  }

  // Update boundary around the new pixels (and their neighbors).
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      let nx = cx + dx;
      let ny = cy + dy;
      if (wrap) {
        nx = ((nx % LX) + LX) % LX;
        ny = ((ny % LY) + LY) % LY;
      } else {
        if (nx < 0 || nx >= LX || ny < 0 || ny >= LY) continue;
      }
      updateBoundaryAround(state.grid, nx, ny);
    }
  }

  return opts.id;
}
