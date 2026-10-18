// Membrane pinch: a Membrane drawn through a culture divides it, the way a
// cell divides when its membrane pinches through. As each stretch of
// membrane is laid, the arena asks for a crossed culture's pieces either side
// of the gel; every piece big enough becomes a culture of its own. It is the
// one way to copy a culture already in the dish, rare strains included.
import { idx, neighborCoord } from '../sim/grid';
import { NEIGHBOR_DIRS, type CellId, type Grid } from '../sim/types';

export const PINCH_TUNING = {
  /** Each piece must be at least this share of its strain's genome size
   *  (its spawn size), so a culture is fed up before it can be pinched. */
  minPieceShare: 0.6,
};

export interface CulturePieces {
  /** The culture's 8-connected pieces outside the gel, largest first, as
   *  flat grid indices. */
  pieces: number[][];
  /** The culture's pixels under the gel. */
  underGel: number[];
}

export function culturePieces(grid: Grid, id: CellId, gel: Uint8Array): CulturePieces {
  const { cells, LY } = grid;
  const seen = new Uint8Array(cells.length);
  const pieces: number[][] = [];
  const underGel: number[] = [];
  for (let start = 0; start < cells.length; start++) {
    if (cells[start] !== id || seen[start]) continue;
    seen[start] = 1;
    if (gel[start]! > 0) {
      underGel.push(start);
      continue;
    }
    const piece: number[] = [];
    const stack = [start];
    while (stack.length > 0) {
      const i = stack.pop()!;
      piece.push(i);
      const x = Math.floor(i / LY);
      const y = i % LY;
      for (const [dx, dy] of NEIGHBOR_DIRS) {
        const n = neighborCoord(grid, x, y, dx, dy);
        if (n === null) continue;
        const j = idx(grid, n[0], n[1]);
        if (seen[j] || cells[j] !== id) continue;
        seen[j] = 1;
        if (gel[j]! > 0) underGel.push(j);
        else stack.push(j);
      }
    }
    pieces.push(piece);
  }
  pieces.sort((a, b) => b.length - a.length);
  return { pieces, underGel };
}
