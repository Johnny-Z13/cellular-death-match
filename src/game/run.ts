import {
  type PlayerConfig,
  type UpgradeRef,
  UPGRADES,
  applyUpgrades,
} from '../content/upgrades';
import { createRng } from '../sim/rng';
import { ARCHETYPE_DEFAULTS, ECOSYSTEM_SCHEDULE, type EnemySpawn } from '../content/enemies';
import { objectiveForEpoch, type ObjectiveDef } from '../content/objectives';
import {
  drawObjectives,
  type StudyCapabilities,
  type StudyChoice,
} from './objectivePool';
import { isMidGameEpoch } from './onboardingStage';

// Case 01 is a five-Trial authored arc; later epochs are open-ended.
export const FIXED_EPOCH_COUNT = 5;
export const UPGRADES_PER_PICK = 3;
export const EPOCHS_PER_RUN = FIXED_EPOCH_COUNT;
export const FIGHTS_PER_RUN = FIXED_EPOCH_COUNT;

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
  restore(state: RunState): void;
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
  getObjectiveChoices(
    capabilities: Omit<StudyCapabilities, 'epochIndex' | 'seed'>,
  ): StudyChoice[];
}

/** Prepare a between-dish state without mutating a live Run. */
export function planEpochCompletion(
  state: RunState,
  result: 'completed' | 'lapsed' = 'completed',
): RunState {
  if (state.phase !== 'arena') return cloneRunState(state);
  const epochResults = [...state.epochResults, result];
  return {
    ...cloneRunState(state),
    phase: 'upgrade_pick',
    outcome: null,
    pendingPickChoices: methodChoicesFor({ ...state, epochResults }),
    epochResults,
  };
}

export function planRunConclusion(state: RunState, outcome: 'won' | 'lost'): RunState {
  return {
    ...cloneRunState(state),
    phase: 'run_end',
    outcome,
    pendingPickChoices: [],
  };
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

export function createRun(initialSeed: number): Run {
  let phase: RunPhase = 'title';
  let fightIndex = 0;
  const upgrades: UpgradeRef[] = [];
  let outcome: null | 'won' | 'lost' = null;
  let pendingPickChoices: string[] = [];
  let epochResults: Array<'completed' | 'lapsed'> = [];
  let chosenObjective: ObjectiveDef | undefined;
  let seed = initialSeed;

  function applyState(state: RunState): void {
    phase = state.phase;
    seed = state.seed;
    fightIndex = state.fightIndex;
    upgrades.splice(0, upgrades.length, ...state.upgrades.map((upgrade) => ({ ...upgrade })));
    outcome = state.outcome;
    pendingPickChoices = [...state.pendingPickChoices];
    epochResults = [...state.epochResults];
    chosenObjective = state.chosenObjective;
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
    restore(state) {
      applyState(state);
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
      applyState(planEpochCompletion(this.getState(), 'completed'));
    },
    skipEpoch() {
      if (phase !== 'arena') return;
      applyState(planEpochCompletion(this.getState(), 'lapsed'));
    },
    failEpoch() {
      applyState(planRunConclusion(this.getState(), 'lost'));
    },
    achieveHomeostasis() {
      if (phase === 'run_end') return;
      applyState(planRunConclusion(this.getState(), 'won'));
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
    getObjectiveChoices(capabilities) {
      const ctx: StudyCapabilities = {
        ...capabilities,
        epochIndex: fightIndex,
        seed: seed + fightIndex,
      };
      return drawObjectives(ctx);
    },
  };
}

function methodChoicesFor(state: RunState): string[] {
  // A Method is offered only when it can affect the next authored Trial. The
  // seed is derived from serialized state so bank planning and replay agree.
  const authoredPool = CASE_METHOD_POOLS[Math.min(state.fightIndex + 1, CASE_METHOD_POOLS.length - 1)]!;
  const availableIds = state.fightIndex < FIXED_EPOCH_COUNT - 1
    ? authoredPool.filter((id) => UPGRADES.some((upgrade) => upgrade.id === id))
    : UPGRADES.map((upgrade) => upgrade.id);
  if (availableIds.length <= UPGRADES_PER_PICK) return [...availableIds];

  const rng = createRng(methodChoiceSeed(state));
  const ids = [...availableIds];
  for (let i = 0; i < UPGRADES_PER_PICK; i++) {
    const j = i + rng.randInt(ids.length - i);
    const tmp = ids[i];
    ids[i] = ids[j]!;
    ids[j] = tmp!;
  }
  return ids.slice(0, UPGRADES_PER_PICK);
}

function methodChoiceSeed(state: RunState): number {
  let value = (state.seed ^ Math.imul(state.fightIndex + 1, 0x9e3779b1)) >>> 0;
  for (const result of state.epochResults) {
    value = Math.imul(value ^ (result === 'completed' ? 0x85ebca6b : 0xc2b2ae35), 0x27d4eb2d) >>> 0;
  }
  for (const upgrade of state.upgrades) {
    for (let i = 0; i < upgrade.id.length; i++) {
      value = Math.imul(value ^ upgrade.id.charCodeAt(i), 16777619) >>> 0;
    }
    value = Math.imul(value ^ upgrade.stacks, 0x85ebca6b) >>> 0;
  }
  return value || 0x9e3779b9;
}

function cloneRunState(state: RunState): RunState {
  return {
    ...state,
    upgrades: state.upgrades.map((upgrade) => ({ ...upgrade })),
    pendingPickChoices: [...state.pendingPickChoices],
    epochResults: [...state.epochResults],
    chosenObjective: state.chosenObjective ? { ...state.chosenObjective } : undefined,
  };
}
