import { describe, it, expect } from 'vitest';
import {
  createGrid,
  idx,
  xy,
  setCell,
  isCellBoundary,
  neighborVals,
  recomputeBoundary,
} from '../../src/sim/grid';

describe('createGrid', () => {
  it('creates an empty grid of the given size', () => {
    const g = createGrid(10, 8, true);
    expect(g.LX).toBe(10);
    expect(g.LY).toBe(8);
    expect(g.cells.length).toBe(80);
    expect(g.cells.every((v) => v === 0)).toBe(true);
    expect(g.boundary.size).toBe(0);
    expect(g.wrap).toBe(true);
  });
});

describe('idx / xy', () => {
  it('idx and xy round-trip', () => {
    const g = createGrid(10, 8, true);
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 8; y++) {
        const i = idx(g, x, y);
        const [rx, ry] = xy(g, i);
        expect([rx, ry]).toEqual([x, y]);
      }
    }
  });
});

describe('isCellBoundary', () => {
  it('a pixel surrounded by same-id pixels is not on a boundary', () => {
    const g = createGrid(5, 5, true);
    g.cells.fill(1);
    expect(isCellBoundary(g, 2, 2)).toBe(false);
  });

  it('a pixel adjacent to a different cell is on a boundary', () => {
    const g = createGrid(5, 5, true);
    g.cells.fill(1);
    setCell(g, 3, 2, 2);  // single cell-2 pixel inside a sea of cell-1
    expect(isCellBoundary(g, 2, 2)).toBe(true);
    expect(isCellBoundary(g, 3, 2)).toBe(true);
  });

  it('with wrap=true, edges treat opposite side as neighbor', () => {
    const g = createGrid(5, 5, true);
    g.cells.fill(1);
    setCell(g, 0, 0, 2);
    expect(isCellBoundary(g, 4, 0)).toBe(true); // wraps to (0,0) neighbor
  });

  it('with wrap=false, off-grid neighbors count as empty medium', () => {
    const g = createGrid(5, 5, false);
    g.cells.fill(1);
    expect(isCellBoundary(g, 0, 0)).toBe(true);
  });
});

describe('neighborVals', () => {
  it('with wrap=false, includes empty medium values beyond the edge', () => {
    const g = createGrid(5, 5, false);
    g.cells.fill(1);
    const vals = neighborVals(g, 0, 0);
    expect(vals.length).toBe(8);
    expect(vals.filter((v) => v === 0).length).toBe(5);
  });
});

describe('recomputeBoundary', () => {
  it('populates boundary from scratch', () => {
    const g = createGrid(5, 5, true);
    g.cells.fill(1);
    setCell(g, 2, 2, 2);
    recomputeBoundary(g);
    // (2,2) and its 8 neighbors are all on boundary
    expect(g.boundary.size).toBe(9);
    expect(g.boundary.has(idx(g, 2, 2))).toBe(true);
    expect(g.boundary.has(idx(g, 1, 1))).toBe(true);
  });
});
