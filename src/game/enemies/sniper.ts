import type { Cell, SimState } from '../../sim/types';
import type { EnemySpawn } from '../../content/enemies';
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
  const dx = target.center[0] - self.center[0];
  const dy = target.center[1] - self.center[1];
  const dist = Math.hypot(dx, dy);

  // Movement.
  if (dist === 0) {
    self.intent.vec = [0, 0];
  } else if (dist < FLEE_RANGE) {
    self.intent.vec = [-dx / dist, -dy / dist];   // flee
  } else if (dist > APPROACH_RANGE) {
    self.intent.vec = [dx / dist, dy / dist];     // approach
  } else {
    self.intent.vec = [0, 0];                      // hold
  }

  self.intent.speed = spawn.speed;
  self.intent.engulfMultiplier = 1;                // never engulfs

  // Shoot.
  if (internal.shootTimer > 0) {
    internal.shootTimer -= 1;
    return;
  }
  // Fire toward target.
  if (dist > 0 && spawn.bulletSpeed !== undefined && spawn.bulletSize !== undefined) {
    const dirX = dx / dist;
    const dirY = dy / dist;
    addBullet(state, {
      pos: [self.center[0], self.center[1]],
      v: [dirX * spawn.bulletSpeed, dirY * spawn.bulletSpeed],
      ownerId: self.id,
      size: spawn.bulletSize,
    });
    internal.shootTimer = spawn.shootCooldown ?? 30;
  }
}
