import { type SimState, type CellId, type Cell } from '../sim/types';
import { createSim, tick as simTick, addCell } from '../sim/sim';
import { type PlayerConfig } from '../content/upgrades';
import { type EnemySpawn, ARCHETYPE_DEFAULTS } from '../content/enemies';
import { bruiserStep } from './enemies/bruiser';
import { sniperStep, type SniperState } from './enemies/sniper';
import { splitterStep } from './enemies/splitter';
import { swarmletStep } from './enemies/swarmlet';
import { mirrorStep } from './enemies/mirror';
import { bossStep, type BossState } from './enemies/boss';

export type { PlayerConfig } from '../content/upgrades';

export interface ArenaInput {
  moveVec: [number, number];
  shouldFire: boolean;
  shouldEngulf: boolean;
}

export type ArenaStatus = 'running' | 'won' | 'lost';

export interface Arena {
  state: SimState;
  player: PlayerConfig;
  archetypes: Map<CellId, EnemySpawn>;
  getStatus(): ArenaStatus;
  tick(input: ArenaInput): void;
  spawnEnemy(opts: SpawnEnemyOpts): CellId;
}

export interface SpawnEnemyOpts {
  spawn: EnemySpawn;
  pos: [number, number];
}

export interface CreateArenaOpts {
  LX: number;
  LY: number;
  seed: number;
  player: PlayerConfig;
  enemies: EnemySpawn[];
  wrap: boolean;
  wrapBullets?: boolean;
}

// Legacy type kept for run.ts compatibility (Task 8 removes the dep).
export interface EnemyArenaConfig {
  targetVol: number;
  speed: number;
  engulfMultiplier: number;
}

const PLAYER_ID = 1;
const ENGULF_DECAY_PER_FRAME = 1 / 60;
const MC_STEPS_PER_TICK = 1000;

interface AiState {
  sniper?: SniperState;
  boss?: BossState;
  splitter?: { didSpawn: boolean };
}

export function createArena(opts: CreateArenaOpts): Arena {
  const nEnemies = opts.enemies.length;
  const state = createSim({
    LX: opts.LX,
    LY: opts.LY,
    nCells: 1 + nEnemies,
    targetVol: opts.player.targetVol,
    seed: opts.seed,
    wrap: opts.wrap,
    wrapBullets: opts.wrapBullets ?? true,
  });

  const archetypes = new Map<CellId, EnemySpawn>();
  const aiStates = new Map<CellId, AiState>();
  let nextCellId = 2 + nEnemies;          // ids beyond initial spawns

  for (let i = 0; i < nEnemies; i++) {
    const cellId = 2 + i;
    let spawn = opts.enemies[i]!;
    // Mirror adopts the player's stats.
    if (spawn.archetype === 'mirror') {
      spawn = {
        ...spawn,
        targetVol: opts.player.targetVol,
        speed: opts.player.speed,
        engulfMultiplier: opts.player.engulfMultiplier,
      };
    }
    archetypes.set(cellId, spawn);
    const cell = state.cells.get(cellId);
    if (cell) cell.targetVol = spawn.targetVol;

    const aiState: AiState = {};
    if (spawn.archetype === 'sniper')   aiState.sniper = { shootTimer: spawn.shootCooldown ?? 30 };
    if (spawn.archetype === 'boss')     aiState.boss = { phase: 1, didSpawnP2: false };
    if (spawn.archetype === 'splitter') aiState.splitter = { didSpawn: false };
    aiStates.set(cellId, aiState);
  }

  const player = state.cells.get(PLAYER_ID);
  if (player) player.intent.speed = opts.player.speed;

  function dispatchAi(self: Cell, target: Cell, ar: Arena): void {
    const spawn = archetypes.get(self.id);
    if (!spawn) return;
    const ai = aiStates.get(self.id);
    if (!ai) return;
    switch (spawn.archetype) {
      case 'bruiser':  bruiserStep(self, target, state); return;
      case 'sniper':   sniperStep(self, target, state, spawn, ai.sniper!); return;
      case 'splitter': splitterStep(self, target, state, spawn); return;
      case 'swarmlet': swarmletStep(self, target, state, spawn); return;
      case 'mirror':   mirrorStep(self, target, state, spawn); return;
      case 'boss':     bossStep(self, target, state, spawn, ai.boss!, ar); return;
    }
  }

  const arena: Arena = {
    state,
    player: opts.player,
    archetypes,
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

      // Enemy AIs.
      const target = state.cells.get(PLAYER_ID);
      if (target) {
        for (const [id] of archetypes) {
          const cell = state.cells.get(id);
          if (!cell || cell.vol === 0) continue;
          dispatchAi(cell, target, this);
        }
      }

      // On-death handlers.
      for (const [id, spawn] of archetypes) {
        if (spawn.archetype !== 'splitter') continue;
        const ai = aiStates.get(id);
        if (!ai?.splitter || ai.splitter.didSpawn) continue;
        const cell = state.cells.get(id);
        if (!cell || cell.vol > 0) continue;
        // Splitter died — spawn 2 swarmlets at its last known center.
        ai.splitter.didSpawn = true;
        const pos = cell.center;
        const swarmletSpawn = { ...ARCHETYPE_DEFAULTS.swarmlet };
        this.spawnEnemy({ spawn: swarmletSpawn, pos: [pos[0] - 3, pos[1]] });
        this.spawnEnemy({ spawn: swarmletSpawn, pos: [pos[0] + 3, pos[1]] });
      }

      simTick(state, MC_STEPS_PER_TICK);
    },
    spawnEnemy(spawnOpts: SpawnEnemyOpts): CellId {
      const id = nextCellId++;
      addCell(state, {
        id,
        targetVol: spawnOpts.spawn.targetVol,
        pos: spawnOpts.pos,
      });
      archetypes.set(id, spawnOpts.spawn);
      const ai: AiState = {};
      if (spawnOpts.spawn.archetype === 'sniper')   ai.sniper = { shootTimer: spawnOpts.spawn.shootCooldown ?? 30 };
      if (spawnOpts.spawn.archetype === 'boss')     ai.boss = { phase: 1, didSpawnP2: false };
      if (spawnOpts.spawn.archetype === 'splitter') ai.splitter = { didSpawn: false };
      aiStates.set(id, ai);
      return id;
    },
  };
  return arena;
}
