import type { EnemyArchetype } from '../content/enemies';
import { BREED_DEFS, type BreedId } from '../content/catalysis';
import { OBJECTIVE_TUNING } from '../content/ecologyTuning';
import type { ObjectiveDef } from '../content/objectives';

export type ObjectiveStatus = 'running' | 'satisfied' | 'failed';

export interface ObjectiveProgress {
  def: ObjectiveDef;
  status: ObjectiveStatus;
  summary: string;
  urgency: 'safe' | 'warning' | 'critical';
  met: boolean;
  latches: boolean;
  complete: boolean;
}

export interface ObjectiveMetrics {
  controlSampleVol: number;
  livingLifeforms: number;
  protectedCultureCount: number;
  archetypeCounts: ReadonlyMap<EnemyArchetype, number>;
  livingVol: number;
  lifeformVol: number;
  dominantVol: number;
  dominantArchetype: EnemyArchetype | null;
  coverage: number;
  maxLifeformVolume: number;
  maxBreedDominance: number;
  nearbyDifferentBreedPair: boolean;
}

export interface ObjectiveRuntime {
  balanceTicks: number;
  symbiosisTicks: number;
  sawExtinctionLow: boolean;
  survivedCrisis: boolean;
  protectedFragile: boolean;
  acidReactionTriggered: boolean;
  hybridDiscovered: boolean;
}

export interface ObjectiveRuntimeEvents {
  hybridDiscovered?: boolean;
  survivedCrisis?: boolean;
  protectedFragile?: boolean;
  acidReactionTriggered?: boolean;
}

export interface ObjectiveEvaluationContext {
  tickNo: number;
  epochTicks: number;
  reactions: number;
  discoveredBreedTicks: ReadonlyMap<BreedId, number>;
  runtime: ObjectiveRuntime;
  forceShowcase?: boolean;
}

const DISCOVERY_SHOWCASE_TICKS = 90;
const MEGA_CULTURE_VOLUME = 800;
const REACTION_CHAIN_COUNT = 3;
const BALANCE_KEEPER_MAX_DOMINANCE = 0.4;
const SUSTAIN_30_SECONDS = 60 * 30;
const CRISIS_SURVIVOR_MIN_CULTURES = 3;
const COLONY_FOUNDER_COUNT = 5;
const EXTINCTION_RECOVERY_COUNT = 4;

export function createObjectiveRuntime(): ObjectiveRuntime {
  return {
    balanceTicks: 0,
    symbiosisTicks: 0,
    sawExtinctionLow: false,
    survivedCrisis: false,
    protectedFragile: false,
    acidReactionTriggered: false,
    hybridDiscovered: false,
  };
}

export function updateObjectiveRuntime(
  runtime: ObjectiveRuntime,
  metrics: ObjectiveMetrics,
  objective: ObjectiveDef,
  events: ObjectiveRuntimeEvents = {},
): void {
  const balanceMax = objective.kind === 'balance_keeper'
    ? objective.maxDominance ?? BALANCE_KEEPER_MAX_DOMINANCE
    : BALANCE_KEEPER_MAX_DOMINANCE;
  const balanceMinCount = objective.kind === 'balance_keeper'
    ? objective.minCount ?? 2
    : 2;
  const balanced = metrics.livingLifeforms >= balanceMinCount && metrics.maxBreedDominance <= balanceMax;
  runtime.balanceTicks = balanced ? runtime.balanceTicks + 1 : 0;
  runtime.symbiosisTicks = metrics.nearbyDifferentBreedPair ? runtime.symbiosisTicks + 1 : 0;
  if (metrics.livingLifeforms <= 1) runtime.sawExtinctionLow = true;
  if (events.hybridDiscovered) runtime.hybridDiscovered = true;
  if (events.survivedCrisis) runtime.survivedCrisis = true;
  if (events.protectedFragile) runtime.protectedFragile = true;
  if (events.acidReactionTriggered) runtime.acidReactionTriggered = true;
}

