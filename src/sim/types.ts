export type CellId = number;

export interface Grid {
  LX: number;
  LY: number;
  cells: Uint16Array;       // length LX * LY; cells[idx(x, y)] = CellId
  boundary: Set<number>;    // flat indices of pixels on a cell boundary
  boundaryCache: number[];
  boundaryCacheDirty: boolean;
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
  centerLinearSum: [number, number];
  center: [number, number];
  intent: Intent;
  energyProfile?: EnergyProfile;
  /** Accumulated reagent energy shifts for current tick. Reset each tick. */
  energyShifts?: { isingShift: number; volShift: number; movShift: number };
}

export interface EnergyProfile {
  isingMul: number;
  volMul: number;
  movMul: number;
  engulfMul: number;
}

export interface Bullet {
  pos: [number, number];        // grid coordinates, fractional
  v: [number, number];          // velocity in grid-pixels per tick
  ownerId: CellId;              // which cell fired this bullet (collisions ignored vs owner during grace period)
  size: number;                 // bullet width/height in pixels (square footprint)
  age: number;                  // ticks since spawn
  wraps: number;                // count of grid-edge wraps; despawn at >=2
}

export type SimEvent =
  | { type: 'pixelTransferred'; from: CellId; to: CellId; pos: [number, number] }
  | { type: 'bulletFired';      ownerId: CellId; pos: [number, number]; v: [number, number] }
  | { type: 'bulletHit';        ownerId: CellId; victimId: CellId; pos: [number, number] };

export interface SimState {
  grid: Grid;
  cells: Map<CellId, Cell>;
  bullets: Bullet[];
  betaIsing: number;
  betaVol: number;
  betaMov: number;
  events: SimEvent[];
  rng: import('./rng').Rng;
  wrapBullets: boolean;        // true: bullets wrap on grid edges (matches Python wrap_bullets=True)
}

// 8-connectivity neighbor directions (matches Python neighbor_dirs).
export const NEIGHBOR_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
];
