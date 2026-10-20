import {
  type SimState,
  type CellId,
  NEIGHBOR_DIRS,
} from './types';
import {
  idx,
  xy,
  getCell,
  setCell,
  neighborCoord,
  neighborVals,
  updateBoundaryAround,
} from './grid';
import { addPixel, removePixel } from './cell';
import { DEFAULT_PROFILE } from './breedProfiles';

// One Monte Carlo step. Returns true if the step changed the grid.
export function mcStep(state: SimState): boolean {
  const { grid, rng } = state;
  if (grid.boundary.size === 0) return false;

  // Pick a random boundary pixel as the source. The cache is rebuilt only when
  // boundary updates mark it dirty.
  if (grid.boundaryCacheDirty) {
    grid.boundaryCache = Array.from(grid.boundary);
    grid.boundaryCacheDirty = false;
  }
  const boundaryArr = grid.boundaryCache;
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

  // A shielded culture (a hatchling on its yolk) keeps its pixels from every
  // other culture; it still grows, and the medium still shapes it.
  if (state.shielded && sourceVal !== 0 && targetVal !== 0 && state.shielded.has(targetVal)) return false;

  // Agar wall: a culture can't grow into gel; a dissolving wall leaks in
  // proportion to its fading strength. The medium may still take gel pixels,
  // so a culture caught under fresh gel is squeezed out, not pinned.
  const wall = state.wall;
  if (wall && sourceVal !== 0) {
    const gel = wall[idx(grid, xT, yT)]!;
    if (gel > 0 && rng.randInt(255) < gel) return false;
  }

  // Look up the source cell's breed profile for per-cell beta scaling.
  const sourceCell = sourceVal !== 0 ? state.cells.get(sourceVal) : undefined;
  const profile = sourceCell?.energyProfile ?? DEFAULT_PROFILE;
  const shifts = sourceCell?.energyShifts;
  const isingEff = profile.isingMul * (1 + (shifts?.isingShift ?? 0));
  const volEff = profile.volMul * (1 + (shifts?.volShift ?? 0));
  const movEff = profile.movMul * (1 + (shifts?.movShift ?? 0));

  let engulf = profile.engulfMul * engulfTerm(state, sourceVal, targetVal);
  let bond = 0;
  const bonds = state.bonds;
  if (bonds) {
    const sourcePartners = sourceVal !== 0 ? bonds.partners(sourceVal) : undefined;
    const targetPartners = targetVal !== 0 ? bonds.partners(targetVal) : undefined;
    if (sourcePartners || targetPartners) {
      // Bonded partners never eat each other.
      if (sourcePartners?.has(targetVal)) engulf = 0;
      // A fraction of this culture's own surface tension, so partners of a
      // loose strain stick without mixing just as a tight strain's do.
      bond = state.betaIsing * isingEff * bonds.adhesion * bondTerm(state, xT, yT, sourcePartners, targetPartners);
    }
  }

  const dH =
    state.betaIsing * isingEff * isingTerm(state, xT, yT, sourceVal, targetVal) +
    state.betaVol * volEff * volumeTerm(state, sourceVal, targetVal) +
    state.betaMov * movEff * movementTerm(state, sourceVal, dir) +
    engulf +
    bond;

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

// Bond adhesion. The target pixel changes hands from targetVal to sourceVal:
// every neighbour owned by a partner of the source becomes a contact the
// bond rewards, and every neighbour owned by a partner of the target is a
// contact the target's bond loses. Strength-weighted, so a forming merge
// sticks a little and a locked one sticks fully.
function bondTerm(
  state: SimState,
  xT: number,
  yT: number,
  sourcePartners: ReadonlyMap<CellId, number> | undefined,
  targetPartners: ReadonlyMap<CellId, number> | undefined,
): number {
  let dH = 0;
  for (const v of neighborVals(state.grid, xT, yT)) {
    if (v === 0) continue;
    dH -= sourcePartners?.get(v) ?? 0;
    dH += targetPartners?.get(v) ?? 0;
  }
  return dH;
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

// Engulf term. When source has engulfMultiplier > 1 and target is a different
// non-zero cell (i.e. an enemy), bias the transfer toward acceptance.
//
//   dH_engulf = -(engulfMultiplier - 1)
//
// engulfMultiplier of 5 contributes dH = -4, making this transfer e^4 (~55x)
// more likely than the same transfer would be under the volume/Ising terms
// alone. The volume term still pushes back as the engulfer grows.
function engulfTerm(
  state: SimState,
  sourceVal: CellId,
  targetVal: CellId,
): number {
  if (sourceVal === 0 || targetVal === 0 || sourceVal === targetVal) return 0;
  const source = state.cells.get(sourceVal);
  if (!source) return 0;
  const m = source.intent.engulfMultiplier;
  if (m <= 1) return 0;
  return -(m - 1);
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
    if (c) addPixel(c, xT, yT, grid.LX, grid.LY, grid.wrap);
  }
  if (targetVal !== 0) {
    const c = state.cells.get(targetVal);
    if (c) removePixel(c, xT, yT, grid.LX, grid.LY, grid.wrap);
  }

  // Metabolism: when source is actively engulfing AND consuming a non-empty
  // target, source's targetVol grows and target's shrinks. This lets engulf
  // outpace the volume term's pushback and rewards aggressive absorption.
  // (Mirrors Python target_cell_vols updates in cell_MC_step.)
  // Bonded partners trade edge pixels but never digest each other.
  if (sourceVal !== 0 && targetVal !== 0 && !state.bonds?.partners(sourceVal)?.has(targetVal)) {
    const source = state.cells.get(sourceVal);
    if (source && source.intent.engulfMultiplier > 1) {
      source.targetVol += state.engulfGain;
      const victim = state.cells.get(targetVal);
      if (victim) victim.targetVol -= state.engulfDrain;
    }
  }

  updateBoundaryAround(grid, xT, yT);
  state.events.push({
    type: 'pixelTransferred',
    from: targetVal,
    to: sourceVal,
    pos: [xT, yT],
  });
}
