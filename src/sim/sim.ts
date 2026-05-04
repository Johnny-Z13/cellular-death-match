import { type SimState, NEIGHBOR_DIRS } from './types';
import { createGrid, idx, setCell, recomputeBoundary } from './grid';
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
      addPixel(c, nx, ny, opts.LX, opts.LY);
    }
  }

  recomputeBoundary(grid);

  return {
    grid,
    cells,
    betaIsing: opts.betaIsing ?? 1,
    betaVol: opts.betaVol ?? 1,
    betaMov: opts.betaMov ?? 1,
    events: [],
    rng: createRng(opts.seed),
  };
}

// Run `mcStepsPerTick` Monte Carlo steps + one bullet step. Clears events first.
export function tick(state: SimState, mcStepsPerTick: number): void {
  state.events.length = 0;
  for (let i = 0; i < mcStepsPerTick; i++) mcStep(state);
  stepBullets(state);
}
