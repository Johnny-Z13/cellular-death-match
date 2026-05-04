import { describe, it, expect } from 'vitest';
import { createSim, tick, addCell } from '../../src/sim/sim';

describe('createSim', () => {
  it('creates a sim with N cells at distinct positions', () => {
    const state = createSim({
      LX: 50,
      LY: 50,
      nCells: 4,
      targetVol: 100,
      seed: 42,
      wrap: true,
    });
    expect(state.cells.size).toBe(4);
    // Each cell occupies its 8-neighborhood + center = 9 pixels at start.
    for (const cell of state.cells.values()) {
      expect(cell.vol).toBe(9);
    }
    // No cell-id collisions on the grid (sum of vols = unique-pixel count).
    let occupied = 0;
    for (const v of state.grid.cells) if (v !== 0) occupied++;
    expect(occupied).toBe(4 * 9);
  });

  it('boundary is non-empty after creation', () => {
    const state = createSim({ LX: 50, LY: 50, nCells: 2, targetVol: 100, seed: 1, wrap: true });
    expect(state.grid.boundary.size).toBeGreaterThan(0);
  });
});

describe('tick', () => {
  it('runs MC steps and clears events on each call', () => {
    const state = createSim({ LX: 30, LY: 30, nCells: 2, targetVol: 50, seed: 7, wrap: true });
    state.events.push({ type: 'pixelTransferred', from: 1, to: 2, pos: [0, 0] });
    tick(state, 100);
    // events array should have been cleared at start of tick, then repopulated.
    // Just check that the lingering manual event is gone:
    const stale = state.events.find((e) => e.type === 'pixelTransferred' && e.pos[0] === 0 && e.pos[1] === 0 && e.from === 1 && e.to === 2);
    expect(stale).toBeUndefined();
  });

  it('preserves grid–cell volume invariant after many ticks', () => {
    const state = createSim({ LX: 30, LY: 30, nCells: 2, targetVol: 50, seed: 7, wrap: true });
    for (let i = 0; i < 50; i++) tick(state, 100);
    let count1 = 0;
    let count2 = 0;
    for (const v of state.grid.cells) {
      if (v === 1) count1++;
      else if (v === 2) count2++;
    }
    expect(state.cells.get(1)!.vol).toBe(count1);
    expect(state.cells.get(2)!.vol).toBe(count2);
  });
});

describe('addCell', () => {
  it('adds a new cell with given id at given position', () => {
    const state = createSim({
      LX: 30, LY: 30, nCells: 2, targetVol: 50, seed: 1, wrap: true,
    });
    const newId = addCell(state, {
      id: 5,
      targetVol: 80,
      pos: [15, 15],
    });
    expect(newId).toBe(5);
    expect(state.cells.has(5)).toBe(true);
    const cell = state.cells.get(5)!;
    expect(cell.id).toBe(5);
    expect(cell.targetVol).toBe(80);
    expect(cell.vol).toBeGreaterThan(0);
    // Center should be near (15, 15) since pixels were seeded around that point.
    expect(cell.center[0]).toBeCloseTo(15, 0);
    expect(cell.center[1]).toBeCloseTo(15, 0);
  });

  it('boundary set is updated to include new cell pixels', () => {
    const state = createSim({
      LX: 30, LY: 30, nCells: 2, targetVol: 50, seed: 1, wrap: true,
    });
    const before = state.grid.boundary.size;
    addCell(state, { id: 7, targetVol: 50, pos: [5, 5] });
    expect(state.grid.boundary.size).toBeGreaterThan(before);
  });

  it('does not overwrite existing cell pixels', () => {
    const state = createSim({
      LX: 30, LY: 30, nCells: 2, targetVol: 50, seed: 1, wrap: true,
    });
    const cell1 = state.cells.get(1)!;
    const volBefore = cell1.vol;
    // Place a new cell INSIDE cell 1's territory — pixels owned by cell 1 are skipped.
    addCell(state, { id: 9, targetVol: 30, pos: [Math.round(cell1.center[0]), Math.round(cell1.center[1])] });
    // Cell 1's volume should be unchanged.
    expect(cell1.vol).toBe(volBefore);
  });
});
