import { describe, it, expect } from 'vitest';
import { createGrid, setCell, recomputeBoundary } from '../../src/sim/grid';
import { createCell, addPixel } from '../../src/sim/cell';
import { createRng } from '../../src/sim/rng';
import { mcStep } from '../../src/sim/monte-carlo';
import type { SimState } from '../../src/sim/types';

function makeStateWithTwoBlobs(): SimState {
  const grid = createGrid(20, 20, true);
  const cells = new Map<number, ReturnType<typeof createCell>>();
  const c1 = createCell(1, 9);
  const c2 = createCell(2, 9);
  cells.set(1, c1);
  cells.set(2, c2);

  // 3x3 blob of cell 1 around (5, 10)
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      setCell(grid, 5 + dx, 10 + dy, 1);
      addPixel(c1, 5 + dx, 10 + dy, grid.LX, grid.LY);
    }
  }
  // 3x3 blob of cell 2 around (15, 10)
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      setCell(grid, 15 + dx, 10 + dy, 2);
      addPixel(c2, 15 + dx, 10 + dy, grid.LX, grid.LY);
    }
  }
  recomputeBoundary(grid);

  return {
    grid,
    cells,
    betaIsing: 1,
    betaVol: 1,
    betaMov: 1,
    events: [],
    rng: createRng(42),
  };
}

describe('mcStep', () => {
  it('keeps total cell pixels bounded by grid size after many steps', () => {
    const state = makeStateWithTwoBlobs();
    for (let i = 0; i < 1000; i++) mcStep(state);
    const v1After = state.cells.get(1)!.vol;
    const v2After = state.cells.get(2)!.vol;
    expect(v1After + v2After).toBeLessThanOrEqual(state.grid.LX * state.grid.LY);
  });

  it('volumes match Uint8Array counts after many steps (invariant)', () => {
    const state = makeStateWithTwoBlobs();
    for (let i = 0; i < 5000; i++) mcStep(state);
    let count1 = 0;
    let count2 = 0;
    for (const v of state.grid.cells) {
      if (v === 1) count1++;
      else if (v === 2) count2++;
    }
    expect(state.cells.get(1)!.vol).toBe(count1);
    expect(state.cells.get(2)!.vol).toBe(count2);
  });

  it('boundary set matches a fresh recomputeBoundary after many steps', () => {
    const state = makeStateWithTwoBlobs();
    for (let i = 0; i < 5000; i++) mcStep(state);
    const tracked = new Set(state.grid.boundary);
    recomputeBoundary(state.grid);
    expect(state.grid.boundary).toEqual(tracked);
  });

  it('produces deterministic output for a fixed seed', () => {
    const a = makeStateWithTwoBlobs();
    const b = makeStateWithTwoBlobs();
    for (let i = 0; i < 1000; i++) {
      mcStep(a);
      mcStep(b);
    }
    expect(Array.from(a.grid.cells)).toEqual(Array.from(b.grid.cells));
  });

  it('a step early-returns without changes if boundary is empty', () => {
    const state = makeStateWithTwoBlobs();
    state.grid.boundary.clear();
    const before = Array.from(state.grid.cells);
    mcStep(state);
    expect(Array.from(state.grid.cells)).toEqual(before);
  });
});
