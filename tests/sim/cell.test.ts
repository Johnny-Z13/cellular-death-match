import { describe, it, expect } from 'vitest';
import { createCell, addPixel, removePixel } from '../../src/sim/cell';
import type { Cell } from '../../src/sim/types';

const LX = 10;
const LY = 10;

function fresh(id = 1): Cell {
  return createCell(id, 100);
}

describe('createCell', () => {
  it('initializes vol and centerSums to zero', () => {
    const c = fresh();
    expect(c.id).toBe(1);
    expect(c.vol).toBe(0);
    expect(c.targetVol).toBe(100);
    expect(c.centerSum[0]).toEqual({ re: 0, im: 0 });
    expect(c.centerSum[1]).toEqual({ re: 0, im: 0 });
  });
});

describe('addPixel / removePixel', () => {
  it('vol increments and decrements correctly', () => {
    const c = fresh();
    addPixel(c, 3, 5, LX, LY);
    expect(c.vol).toBe(1);
    addPixel(c, 4, 5, LX, LY);
    expect(c.vol).toBe(2);
    removePixel(c, 3, 5, LX, LY);
    expect(c.vol).toBe(1);
  });

  it('center is at the added pixel when only one pixel exists', () => {
    const c = fresh();
    addPixel(c, 3, 5, LX, LY);
    expect(c.center[0]).toBeCloseTo(3, 5);
    expect(c.center[1]).toBeCloseTo(5, 5);
  });

  it('center is the centroid of two adjacent pixels (no wrap-around case)', () => {
    const c = fresh();
    addPixel(c, 4, 4, LX, LY);
    addPixel(c, 4, 6, LX, LY);
    expect(c.center[0]).toBeCloseTo(4, 5);
    expect(c.center[1]).toBeCloseTo(5, 5);
  });

  it('center handles wraparound correctly', () => {
    // Two pixels: (0, 0) and (LX-1, 0). Expected center x ≈ -0.5 mod LX = LX-0.5.
    const c = fresh();
    addPixel(c, 0, 0, LX, LY);
    addPixel(c, LX - 1, 0, LX, LY);
    // The circular mean of x=0 and x=9 on a length-10 axis is 9.5 (or equivalently -0.5).
    // Our convention: result is in [0, LX). So expect ~9.5.
    expect(c.center[0]).toBeCloseTo(9.5, 1);
    expect(c.center[1]).toBeCloseTo(0, 1);
  });

  it('uses a linear centroid for non-wrapping dishes', () => {
    const c = fresh();
    addPixel(c, 0, 0, LX, LY, false);
    addPixel(c, LX - 1, 0, LX, LY, false);
    expect(c.center[0]).toBeCloseTo((LX - 1) / 2, 5);
    expect(c.center[1]).toBeCloseTo(0, 5);
  });
});