export function evaluateObjective(
  objective: ObjectiveDef,
  metrics: ObjectiveMetrics,
  context: ObjectiveEvaluationContext,
): ObjectiveProgress {
  const deadline = context.tickNo >= context.epochTicks;
  const urgency = objectiveUrgency(context.tickNo, context.epochTicks);

  switch (objective.kind) {
    case 'discover_breed': {
      const breedId = objective.breedId ?? 'bloom_mass';
      const discoveredTick = context.discoveredBreedTicks.get(breedId);
      const discovered = discoveredTick !== undefined;
      const showcased = discovered && (context.forceShowcase || context.tickNo - discoveredTick >= DISCOVERY_SHOWCASE_TICKS);
      const name = BREED_DEFS[breedId]?.name ?? breedId;
      return progress(objective, showcased, true, deadline && !discovered, urgency, discovered
        ? `${name} created - logging sample`
        : `${name} not yet created`);
    }
    case 'preserve_grazers': {
      const minCount = objective.minCount ?? OBJECTIVE_TUNING.preserveGrazerMin;
      const ok = metrics.protectedCultureCount >= minCount;
      return progress(objective, ok, false, deadline && !ok, urgency, `${metrics.protectedCultureCount} / ${minCount} protected cultures`);
    }
    case 'breed_archetype': {
      const archetype = objective.archetype ?? 'swarmlet';
      const targetCount = objective.targetCount ?? OBJECTIVE_TUNING.breedTargetCount;
      const count = metrics.archetypeCounts.get(archetype) ?? 0;
      const ok = count >= targetCount;
      return progress(objective, ok, true, deadline && !ok, urgency, `${count} / ${targetCount} ${archetype} cultures`);
    }
    case 'controlled_reaction': {
      const targetCount = objective.targetCount ?? OBJECTIVE_TUNING.controlledReactionMinCount;
      const minCoverage = objective.minCoverage ?? OBJECTIVE_TUNING.controlledReactionMinCoverage;
      const ok = context.reactions >= targetCount && metrics.coverage >= minCoverage;
      return progress(objective, ok, true, deadline && !ok, urgency, `${context.reactions} / ${targetCount} reactions, ${Math.round(metrics.coverage * 100)}% living coverage`);
    }
    case 'balanced_ecology': {
      const maxDominance = objective.maxDominance ?? OBJECTIVE_TUNING.balanceMaxDominance;
      const minCount = objective.minCount ?? OBJECTIVE_TUNING.balanceMinLifeforms;
      const ok = metrics.maxBreedDominance <= maxDominance && metrics.livingLifeforms >= minCount;
      return progress(objective, ok, false, deadline && !ok, urgency, `${Math.round(metrics.maxBreedDominance * 100)}% / ${Math.round(maxDominance * 100)}% dominance, ${metrics.livingLifeforms} cultures`);
    }
    case 'dominant_archetype': {
      const archetype = objective.archetype ?? 'boss';
      const minCoverage = objective.minCoverage ?? OBJECTIVE_TUNING.dominantMinCoverage;
      const ok = metrics.dominantArchetype === archetype && metrics.coverage >= minCoverage;
      return progress(objective, ok, false, deadline && !ok, urgency, `${metrics.dominantArchetype ?? 'none'} dominant, ${Math.round(metrics.coverage * 100)}% living coverage`);
    }
    case 'cross_breed': {
      const ok = context.runtime.hybridDiscovered;
      return progress(objective, ok, true, deadline && !ok, urgency, ok ? 'Hybrid breed created' : 'No hybrid breed created yet');
    }
    case 'mega_culture': {
      const target = objective.volumeTarget ?? MEGA_CULTURE_VOLUME;
      const ok = metrics.maxLifeformVolume > target;
      return progress(objective, ok, true, deadline && !ok, urgency, `${Math.round(metrics.maxLifeformVolume)} / >${target} culture volume`);
    }
    case 'reaction_chain': {
      const targetCount = objective.targetCount ?? REACTION_CHAIN_COUNT;
      const ok = context.reactions >= targetCount;
      return progress(objective, ok, true, deadline && !ok, urgency, `${context.reactions} / ${targetCount} reactions`);
    }
    case 'balance_keeper': {
      const maxDominance = objective.maxDominance ?? BALANCE_KEEPER_MAX_DOMINANCE;
      const sustainTicks = objective.sustainTicks ?? SUSTAIN_30_SECONDS;
      const ok = context.runtime.balanceTicks >= sustainTicks;
      const seconds = Math.min(Math.floor(context.runtime.balanceTicks / 60), Math.ceil(sustainTicks / 60));
      return progress(objective, ok, true, deadline && !ok, urgency, `${seconds}s / ${Math.ceil(sustainTicks / 60)}s balanced, ${Math.round(metrics.maxBreedDominance * 100)}% / ${Math.round(maxDominance * 100)}% dominance`);
    }
    case 'crisis_survivor': {
      const minCount = objective.minCount ?? CRISIS_SURVIVOR_MIN_CULTURES;
      const ok = context.runtime.survivedCrisis && metrics.livingLifeforms >= minCount;
      return progress(objective, ok, true, deadline && !ok, urgency, context.runtime.survivedCrisis
        ? `${metrics.livingLifeforms} / ${minCount} cultures after crisis`
        : 'No crisis survived yet');
    }
    case 'protector': {
      const ok = context.runtime.protectedFragile;
      return progress(objective, ok, true, deadline && !ok, urgency, ok ? 'Fragile culture protected' : 'Fragile culture not protected yet');
    }
    case 'acid_sculptor': {
      const ok = context.runtime.acidReactionTriggered;
      return progress(objective, ok, true, deadline && !ok, urgency, ok ? 'Acid-led reaction triggered' : 'No acid-led reaction yet');
    }
    case 'colony_founder': {
      const targetCount = objective.targetCount ?? COLONY_FOUNDER_COUNT;
      let maxCount = 0;
      let maxArchetype: EnemyArchetype | null = null;
      for (const [archetype, count] of metrics.archetypeCounts) {
        if (count > maxCount) {
          maxCount = count;
          maxArchetype = archetype;
        }
      }
      const ok = maxCount >= targetCount;
      return progress(objective, ok, true, deadline && !ok, urgency, `${maxCount} / ${targetCount} ${maxArchetype ?? 'matching'} cultures`);
    }
    case 'symbiosis': {
      const sustainTicks = objective.sustainTicks ?? SUSTAIN_30_SECONDS;
      const ok = context.runtime.symbiosisTicks >= sustainTicks;
      const seconds = Math.min(Math.floor(context.runtime.symbiosisTicks / 60), Math.ceil(sustainTicks / 60));
      return progress(objective, ok, true, deadline && !ok, urgency, `${seconds}s / ${Math.ceil(sustainTicks / 60)}s nearby coexistence`);
    }
    case 'extinction_reversal': {
      const targetCount = objective.targetCount ?? EXTINCTION_RECOVERY_COUNT;
      const ok = context.runtime.sawExtinctionLow && metrics.livingLifeforms >= targetCount;
      return progress(objective, ok, true, deadline && !ok, urgency, context.runtime.sawExtinctionLow
        ? `${metrics.livingLifeforms} / ${targetCount} recovered cultures`
        : 'Dish has not dropped to extinction threshold');
    }
    default:
      return assertNever(objective.kind);
  }
}

function progress(
  def: ObjectiveDef,
  met: boolean,
  latches: boolean,
  failed: boolean,
  urgency: ObjectiveProgress['urgency'],
  summary: string,
): ObjectiveProgress {
  return {
    def,
    status: met ? 'satisfied' : failed ? 'failed' : 'running',
    summary,
    urgency,
    met,
    latches,
    complete: met,
  };
}

function objectiveUrgency(tickNo: number, epochTicks: number): ObjectiveProgress['urgency'] {
  const remaining = epochTicks - tickNo;
  if (remaining <= 60 * 10) return 'critical';
  if (remaining <= 60 * 22) return 'warning';
  return 'safe';
}

function assertNever(value: never): never {
  throw new Error(`Unhandled objective kind: ${value}`);
}
