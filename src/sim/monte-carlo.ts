import {
  type SimState,
  type CellId,
  NEIGHBOR_DIRS,
} from './types';
import {
  xy,
  getCell,
  setCell,
  neighborCoord,
  neighborVals,
  updateBoundaryAround,
} from './grid';
import { addPixel, removePixel } from './cell';

// One Monte Carlo step. Returns true if the step changed the grid.
export function mcStep(state: SimState): boolean {
  const { grid, rng } = state;
  if (grid.boundary.size === 0) return false;

  // Pick a random boundary pixel as the source.
  // NOTE: O(N) per step — see perf note in plan. We'll optimize later if needed.
  const boundaryArr = Array.from(grid.boundary);
  const sourceIdx = boundaryArr[rng.randInt(boundaryArr.length)];
  if (sourceIdx === undefined) return false;
  const [xS, yS] = xy(grid, sourceIdx);

  // Pick a random neighbor as the target.
  const dir = NEIGHBOR_DIRS[rng.randInt(NEIGHBOR_DIRS.length)];
  if (!dir) return false;
  const tCoord = neighborCoord(grid, xS, yS, dir[0], dir[1]);
  if (tCoord === null) return false;
  const [xT, yT] = tCoord;

  const sourceVal = getCell(grid, xS, yS);
  const targetVal = getCell(grid, xT, yT);
  if (sourceVal === targetVal) return false;

  const dH =
    state.betaIsing * isingTerm(state, xT, yT, sourceVal, targetVal) +
    state.betaVol * volumeTerm(state, sourceVal, targetVal) +
    state.betaMov * movementTerm(state, sourceVal, dir);
  // engulfTerm intentionally omitted in M1 — added in M3.

  if (rng.random() > Math.exp(-dH)) return false;

  applyPixelTransfer(state, xT, yT, sourceVal, targetVal);
  return true;
}

// Surface-tension (Ising) energy change.
// dH_ising = (#neighbors with target_val) - (#neighbors with source_val)
function isingTerm(
  state: SimState,
  xT: number,
  yT: number,
  sourceVal: CellId,
  targetVal: CellId,
): number {
  const nbrs = neighborVals(state.grid, xT, yT);
  let sameAsTarget = 0;
  let sameAsSource = 0;
  for (const v of nbrs) {
    if (v === targetVal) sameAsTarget++;
    else if (v === sourceVal) sameAsSource++;
  }
  return sameAsTarget - sameAsSource;
}

// Volume preservation (quadratic energy → linear force around target).
function volumeTerm(state: SimState, sourceVal: CellId, targetVal: CellId): number {
  let dH = 0;
  if (sourceVal !== 0) {
    const c = state.cells.get(sourceVal);
    if (c) dH += 2 * (c.vol - c.targetVol) + 1;
  }
  if (targetVal !== 0) {
    const c = state.cells.get(targetVal);
    if (c) dH += -2 * (c.vol - c.targetVol) + 1;
  }
  return dH;
}

// Movement intent. Cells "want" to move along their intent vector.
// dH = -(dir · desired_v). desired_v = intent.vec * intent.speed.
function movementTerm(
  state: SimState,
  sourceVal: CellId,
  dir: readonly [number, number],
): number {
  if (sourceVal === 0) return 0;
  const c = state.cells.get(sourceVal);
  if (!c) return 0;
  const dvx = c.intent.vec[0] * c.intent.speed;
  const dvy = c.intent.vec[1] * c.intent.speed;
  return -(dir[0] * dvx + dir[1] * dvy);
}

// Apply the accepted pixel transfer: update grid, vol, center, boundary.
function applyPixelTransfer(
  state: SimState,
  xT: number,
  yT: number,
  sourceVal: CellId,
  targetVal: CellId,
): void {
  const { grid } = state;
  setCell(grid, xT, yT, sourceVal);

  if (sourceVal !== 0) {
    const c = state.cells.get(sourceVal);
    if (c) addPixel(c, xT, yT, grid.LX, grid.LY);
  }
  if (targetVal !== 0) {
    const c = state.cells.get(targetVal);
    if (c) removePixel(c, xT, yT, grid.LX, grid.LY);
  }

  updateBoundaryAround(grid, xT, yT);
  state.events.push({
    type: 'pixelTransferred',
    from: targetVal,
    to: sourceVal,
    pos: [xT, yT],
  });
}
