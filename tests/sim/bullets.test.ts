import { describe, it, expect } from 'vitest';
import { createSim } from '../../src/sim/sim';
import { addBullet, stepBullets } from '../../src/sim/bullets';
import type { SimState } from '../../src/sim/types';

function fixture(): SimState {
  return createSim({
    LX: 30,
    LY: 30,
    nCells: 2,
    targetVol: 30,
    seed: 1,
    wrap: true,
  });
}

describe('addBullet', () => {
  it('appends a bullet with default fields', () => {
    const state = fixture();
    addBullet(state, {
      pos: [5, 5],
      v: [1, 0],
      ownerId: 1,
      size: 1,
    });
    expect(state.bullets.length).toBe(1);
    const b = state.bullets[0]!;
    expect(b.pos).toEqual([5, 5]);
    expect(b.v).toEqual([1, 0]);
    expect(b.ownerId).toBe(1);
    expect(b.size).toBe(1);
    expect(b.age).toBe(0);
    expect(b.wraps).toBe(0);
  });

  it('emits a bulletFired event', () => {
    const state = fixture();
    state.events.length = 0;
    addBullet(state, { pos: [5, 5], v: [1, 0], ownerId: 1, size: 1 });
    const fired = state.events.find((e) => e.type === 'bulletFired');
    expect(fired).toBeDefined();
  });
});

describe('stepBullets — advance', () => {
  it('advances bullet position by velocity each step', () => {
    const state = fixture();
    addBullet(state, { pos: [5, 5], v: [1, 2], ownerId: 1, size: 1 });
    stepBullets(state);
    const b = state.bullets[0]!;
    expect(b.pos[0]).toBeCloseTo(6, 5);
    expect(b.pos[1]).toBeCloseTo(7, 5);
    expect(b.age).toBe(1);
  });
});

describe('stepBullets — collision with non-owner', () => {
  it('chips a pixel off a non-owner cell on overlap', () => {
    // Build a controlled state: place a bullet directly on a pixel of cell 2.
    const state = fixture();
    state.bullets = [];

    // Find a pixel of cell 2.
    let target: [number, number] | null = null;
    for (let x = 0; x < state.grid.LX && target === null; x++) {
      for (let y = 0; y < state.grid.LY; y++) {
        if (state.grid.cells[x * state.grid.LY + y] === 2) {
          target = [x, y];
          break;
        }
      }
    }
    if (target === null) throw new Error('No cell-2 pixel found in fixture');

    const cell2 = state.cells.get(2)!;
    const volBefore = cell2.vol;
    addBullet(state, {
      pos: [target[0], target[1]],
      v: [0, 0],            // no movement — collision happens this tick
      ownerId: 1,           // cell 1's bullet
      size: 1,
    });

    stepBullets(state);

    expect(cell2.vol).toBe(volBefore - 1);
    expect(state.grid.cells[target[0] * state.grid.LY + target[1]]).toBe(0);
    const hits = state.events.filter((e) => e.type === 'bulletHit');
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });
});

describe('stepBullets — owner grace period', () => {
  it('does not damage owner during grace period (age < grace)', () => {
    const state = fixture();
    state.bullets = [];

    // Find a pixel of cell 1.
    let inside: [number, number] | null = null;
    for (let x = 0; x < state.grid.LX && inside === null; x++) {
      for (let y = 0; y < state.grid.LY; y++) {
        if (state.grid.cells[x * state.grid.LY + y] === 1) {
          inside = [x, y];
          break;
        }
      }
    }
    if (inside === null) throw new Error('No cell-1 pixel found');

    const cell1 = state.cells.get(1)!;
    const volBefore = cell1.vol;
    addBullet(state, {
      pos: [inside[0], inside[1]],
      v: [0, 0],
      ownerId: 1,           // owner's own bullet
      size: 1,
    });

    stepBullets(state);

    // Grace period (LX = LY = 30, norm ≈ 42.4, /3 ≈ 14.1) — at age 1, no damage.
    expect(cell1.vol).toBe(volBefore);
    expect(state.grid.cells[inside[0] * state.grid.LY + inside[1]]).toBe(1);
  });
});

describe('stepBullets — wrap and despawn', () => {
  it('wraps bullet position when wrapBullets=true and counts wraps', () => {
    const state = fixture();
    state.bullets = [];
    addBullet(state, {
      pos: [29, 0],            // at the right edge of a 30×30 grid
      v: [2, 0],               // crosses the edge in one step
      ownerId: 1,
      size: 1,
    });
    stepBullets(state);
    const b = state.bullets[0]!;
    expect(b.pos[0]).toBeCloseTo(1, 5);   // wrapped
    expect(b.wraps).toBe(1);
  });

  it('despawns a bullet that has wrapped twice', () => {
    const state = fixture();
    state.bullets = [];
    addBullet(state, {
      pos: [29, 0],
      v: [2, 0],
      ownerId: 1,
      size: 1,
    });
    // Two wraps to remove.
    stepBullets(state); // wraps 1
    stepBullets(state); // bullet now at ~3, no wrap; advance several more
    // Force more wraps
    state.bullets[0]!.pos = [29, 0];
    stepBullets(state); // wraps 2 — should despawn
    expect(state.bullets.length).toBe(0);
  });

  it('drops bullet that exits non-wrap grid', () => {
    const state = createSim({
      LX: 30,
      LY: 30,
      nCells: 2,
      targetVol: 30,
      seed: 1,
      wrap: true,
      wrapBullets: false,
    });
    state.bullets = [];
    addBullet(state, {
      pos: [29, 0],
      v: [2, 0],
      ownerId: 1,
      size: 1,
    });
    stepBullets(state);
    expect(state.bullets.length).toBe(0);
  });
});
