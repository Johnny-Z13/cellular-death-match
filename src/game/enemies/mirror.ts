import type { Cell, SimState } from '../../sim/types';
import type { EnemySpawn } from '../../content/enemies';
import { shortestVec } from '../geometry';

const ENGULF_RANGE = 6;

// Mirror plays like the player. For M5 stub, this means bruiser-like behavior.
// The "use player's stats" trick lives in the arena (it overrides the spawn
// config at fight start with the run's current player config).
export function mirrorStep(
  self: Cell,
  target: Cell,
  state: SimState,
  spawn: EnemySpawn,
): void {
  const { LX, LY } = state.grid;
  const v = shortestVec(self.center, target.center, LX, LY);
  const dist = Math.hypot(v[0], v[1]);

  if (dist === 0) {
    self.intent.vec = [0, 0];
  } else {
    self.intent.vec = [v[0] / dist, v[1] / dist];
  }

  self.intent.speed = spawn.speed;
  self.intent.engulfMultiplier = dist <= ENGULF_RANGE ? spawn.engulfMultiplier : 1;
}
