export type CellId = number;

export interface Grid {
  LX: number;
  LY: number;
  cells: Uint8Array;        // length LX * LY; cells[idx(x, y)] = CellId
  boundary: Set<number>;    // flat indices of pixels on a cell boundary
  wrap: boolean;
}

export interface Intent {
  vec: [number, number];        // normalized desired direction (len 0 or 1)
  speed: number;                // multiplier
  engulfMultiplier: number;     // 1.0 normal, >1 while engulf held (M3+)
  shooting: boolean;            // M2+
}

export interface Cell {
  id: CellId;
  vol: number;
  targetVol: number;
  centerSum: [
    { re: number; im: number },  // x-axis circular sum
    { re: number; im: number },  // y-axis circular sum
  ];
  center: [number, number];
  intent: Intent;
}

export type SimEvent =
  | { type: 'pixelTransferred'; from: CellId; to: CellId; pos: [number, number] };

export interface SimState {
  grid: Grid;
  cells: Map<CellId, Cell>;
  betaIsing: number;
  betaVol: number;
  betaMov: number;
  events: SimEvent[];
  rng: import('./rng').Rng;
}

// 8-connectivity neighbor directions (matches Python neighbor_dirs).
export const NEIGHBOR_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
];
