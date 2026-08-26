import {
  type PlayerConfig,
  type UpgradeRef,
  UPGRADES,
  applyUpgrades,
} from '../content/upgrades';
import { createRng, type Rng } from '../sim/rng';
import { ARCHETYPE_DEFAULTS, ECOSYSTEM_SCHEDULE, type EnemySpawn } from '../content/enemies';
import { OBJECTIVES, objectiveForEpoch, type ObjectiveDef } from '../content/objectives';
import { drawObjectives, type DrawContext } from './objectivePool';
import { isMidGameEpoch } from './onboardingStage';
import type { BreedId } from '../content/catalysis';

// Case 01 is a five-Trial authored arc; later epochs are open-ended.
export const FIXED_EPOCH_COUNT = 5;
export const UPGRADES_PER_PICK = 3;
// Backward compat: research grants are tested over OBJECTIVES.length iterations.
export const EPOCHS_PER_RUN = OBJECTIVES.length;
export const FIGHTS_PER_RUN = OBJECTIVES.length;

const CASE_METHOD_POOLS: readonly (readonly string[])[] = [
  ['egg_1', 'food_1', 'food_radius_1'],
  ['egg_1', 'food_1', 'food_radius_1', 'toxin_1', 'toxin_radius_1'],
  ['egg_1', 'food_1', 'food_radius_1', 'toxin_1', 'toxin_radius_1', 'water_1'],
  ['egg_1', 'food_1', 'toxin_1', 'toxin_radius_1', 'water_1', 'centrifuge_1'],
  ['egg_1', 'food_1', 'toxin_1', 'water_1', 'centrifuge_1', 'salt_1'],
];

export type RunPhase = 'title' | 'arena' | 'upgrade_pick' | 'objective_pick' | 'run_end';

export interface RunState {
  phase: RunPhase;
  fightIndex: number;
  upgrades: UpgradeRef[];
  outcome: null | 'won' | 'lost';
  pendingPickChoices: string[];
  seed: number;
  epochResults: Array<'completed' | 'lapsed'>;
  chosenObjective?: ObjectiveDef;
}

export interface Run {
  getState(): RunState;
  start(): void;
  startLateGamePreview(): void;
  completeEpoch(): void;
  skipEpoch(): void;
  failEpoch(): void;
  achieveHomeostasis(): void;
  winFight(): void;
  loseFight(): void;
  pickUpgrade(id: string): void;
  restart(): void;
  getPlayerConfig(): PlayerConfig;
  getFightSpawnList(): EnemySpawn[];
  getEpochSpawnList(): EnemySpawn[];
  getOnboardingSpawnList(): EnemySpawn[];
  getObjective(): ObjectiveDef;
  setChosenObjective(obj: ObjectiveDef): void;
  getObjectiveChoices(discoveredBreeds: ReadonlySet<BreedId>, unlockedTools: readonly string[]): ObjectiveDef[];
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
  let epochResults: Array<'completed' | 'lapsed'> = [];
  let chosenObjective: ObjectiveDef | undefined;
  const rng: Rng = createRng(seed);

  function pickThreeChoices(): string[] {
    // A Method is offered only when it can affect the next authored Trial.
    // This prevents early Lab breaks promising Acid or Agitate before those
    // controls exist on the bench.
    const authoredPool = CASE_METHOD_POOLS[Math.min(fightIndex + 1, CASE_METHOD_POOLS.length - 1)]!;
    const availableIds = fightIndex < FIXED_EPOCH_COUNT - 1
      ? authoredPool.filter((id) => UPGRADES.some((upgrade) => upgrade.id === id))
      : UPGRADES.map((upgrade) => upgrade.id);
    if (availableIds.length <= UPGRADES_PER_PICK) {
      return [...availableIds];
    }
    const ids = [...availableIds];
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
        epochResults: [...epochResults],
        chosenObjective,
      };
    },
    start() {
      phase = 'arena';
      fightIndex = 0;
      upgrades.length = 0;
      outcome = null;
      pendingPickChoices = [];
      epochResults = [];
      chosenObjective = undefined;
    },
    startLateGamePreview() {
      phase = 'objective_pick';
      fightIndex = FIXED_EPOCH_COUNT;
      upgrades.length = 0;
      outcome = null;
      pendingPickChoices = [];
      epochResults = Array.from({ length: FIXED_EPOCH_COUNT }, () => 'completed' as const);
      chosenObjective = undefined;
    },
    completeEpoch() {
      if (phase !== 'arena') return;
      epochResults.push('completed');
      // Open-ended: never end the run on epoch count alone.
      pendingPickChoices = pickThreeChoices();
      phase = 'upgrade_pick';
    },
    skipEpoch() {
      if (phase !== 'arena') return;
      epochResults.push('lapsed');
      pendingPickChoices = pickThreeChoices();
      phase = 'upgrade_pick';
    },
    failEpoch() {
      phase = 'run_end';
      outcome = 'lost';
    },
    achieveHomeostasis() {
      if (phase === 'run_end') return;
      phase = 'run_end';
      outcome = 'won';
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
      const existing = upgrades.find((u) => u.id === id);
      if (existing) existing.stacks += 1;
      else upgrades.push({ id, stacks: 1 });
      fightIndex += 1;
      pendingPickChoices = [];
      chosenObjective = undefined;
      phase = isMidGameEpoch(fightIndex) ? 'objective_pick' : 'arena';
    },
    restart() {
      phase = 'title';
      fightIndex = 0;
      upgrades.length = 0;
      outcome = null;
      pendingPickChoices = [];
      epochResults = [];
      chosenObjective = undefined;
    },
    getPlayerConfig() {
      return applyUpgrades(PLAYER_BASE, upgrades);
    },
    getFightSpawnList() {
      // For mid-game epochs, cycle through the schedule.
      const scheduleIndex = fightIndex % ECOSYSTEM_SCHEDULE.length;
      const fight = ECOSYSTEM_SCHEDULE[scheduleIndex];
      if (!fight) return [];
      return fight.map((e) => ({ ...e }));
    },
    getEpochSpawnList() {
      const scheduleIndex = fightIndex % ECOSYSTEM_SCHEDULE.length;
      const epoch = ECOSYSTEM_SCHEDULE[scheduleIndex];
      if (!epoch) return [];
      return epoch.map((e) => ({ ...e }));
    },
    getOnboardingSpawnList() {
      return [
        { ...ARCHETYPE_DEFAULTS.swarmlet },
        { ...ARCHETYPE_DEFAULTS.splitter },
      ];
    },
    getObjective() {
      // Mid-game: use the chosen objective if set.
      if (isMidGameEpoch(fightIndex)) {
        if (chosenObjective) return chosenObjective;
        throw new Error('Mid-game objective requested before objective_pick chose one');
      }
      // Fixed epochs: use the OBJECTIVES array.
      if (fightIndex < FIXED_EPOCH_COUNT) {
        return objectiveForEpoch(fightIndex);
      }
      throw new Error(`No fixed objective defined for epoch ${fightIndex}`);
    },
    setChosenObjective(obj: ObjectiveDef) {
      chosenObjective = obj;
      if (phase === 'objective_pick') phase = 'arena';
    },
    getObjectiveChoices(discoveredBreeds: ReadonlySet<BreedId>, unlockedTools: readonly string[]) {
      const ctx: DrawContext = {
        epochIndex: fightIndex,
        discoveredBreeds,
        unlockedTools,
        seed: seed + fightIndex,
      };
      return drawObjectives(ctx);
    },
  };
}
