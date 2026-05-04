import { describe, it, expect } from 'vitest';
import { shortestVec } from '../../src/game/geometry';

describe('shortestVec', () => {
  it('returns the direct vector when no wrap is shorter', () => {
    // Grid 100x100. From (10, 10) to (40, 50): direct dx=30, dy=40.
    const v = shortestVec([10, 10], [40, 50], 100, 100);
    expect(v[0]).toBeCloseTo(30, 5);
    expect(v[1]).toBeCloseTo(40, 5);
  });

  it('returns negative direction when the wrap path is shorter on x', () => {
    // From (5, 50) to (95, 50) on 100-wide grid:
    //   direct dx = 90 (going right), wrap dx = -10 (going left, through 0)
    //   wrap is shorter — returns -10.
    const v = shortestVec([5, 50], [95, 50], 100, 100);
    expect(v[0]).toBeCloseTo(-10, 5);
    expect(v[1]).toBeCloseTo(0, 5);
  });

  it('returns negative direction when the wrap path is shorter on y', () => {
    const v = shortestVec([50, 5], [50, 95], 100, 100);
    expect(v[0]).toBeCloseTo(0, 5);
    expect(v[1]).toBeCloseTo(-10, 5);
  });

  it('handles non-square grids', () => {
    // 80x60 grid. From (5, 5) to (75, 55): direct (70, 50), wrap (-10, -10).
    // Wrap is shorter on both axes.
    const v = shortestVec([5, 5], [75, 55], 80, 60);
    expect(v[0]).toBeCloseTo(-10, 5);
    expect(v[1]).toBeCloseTo(-10, 5);
  });

  it('returns [0, 0] for identical points', () => {
    const v = shortestVec([42, 17], [42, 17], 100, 100);
    expect(v[0]).toBeCloseTo(0, 5);
    expect(v[1]).toBeCloseTo(0, 5);
  });

  it('handles fractional positions (cell centers)', () => {
    const v = shortestVec([10.5, 10.5], [11.5, 12.5], 100, 100);
    expect(v[0]).toBeCloseTo(1, 5);
    expect(v[1]).toBeCloseTo(2, 5);
  });
});
