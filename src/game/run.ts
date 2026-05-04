import {
  type PlayerConfig,
  type UpgradeRef,
  UPGRADES,
  applyUpgrades,
} from '../content/upgrades';
import { createRng, type Rng } from '../sim/rng';
import { type EnemyArenaConfig } from './arena';

export const FIGHTS_PER_RUN = 8;
export const UPGRADES_PER_PICK = 3;

export type RunPhase = 'title' | 'arena' | 'upgrade_pick' | 'run_end';

export interface RunState {
  phase: RunPhase;
  fightIndex: number;
  upgrades: UpgradeRef[];
  outcome: null | 'won' | 'lost';
  pendingPickChoices: string[];
  seed: number;
}

export interface Run {
  getState(): RunState;
  start(): void;
  winFight(): void;
  loseFight(): void;
  pickUpgrade(id: string): void;
  restart(): void;
  getPlayerConfig(): PlayerConfig;
  getEnemyConfig(): EnemyArenaConfig;
}

const PLAYER_BASE: PlayerConfig = {
  targetVol: 300,
  speed: 10,
  engulfMultiplier: 5,
  bulletSize: 3,
};

const BRUISER_BASE: EnemyArenaConfig = {
  targetVol: 450,
  speed: 8,
  engulfMultiplier: 6.5,
};

const FIGHT_DIFFICULTY_SCALE = 0.10;

export function createRun(seed: number): Run {
  let phase: RunPhase = 'title';
  let fightIndex = 0;
  const upgrades: UpgradeRef[] = [];
  let outcome: null | 'won' | 'lost' = null;
  let pendingPickChoices: string[] = [];
  const rng: Rng = createRng(seed);

  function pickThreeChoices(): string[] {
    // Stub-pool size is 3 — all three appear every time. M6 will introduce
    // rarity weighting and stack limits.
    if (UPGRADES.length <= UPGRADES_PER_PICK) {
      return UPGRADES.map((u) => u.id);
    }
    // Fisher-Yates partial shuffle.
    const ids = UPGRADES.map((u) => u.id);
    for (let i = 0; i < UPGRADES_PER_PICK; i++) {
      const j = i + rng.randInt(ids.length - i);
      const tmp = ids[i];
      ids[i] = ids[j]!;
      ids[j] = tmp!;
    }
    return ids.slice(0, UPGRADES_PER_PICK);
  }

  return {
    getState() {
      return {
        phase,
        fightIndex,
        upgrades: [...upgrades],
        outcome,
        pendingPickChoices: [...pendingPickChoices],
        seed,
      };
    },
    start() {
      phase = 'arena';
      fightIndex = 0;
      upgrades.length = 0;
      outcome = null;
      pendingPickChoices = [];
    },
    winFight() {
      if (phase !== 'arena') return;
      if (fightIndex >= FIGHTS_PER_RUN - 1) {
        phase = 'run_end';
        outcome = 'won';
        return;
      }
      pendingPickChoices = pickThreeChoices();
      phase = 'upgrade_pick';
    },
    loseFight() {
      phase = 'run_end';
      outcome = 'lost';
    },
    pickUpgrade(id: string) {
      if (phase !== 'upgrade_pick') return;
      if (!pendingPickChoices.includes(id)) {
        throw new Error(`upgrade "${id}" was not in the pick choices`);
      }
      // Stack onto an existing entry if same id, else add new.
      const existing = upgrades.find((u) => u.id === id);
      if (existing) existing.stacks += 1;
      else upgrades.push({ id, stacks: 1 });
      fightIndex += 1;
      pendingPickChoices = [];
      phase = 'arena';
    },
    restart() {
      phase = 'title';
      fightIndex = 0;
      upgrades.length = 0;
      outcome = null;
      pendingPickChoices = [];
    },
    getPlayerConfig() {
      return applyUpgrades(PLAYER_BASE, upgrades);
    },
    getEnemyConfig() {
      const scale = 1 + fightIndex * FIGHT_DIFFICULTY_SCALE;
      return {
        targetVol: BRUISER_BASE.targetVol * scale,
        speed: BRUISER_BASE.speed,
        engulfMultiplier: BRUISER_BASE.engulfMultiplier,
      };
    },
  };
}
