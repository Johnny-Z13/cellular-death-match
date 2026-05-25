import type { Cell, SimState } from '../../sim/types';
import type { EnemySpawn } from '../../content/enemies';
import type { Arena } from '../arena';
import { displacementVec } from '../geometry';
import { ARCHETYPE_DEFAULTS } from '../../content/enemies';

export interface BossState {
  phase: 1 | 2;
  didSpawnP2: boolean;
}

const ENGULF_RANGE = 6;

// Boss has 2 phases:
//   P1: bruiser-like behavior at 3× targetVol.
//   P2: when vol drops below 50% of starting targetVol, it splits into
//       3 medium-sized cells. Spawn happens once.
export function bossStep(
  self: Cell,
  target: Cell,
  state: SimState,
  spawn: EnemySpawn,
  internal: BossState,
  arena: Arena,
): void {
  const { LX, LY } = state.grid;
  const v = displacementVec(self.center, target.center, LX, LY, state.grid.wrap);
  const dist = Math.hypot(v[0], v[1]);

  // Movement (bruiser-like).
  if (dist === 0) {
    self.intent.vec = [0, 0];
  } else {
    self.intent.vec = [v[0] / dist, v[1] / dist];
  }
  self.intent.speed = spawn.speed;
  self.intent.engulfMultiplier = dist <= ENGULF_RANGE ? spawn.engulfMultiplier : 1;

  // Phase transition: when boss vol drops below 50% of original targetVol, spawn 3 mediums.
  if (internal.phase === 1 && self.vol < spawn.targetVol * 0.5 && !internal.didSpawnP2) {
    internal.didSpawnP2 = true;
    internal.phase = 2;
    const pos = self.center;
    const medium: EnemySpawn = {
      ...ARCHETYPE_DEFAULTS.bruiser,
      targetVol: ARCHETYPE_DEFAULTS.bruiser.targetVol * 0.6,
    };
    arena.spawnEnemy({ spawn: medium, pos: [pos[0] - 6, pos[1]] });
    arena.spawnEnemy({ spawn: medium, pos: [pos[0] + 6, pos[1]] });
    arena.spawnEnemy({ spawn: medium, pos: [pos[0], pos[1] + 6] });
  }
}
