import { describe, expect, it } from 'vitest';
import { AGAR_TUNING, agarStrength, createAgarWall } from '../../src/game/agarWall';
import { createGrid, setCell, recomputeBoundary } from '../../src/sim/grid';
import { createCell, addPixel } from '../../src/sim/cell';
import { createRng } from '../../src/sim/rng';
import { mcStep } from '../../src/sim/monte-carlo';
import type { SimState } from '../../src/sim/types';

const at = (mask: Uint8Array, LY: number, x: number, y: number) => mask[x * LY + y]!;

describe('agar wall', () => {
  it('has no mask until a stretch is drawn', () => {
    expect(createAgarWall(40, 40).mask()).toBeUndefined();
  });

  it('lays a solid band with no gaps, even for a fast stroke', () => {
    const wall = createAgarWall(60, 40);
    wall.add([10, 20], [50, 20]);
    const mask = wall.mask()!;
    for (let x = 10; x <= 50; x++) {
      for (const y of [18, 19, 20, 21, 22]) expect(at(mask, 40, x, y)).toBe(255);
    }
    expect(at(mask, 40, 30, 17)).toBe(0);
    expect(at(mask, 40, 30, 23)).toBe(0);
  });

  it('holds at full strength, then dissolves over the end of its life', () => {
    const { ttl, dissolveShare } = AGAR_TUNING;
    expect(agarStrength(ttl, ttl)).toBe(1);
    expect(agarStrength(ttl * dissolveShare, ttl)).toBe(1);
    expect(agarStrength(ttl * dissolveShare * 0.5, ttl)).toBeCloseTo(0.5);

    const wall = createAgarWall(40, 40);
    wall.add([20, 20], [20, 20]);
    for (let i = 0; i < ttl - ttl * dissolveShare * 0.5; i++) wall.tick();
    expect(at(wall.mask()!, 40, 20, 20)).toBeGreaterThan(100);
    expect(at(wall.mask()!, 40, 20, 20)).toBeLessThan(160);
    for (let i = 0; i < ttl; i++) wall.tick();
    expect(wall.mask()).toBeUndefined();
    expect(wall.segments()).toHaveLength(0);
  });
});

// A hungry culture on the left of a dish 40 wide, a vertical wall at x = 16
// (gel covers x 14-18).
function hungryCulture(withWall: boolean): SimState {
  const grid = createGrid(40, 30, false);
  const cell = createCell(1, 400);
  for (let x = 4; x <= 8; x++) {
    for (let y = 12; y <= 17; y++) {
      setCell(grid, x, y, 1);
      addPixel(cell, x, y, grid.LX, grid.LY);
    }
  }
  recomputeBoundary(grid);
  const state: SimState = {
    grid,
    cells: new Map([[1, cell]]),
    bullets: [],
    betaIsing: 1,
    betaVol: 1,
    betaMov: 1,
    events: [],
    rng: createRng(7),
    wrapBullets: false,
    engulfGain: 0.5,
    engulfDrain: 0.6,
    bulletDrain: 1,
  };
  if (withWall) {
    const wall = createAgarWall(grid.LX, grid.LY);
    wall.add([16, 0], [16, 29]);
    state.wall = wall.mask();
  }
  return state;
}

function rightmostPixel(state: SimState): number {
  let right = -1;
  for (let x = 0; x < state.grid.LX; x++) {
    for (let y = 0; y < state.grid.LY; y++) {
      if (state.grid.cells[x * state.grid.LY + y] === 1) right = Math.max(right, x);
    }
  }
  return right;
}

describe('agar wall in the sim', () => {
  it('stops a growing culture from crossing, where open medium would not', () => {
    const open = hungryCulture(false);
    const walled = hungryCulture(true);
    for (let i = 0; i < 400_000; i++) {
      mcStep(open);
      mcStep(walled);
    }
    expect(rightmostPixel(open)).toBeGreaterThan(18);
    expect(rightmostPixel(walled)).toBeLessThan(14);
  });
});

describe('a shielded hatchling in the sim', () => {
  it('keeps every pixel from a neighbouring culture', () => {
    const grid = createGrid(30, 20, false);
    const big = createCell(1, 400);
    const small = createCell(2, 40);
    for (let x = 2; x <= 12; x++) for (let y = 4; y <= 15; y++) { setCell(grid, x, y, 1); addPixel(big, x, y, grid.LX, grid.LY); }
    for (let x = 13; x <= 18; x++) for (let y = 7; y <= 12; y++) { setCell(grid, x, y, 2); addPixel(small, x, y, grid.LX, grid.LY); }
    recomputeBoundary(grid);
    const state: SimState = {
      grid, cells: new Map([[1, big], [2, small]]), bullets: [],
      betaIsing: 1, betaVol: 1, betaMov: 1, events: [], rng: createRng(5), wrapBullets: false,
      engulfGain: 0.5, engulfDrain: 0.6, bulletDrain: 1, shielded: new Set([2]),
    };
    const smallPixels = () => [...grid.cells].filter((v) => v === 2).length;
    for (let i = 0; i < 100_000; i++) mcStep(state);
    // The big culture never takes a pixel the shielded one held.
    expect(state.events.some((e) => e.type === 'pixelTransferred' && e.from === 2 && e.to === 1)).toBe(false);
    expect(smallPixels()).toBeGreaterThan(0);
  });
});
