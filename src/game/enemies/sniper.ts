import type { Cell, SimState } from '../../sim/types';
import type { EnemySpawn } from '../../content/enemies';
import { shortestVec } from '../geometry';
import { addBullet } from '../../sim/bullets';

export interface SniperState {
  shootTimer: number;
}

const FLEE_RANGE = 25;          // if target closer than this, flee
const APPROACH_RANGE = 60;      // if target farther than this, approach
// Between FLEE_RANGE and APPROACH_RANGE: hold position.

export function sniperStep(
  self: Cell,
  target: Cell,
  state: SimState,
  spawn: EnemySpawn,
  internal: SniperState,
): void {
  const { LX, LY } = state.grid;
  const v = shortestVec(self.center, target.center, LX, LY);
  const dist = Math.hypot(v[0], v[1]);

  // Movement.
  if (dist === 0) {
    self.intent.vec = [0, 0];
  } else if (dist < FLEE_RANGE) {
    self.intent.vec = [-v[0] / dist, -v[1] / dist];   // flee
  } else if (dist > APPROACH_RANGE) {
    self.intent.vec = [v[0] / dist, v[1] / dist];     // approach
  } else {
    self.intent.vec = [0, 0];                          // hold
  }

  self.intent.speed = spawn.speed;
  self.intent.engulfMultiplier = 1;                    // never engulfs

  // Shoot.
  if (internal.shootTimer > 0) {
    internal.shootTimer -= 1;
    return;
  }
  // Fire toward target.
  if (dist > 0 && spawn.bulletSpeed !== undefined && spawn.bulletSize !== undefined) {
    const dirX = v[0] / dist;
    const dirY = v[1] / dist;
    addBullet(state, {
      pos: [self.center[0], self.center[1]],
      v: [dirX * spawn.bulletSpeed, dirY * spawn.bulletSpeed],
      ownerId: self.id,
      size: spawn.bulletSize,
    });
    internal.shootTimer = spawn.shootCooldown ?? 30;
  }
}
