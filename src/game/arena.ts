import { type SimState } from '../sim/types';
import { createSim, tick as simTick } from '../sim/sim';
import { bruiserStep } from './enemies/bruiser';
import { type PlayerConfig } from '../content/upgrades';

// Player config flowing into the arena = the upgrade-applied PlayerConfig.
// We re-export so consumers don't need to know it lives in content/.
export type { PlayerConfig } from '../content/upgrades';

export interface EnemyArenaConfig {
  targetVol: number;
  speed: number;
  engulfMultiplier: number;        // value used when in engulf range
}

export interface ArenaInput {
  moveVec: [number, number];
  shouldFire: boolean;
  shouldEngulf: boolean;
}

export type ArenaStatus = 'running' | 'won' | 'lost';

export interface Arena {
  state: SimState;
  player: PlayerConfig;
  enemy: EnemyArenaConfig;
  getStatus(): ArenaStatus;
  tick(input: ArenaInput): void;
}

export interface CreateArenaOpts {
  LX: number;
  LY: number;
  seed: number;
  player: PlayerConfig;
  enemy: EnemyArenaConfig;
  wrap: boolean;
  wrapBullets?: boolean;
}

const PLAYER_ID = 1;
const BRUISER_ID = 2;
const ENGULF_DECAY_PER_FRAME = 1 / 60;
const MC_STEPS_PER_TICK = 1000;

export function createArena(opts: CreateArenaOpts): Arena {
  const state = createSim({
    LX: opts.LX,
    LY: opts.LY,
    nCells: 2,
    targetVol: opts.player.targetVol,
    seed: opts.seed,
    wrap: opts.wrap,
    wrapBullets: opts.wrapBullets ?? true,
  });

  // Override the bruiser's targetVol post-creation. (createSim takes a single
  // targetVol; per-archetype stats are applied here.)
  const bruiser = state.cells.get(BRUISER_ID);
  if (bruiser) bruiser.targetVol = opts.enemy.targetVol;

  const player = state.cells.get(PLAYER_ID);
  if (player) {
    // Initial intent is zero-speed but with the player's configured speed
    // multiplier so the *intent vector* on first poll uses the right magnitude.
    player.intent.speed = opts.player.speed;
  }

  return {
    state,
    player: opts.player,
    enemy: opts.enemy,
    getStatus(): ArenaStatus {
      const p = state.cells.get(PLAYER_ID);
      if (!p || p.vol === 0) return 'lost';
      for (const [id, cell] of state.cells) {
        if (id === PLAYER_ID) continue;
        if (cell.vol > 0) return 'running';
      }
      return 'won';
    },
    tick(input: ArenaInput): void {
      if (this.getStatus() !== 'running') return;

      // Player intent.
      const p = state.cells.get(PLAYER_ID);
      if (p) {
        p.intent.vec = input.moveVec;
        p.intent.speed = opts.player.speed;
        p.intent.shooting = input.shouldFire;
        p.intent.engulfMultiplier = input.shouldEngulf ? opts.player.engulfMultiplier : 1;
        if (input.shouldEngulf) {
          p.targetVol -= ENGULF_DECAY_PER_FRAME;
        }
      }

      // Enemy AI. M4 has only Bruiser; M5 will dispatch by archetype.
      const target = state.cells.get(PLAYER_ID);
      const b = state.cells.get(BRUISER_ID);
      if (b && target && b.vol > 0) {
        bruiserStep(b, target, state);
        // Override Bruiser's intent fields with this fight's config.
        // bruiserStep sets these from its own constants; we apply per-fight scaling.
        b.intent.speed = opts.enemy.speed;
        if (b.intent.engulfMultiplier > 1) {
          b.intent.engulfMultiplier = opts.enemy.engulfMultiplier;
        }
      }

      simTick(state, MC_STEPS_PER_TICK);
    },
  };
}
