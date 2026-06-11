import {
  type PlayerConfig,
  type UpgradeRef,
  UPGRADES,
  applyUpgrades,
} from '../content/upgrades';
import { createRng, type Rng } from '../sim/rng';
import { ECOSYSTEM_SCHEDULE, type EnemySpawn } from '../content/enemies';
import { OBJECTIVES, objectiveForEpoch, type ObjectiveDef } from '../content/objectives';

export const EPOCHS_PER_RUN = OBJECTIVES.length;
export const FIGHTS_PER_RUN = EPOCHS_PER_RUN;
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
  completeEpoch(): void;
  skipEpoch(): void;
  failEpoch(): void;
  winFight(): void;
  loseFight(): void;
  pickUpgrade(id: string): void;
  restart(): void;
  getPlayerConfig(): PlayerConfig;
  getFightSpawnList(): EnemySpawn[];
  getEpochSpawnList(): EnemySpawn[];
  getObjective(): ObjectiveDef;
}

const PLAYER_BASE: PlayerConfig = {
  targetVol: 420,
  speed: 8,
  engulfMultiplier: 4.8,
  bulletSize: 3,
  eggCharges: 8,
  nutrientCharges: 5,
  toxinCharges: 4,
  nutrientRadius: 20,
  toxinRadius: 24,
};

export function createRun(seed: number): Run {
  let phase: RunPhase = 'title';
  let fightIndex = 0;
  const upgrades: UpgradeRef[] = [];
  let outcome: null | 'won' | 'lost' = null;
  let pendingPickChoices: string[] = [];
  const rng: Rng = createRng(seed);

  function pickThreeChoices(): string[] {
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
    completeEpoch() {
      if (phase !== 'arena') return;
      if (fightIndex >= EPOCHS_PER_RUN - 1) {
        phase = 'run_end';
        outcome = 'won';
        return;
      }
      pendingPickChoices = pickThreeChoices();
      phase = 'upgrade_pick';
    },
    // A missed objective no longer ends the run — this is a playful discovery
    // sandbox, not a punisher. The player simply moves on to the next epoch
    // (forfeiting that objective's reward) and still gets an upgrade pick.
    // The run only ends after the final epoch.
    skipEpoch() {
      if (phase !== 'arena') return;
      if (fightIndex >= EPOCHS_PER_RUN - 1) {
        phase = 'run_end';
        // Reaching the end is a completed run regardless of misses along the way.
        outcome = 'won';
        return;
      }
      pendingPickChoices = pickThreeChoices();
      phase = 'upgrade_pick';
    },
    failEpoch() {
      phase = 'run_end';
      outcome = 'lost';
    },
    winFight() {
      this.completeEpoch();
    },
    loseFight() {
      this.failEpoch();
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
    getFightSpawnList() {
      // Return a deep copy so callers can't mutate the schedule.
      const fight = ECOSYSTEM_SCHEDULE[fightIndex];
      if (!fight) return [];
      return fight.map((e) => ({ ...e }));
    },
    getEpochSpawnList() {
      const epoch = ECOSYSTEM_SCHEDULE[fightIndex];
      if (!epoch) return [];
      return epoch.map((e) => ({ ...e }));
    },
    getObjective() {
      return objectiveForEpoch(fightIndex);
    },
  };
}
