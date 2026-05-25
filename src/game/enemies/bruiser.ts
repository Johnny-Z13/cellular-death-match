import type { Cell, SimState } from '../../sim/types';
import { displacementVec } from '../geometry';

// Engulf range: if center-to-center distance ≤ this, Bruiser engulfs.
// (Cells are blobs ~10-20 px wide, so 6 means "edges are touching or close".)
const ENGULF_RANGE = 6;

// Bruiser's engulf strength (slightly stronger than player's default).
// Spec section 7.1: Bruiser has +30% engulf rate vs base.
// We model "base" engulf as multiplier=5 and Bruiser as 5 * 1.3 ≈ 6.5.
const BRUISER_ENGULF_MULTIPLIER = 6.5;

// Bruiser speed: -20% from player base of 10.
const BRUISER_SPEED = 8;

export function bruiserStep(self: Cell, target: Cell, state: SimState): void {
  const { LX, LY } = state.grid;
  const v = displacementVec(self.center, target.center, LX, LY, state.grid.wrap);
  const dist = Math.hypot(v[0], v[1]);

  // Direction toward target (zero if coincident, to avoid NaN).
  if (dist === 0) {
    self.intent.vec = [0, 0];
  } else {
    self.intent.vec = [v[0] / dist, v[1] / dist];
  }

  self.intent.speed = BRUISER_SPEED;

  // Engulf when in range.
  self.intent.engulfMultiplier = dist <= ENGULF_RANGE ? BRUISER_ENGULF_MULTIPLIER : 1;
}
