import { describe, expect, it } from 'vitest';
import { culturePieces } from '../../src/game/membranePinch';
import { createAgarWall } from '../../src/game/agarWall';
import { createGrid, setCell } from '../../src/sim/grid';

describe('membrane pinch pieces', () => {
  // A 20 x 8 culture lying across x = 10, with a vertical membrane at x = 15.
  function cutCulture(withWall: boolean) {
    const grid = createGrid(30, 20, false);
    for (let x = 5; x < 25; x++) for (let y = 6; y < 14; y++) setCell(grid, x, y, 3);
    setCell(grid, 2, 2, 4);
    const wall = createAgarWall(30, 20);
    if (withWall) wall.add([15, 0], [15, 19]);
    return culturePieces(grid, 3, wall.mask() ?? new Uint8Array(30 * 20));
  }

  it('finds the two pieces either side of the gel, largest first', () => {
    const { pieces, underGel } = cutCulture(true);
    expect(pieces).toHaveLength(2);
    // Gel covers x 13-17 (radius 2.5): pieces span x 5-12 and 18-24.
    expect(pieces[0]!.length).toBe(8 * 8);
    expect(pieces[1]!.length).toBe(7 * 8);
    expect(underGel).toHaveLength(5 * 8);
  });

  it('keeps an uncut culture whole', () => {
    const { pieces, underGel } = cutCulture(false);
    expect(pieces).toHaveLength(1);
    expect(pieces[0]!.length).toBe(20 * 8);
    expect(underGel).toHaveLength(0);
  });
});
