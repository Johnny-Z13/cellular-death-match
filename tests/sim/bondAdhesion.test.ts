import { describe, expect, it } from 'vitest';
import { createGrid, recomputeBoundary, setCell } from '../../src/sim/grid';
import { addPixel, createCell } from '../../src/sim/cell';
import { createRng } from '../../src/sim/rng';
import { mcStep } from '../../src/sim/monte-carlo';
import type { BondView, CellId, SimState } from '../../src/sim/types';

// Two 5x5 cultures side by side, each drifting away from the other.
function pulledApartPair(seed: number, bonds?: BondView, drift = 0.6): SimState {
  const grid = createGrid(40, 24, false);
  const cells = new Map<number, ReturnType<typeof createCell>>();
  for (const [id, x0] of [[1, 15], [2, 20]] as const) {
    const cell = createCell(id, 25);
    cell.intent = { vec: [id === 1 ? -1 : 1, 0], speed: drift, engulfMultiplier: 1, shooting: false };
    cells.set(id, cell);
    for (let x = x0; x < x0 + 5; x++) {
      for (let y = 10; y < 15; y++) {
        setCell(grid, x, y, id);
        addPixel(cell, x, y, grid.LX, grid.LY);
      }
    }
  }
  recomputeBoundary(grid);
  return {
    grid, cells, bullets: [], betaIsing: 1, betaVol: 1, betaMov: 1, events: [], rng: createRng(seed),
    wrapBullets: false, engulfGain: 0.5, engulfDrain: 0.6, bulletDrain: 1, bonds,
  };
}

function contactPairs(state: SimState): number {
  const { LX, LY, cells } = state.grid;
  let pairs = 0;
  for (let x = 0; x < LX - 1; x++) {
    for (let y = 0; y < LY; y++) {
      const a = cells[x * LY + y];
      const b = cells[(x + 1) * LY + y];
      if ((a === 1 && b === 2) || (a === 2 && b === 1)) pairs += 1;
    }
  }
  return pairs;
}

const bondedPair: BondView = {
  adhesion: 0.95,
  partners: (id: CellId) => (id === 1 ? new Map([[2, 1]]) : id === 2 ? new Map([[1, 1]]) : undefined),
};

describe('bond adhesion', () => {
  it('keeps two bonded cultures touching while they drift apart', () => {
    let free = 0;
    let bonded = 0;
    for (const seed of [1, 2, 3, 4, 5]) {
      const a = pulledApartPair(seed);
      const b = pulledApartPair(seed, bondedPair);
      for (let i = 0; i < 6000; i++) {
        mcStep(a);
        mcStep(b);
      }
      free += contactPairs(a);
      bonded += contactPairs(b);
    }
    expect(bonded).toBeGreaterThan(free * 1.5);
  });

  it('stops bonded partners eating each other', () => {
    // A hungry culture eats an unbonded neighbour, but not its partner.
    const volumeLost = (bonds?: BondView): number => {
      const state = pulledApartPair(7, bonds, 0);
      state.cells.get(1)!.intent.engulfMultiplier = 6;
      const before = state.cells.get(2)!.vol;
      for (let i = 0; i < 4000; i++) mcStep(state);
      return before - state.cells.get(2)!.vol;
    };
    const eaten = volumeLost();
    expect(eaten).toBeGreaterThan(10);
    expect(volumeLost(bondedPair)).toBeLessThan(eaten / 3);
  });
});
