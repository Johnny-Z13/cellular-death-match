import { type SimState } from '../sim/types';
import { createSim, tick as simTick } from '../sim/sim';
import { bruiserStep } from './enemies/bruiser';

export interface ArenaInput {
  moveVec: [number, number];
  shouldFire: boolean;
  shouldEngulf: boolean;
}

export type ArenaStatus = 'running' | 'won' | 'lost';

export interface Arena {
  state: SimState;
  getStatus(): ArenaStatus;
  tick(input: ArenaInput): void;
}

export interface CreateArenaOpts {
  LX: number;
  LY: number;
  seed: number;
  playerTargetVol: number;
  bruiserTargetVol: number;
  wrap: boolean;
  wrapBullets?: boolean;
}

const PLAYER_ID = 1;
const BRUISER_ID = 2;
const PLAYER_SPEED = 10;
const PLAYER_ENGULF_MULTIPLIER = 5;
const ENGULF_DECAY_PER_FRAME = 1 / 60;   // ~1 px/sec at 60 FPS
const MC_STEPS_PER_TICK = 1000;

export function createArena(opts: CreateArenaOpts): Arena {
  const state = createSim({
    LX: opts.LX,
    LY: opts.LY,
    nCells: 2,
    targetVol: opts.playerTargetVol,
    seed: opts.seed,
    wrap: opts.wrap,
    wrapBullets: opts.wrapBullets ?? true,
  });
  // The bruiser overrides its targetVol post-creation. (createSim only takes
  // a single targetVol for all cells; spawning archetypes with different
  // stats happens here.)
  const bruiser = state.cells.get(BRUISER_ID);
  if (bruiser) bruiser.targetVol = opts.bruiserTargetVol;

  return {
    state,
    getStatus(): ArenaStatus {
      const player = state.cells.get(PLAYER_ID);
      if (!player || player.vol === 0) return 'lost';
      // Won when all non-player cells have vol 0.
      for (const [id, cell] of state.cells) {
        if (id === PLAYER_ID) continue;
        if (cell.vol > 0) return 'running';
      }
      return 'won';
    },
    tick(input: ArenaInput): void {
      if (this.getStatus() !== 'running') return;

      // Player intent.
      const player = state.cells.get(PLAYER_ID);
      if (player) {
        player.intent.vec = input.moveVec;
        player.intent.speed = PLAYER_SPEED;
        player.intent.shooting = input.shouldFire;
        player.intent.engulfMultiplier = input.shouldEngulf ? PLAYER_ENGULF_MULTIPLIER : 1;
        if (input.shouldEngulf) {
          player.targetVol -= ENGULF_DECAY_PER_FRAME;
        }
      }

      // Enemy AI.
      const target = state.cells.get(PLAYER_ID);
      const bruiserCell = state.cells.get(BRUISER_ID);
      if (bruiserCell && target && bruiserCell.vol > 0) {
        bruiserStep(bruiserCell, target, state);
      }

      // Step the sim.
      simTick(state, MC_STEPS_PER_TICK);
    },
  };
}
