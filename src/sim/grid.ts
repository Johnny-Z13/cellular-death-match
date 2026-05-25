import { type Grid, type CellId, NEIGHBOR_DIRS } from './types';

export function createGrid(LX: number, LY: number, wrap: boolean): Grid {
  return {
    LX,
    LY,
    cells: new Uint8Array(LX * LY),
    boundary: new Set<number>(),
    wrap,
  };
}

export function idx(g: Grid, x: number, y: number): number {
  return x * g.LY + y;
}

export function xy(g: Grid, i: number): [number, number] {
  return [Math.floor(i / g.LY), i % g.LY];
}

export function getCell(g: Grid, x: number, y: number): CellId {
  return g.cells[idx(g, x, y)] ?? 0;
}

export function setCell(g: Grid, x: number, y: number, id: CellId): void {
  g.cells[idx(g, x, y)] = id;
}

// Returns the in-grid coordinate after applying (dx, dy) to (x, y).
// If wrap=true, wraps; if wrap=false, returns null when off-grid.
export function neighborCoord(
  g: Grid,
  x: number,
  y: number,
  dx: number,
  dy: number,
): [number, number] | null {
  let nx = x + dx;
  let ny = y + dy;
  if (g.wrap) {
    nx = ((nx % g.LX) + g.LX) % g.LX;
    ny = ((ny % g.LY) + g.LY) % g.LY;
    return [nx, ny];
  }
  if (nx < 0 || nx >= g.LX || ny < 0 || ny >= g.LY) return null;
  return [nx, ny];
}

export function isCellBoundary(g: Grid, x: number, y: number): boolean {
  const here = getCell(g, x, y);
  for (const [dx, dy] of NEIGHBOR_DIRS) {
    const n = neighborCoord(g, x, y, dx, dy);
    if (n === null) {
      if (here !== 0) return true;
      continue;
    }
    if (getCell(g, n[0], n[1]) !== here) return true;
  }
  return false;
}

export function recomputeBoundary(g: Grid): void {
  g.boundary.clear();
  for (let x = 0; x < g.LX; x++) {
    for (let y = 0; y < g.LY; y++) {
      if (isCellBoundary(g, x, y)) g.boundary.add(idx(g, x, y));
    }
  }
}

// Update the boundary set for a pixel and its 8 neighbors.
// Called after every pixel transfer.
export function updateBoundaryAround(g: Grid, x: number, y: number): void {
  for (const [dx, dy] of [[0, 0], ...NEIGHBOR_DIRS]) {
    const n = neighborCoord(g, x, y, dx as number, dy as number);
    if (n === null) continue;
    const i = idx(g, n[0], n[1]);
    if (isCellBoundary(g, n[0], n[1])) g.boundary.add(i);
    else g.boundary.delete(i);
  }
}

export function neighborVals(g: Grid, x: number, y: number): CellId[] {
  const out: CellId[] = [];
  for (const [dx, dy] of NEIGHBOR_DIRS) {
    const n = neighborCoord(g, x, y, dx, dy);
    if (n === null) {
      out.push(0);
      continue;
    }
    out.push(getCell(g, n[0], n[1]));
  }
  return out;
}
