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
    bullets: [],
    betaIsing: 1,
    betaVol: 1,
    betaMov: 1,
    events: [],
    rng: createRng(42),
    wrapBullets: true,
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
    state.grid.boundaryCacheDirty = true;
    const before = Array.from(state.grid.cells);
    mcStep(state);
    expect(Array.from(state.grid.cells)).toEqual(before);
  });

  it('reuses the boundary cache while the boundary stays clean', () => {
    const state = makeStateWithTwoBlobs();
    state.rng.randInt = () => 0;
    const cached = Array.from(state.grid.boundary);
    state.grid.boundaryCache = cached;
    state.grid.boundaryCacheDirty = false;
    state.betaIsing = 10_000;
    state.betaVol = 10_000;
    state.betaMov = 10_000;

    mcStep(state);

    expect(state.grid.boundaryCache).toBe(cached);
    expect(state.grid.boundaryCacheDirty).toBe(false);
  });

  it('uses sim-neutral energy profiles directly on cells', () => {
    const state = makeTwoPixelPenaltyState();

    expect(mcStep(state)).toBe(true);
    expect(state.grid.cells[1]).toBe(1);
  });
});

function makeTwoPixelPenaltyState(): SimState {
  const grid = createGrid(2, 1, false);
  const c1 = createCell(1, 0);
  const c2 = createCell(2, 1);
  setCell(grid, 0, 0, 1);
  setCell(grid, 1, 0, 2);
  addPixel(c1, 0, 0, grid.LX, grid.LY, false);
  addPixel(c2, 1, 0, grid.LX, grid.LY, false);
  c1.vol = 10;
  c1.energyProfile = {
    isingMul: 1,
    volMul: 0,
    movMul: 1,
    engulfMul: 1,
  };
  recomputeBoundary(grid);
  return {
    grid,
    cells: new Map([[1, c1], [2, c2]]),
    bullets: [],
    betaIsing: 0,
    betaVol: 1,
    betaMov: 0,
    events: [],
    rng: {
      randInt: () => 0,
      random: () => 0.5,
    },
    wrapBullets: true,
  };
}

describe('mcStep — engulf term', () => {
  it('with engulfMultiplier=5 on cell 1, cell 1 absorbs cell 2 pixels much faster', () => {
    // Run two parallel sims from the same seed. In sim A, cell 1 has engulfMultiplier=1 (off).
    // In sim B, cell 1 has engulfMultiplier=5 (engulf on). After many steps, sim B should
    // have cell 1 with significantly more volume.
    const seed = 99;
    const baseline = makeStateWithTwoBlobsAt((s) => {
      s.cells.get(1)!.intent.engulfMultiplier = 1;
    }, seed);
    const engulfing = makeStateWithTwoBlobsAt((s) => {
      s.cells.get(1)!.intent.engulfMultiplier = 5;
    }, seed);
    for (let i = 0; i < 5000; i++) {
      mcStep(baseline);
      mcStep(engulfing);
    }
    const v1Baseline = baseline.cells.get(1)!.vol;
    const v1Engulf = engulfing.cells.get(1)!.vol;
    expect(v1Engulf).toBeGreaterThan(v1Baseline);
  });

  it('engulfMultiplier=1 produces identical behavior to baseline (no-op when off)', () => {
    const seed = 42;
    const a = makeStateWithTwoBlobsAt(() => { /* default */ }, seed);
    const b = makeStateWithTwoBlobsAt((s) => {
      s.cells.get(1)!.intent.engulfMultiplier = 1;
    }, seed);
    for (let i = 0; i < 1000; i++) {
      mcStep(a);
      mcStep(b);
    }
    expect(Array.from(a.grid.cells)).toEqual(Array.from(b.grid.cells));
  });
});

// Helper used by the engulf-term tests above. Builds a fresh two-blob state
// where the two cells are adjacent so that engulf interactions can occur
// immediately. Both cells start at vol=9 but have a large targetVol (50),
// giving them room to grow. betaVol is reduced so the volume term does not
// dominate the engulf term. The RNG is re-seeded so both parallel sims start
// from the same random sequence after construction.
function makeStateWithTwoBlobsAt(
  mutate: (s: ReturnType<typeof makeStateWithTwoBlobs>) => void,
  seed: number,
): ReturnType<typeof makeStateWithTwoBlobs> {
  // Use a small grid (10×10) fully tiled: cell 1 on the left half (x<5),
  // cell 2 on the right half (x>=5). No background. The only possible pixel
  // transfers are between cell 1 and cell 2, so the engulf bias is directly
  // observable as a net volume shift.
  const LX = 10;
  const LY = 10;
  const grid = createGrid(LX, LY, true);
  const cells = new Map<number, ReturnType<typeof createCell>>();
  // targetVol = half the grid; betaVol low so volume term does not fight engulf
  const c1 = createCell(1, LX * LY / 2);
  const c2 = createCell(2, LX * LY / 2);
  cells.set(1, c1);
  cells.set(2, c2);

  for (let x = 0; x < LX; x++) {
    for (let y = 0; y < LY; y++) {
      if (x < LX / 2) {
        setCell(grid, x, y, 1);
        addPixel(c1, x, y, LX, LY);
      } else {
        setCell(grid, x, y, 2);
        addPixel(c2, x, y, LX, LY);
      }
    }
  }
  recomputeBoundary(grid);

  const state: ReturnType<typeof makeStateWithTwoBlobs> = {
    grid,
    cells,
    bullets: [],
    betaIsing: 0,   // no surface tension — engulf is the only directional force
    betaVol: 0.1,   // mild volume penalty so cells don't vanish
    betaMov: 1,
    events: [],
    rng: createRng(seed),
    wrapBullets: true,
  };
  mutate(state);
  return state;
}
