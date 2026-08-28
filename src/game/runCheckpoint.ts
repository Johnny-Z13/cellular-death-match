import { OBJECTIVES, type ObjectiveDef } from '../content/objectives';
import { BREED_DEFS } from '../content/catalysis';
import { getUpgradeDef, type UpgradeRef } from '../content/upgrades';
import { ALL_PROGRESSION_LIFEFORMS } from './discoveryProgression';
import type { DiscoveryStorage } from './discoverySave';
import { OBJECTIVE_POOL } from './objectivePool';
import type { RunPhase, RunState } from './run';
import { removeVerified, writeVerifiedJson, type VerifiedWriteResult } from './verifiedStorage';

export const RUN_CHECKPOINT_KEY = 'cellular-death-match.run-checkpoint.v1';

const ACTIVE_PHASES = new Set<RunPhase>(['arena', 'upgrade_pick', 'objective_pick']);
const KNOWN_LIFEFORMS = new Set<string>(ALL_PROGRESSION_LIFEFORMS);
const KNOWN_OBJECTIVES: readonly ObjectiveDef[] = [...OBJECTIVES, ...OBJECTIVE_POOL];

export interface RunCheckpoint {
  version: 1;
  run: RunState;
  loadout: string[];
  pendingGenomeDecodeIds: string[];
  /** Rare genomes stabilized during this run and therefore seedable until it ends. */
  runStabilizedBreedIds: string[];
  savedAt: string;
}

type RunCheckpointInput = Pick<RunCheckpoint, 'run' | 'loadout' | 'pendingGenomeDecodeIds'>
  & Partial<Pick<RunCheckpoint, 'runStabilizedBreedIds'>>;

export type RunCheckpointWriteResult = VerifiedWriteResult<RunCheckpoint>;

export function loadRunCheckpoint(
  storage: Pick<DiscoveryStorage, 'getItem'>,
): RunCheckpoint | null {
  try {
    const raw = storage.getItem(RUN_CHECKPOINT_KEY);
    if (!raw) return null;
    return canonicalRunCheckpoint(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveRunCheckpoint(
  storage: Pick<DiscoveryStorage, 'getItem' | 'setItem'>,
  input: RunCheckpointInput,
): RunCheckpoint | null {
  const result = savePreparedRunCheckpoint(storage, prepareRunCheckpoint(input));
  return result.status === 'saved' ? result.value : null;
}

export function prepareRunCheckpoint(
  input: RunCheckpointInput,
  savedAt = new Date().toISOString(),
): RunCheckpoint {
  const checkpoint = canonicalRunCheckpoint({
    ...input,
    savedAt,
  });
  if (!checkpoint) throw new Error('Cannot prepare an invalid active-run checkpoint');
  return checkpoint;
}

export function savePreparedRunCheckpoint(
  storage: Pick<DiscoveryStorage, 'getItem' | 'setItem'>,
  checkpoint: RunCheckpoint,
): RunCheckpointWriteResult {
  return writeVerifiedJson(
    storage,
    RUN_CHECKPOINT_KEY,
    checkpoint,
    () => loadRunCheckpoint(storage) ?? checkpointWithInvalidReadback(),
  );
}

export function clearRunCheckpoint(
  storage: Pick<DiscoveryStorage, 'getItem' | 'removeItem'>,
): void {
  removeVerified(storage, RUN_CHECKPOINT_KEY);
}

export function clearRunCheckpointVerified(
  storage: Pick<DiscoveryStorage, 'getItem' | 'removeItem'>,
) {
  return removeVerified(storage, RUN_CHECKPOINT_KEY);
}

export function canonicalRunCheckpoint(value: unknown): RunCheckpoint | null {
  if (!isObject(value) || !isObject(value.run)) return null;
  if (value.version !== undefined && value.version !== 1) return null;
  const savedAt = validDateString(value.savedAt);
  if (!savedAt) return null;
  const phase = value.run.phase;
  if (typeof phase !== 'string' || !ACTIVE_PHASES.has(phase as RunPhase)) return null;

  const seed = integer(value.run.seed);
  const fightIndex = integer(value.run.fightIndex);
  if (seed === null || fightIndex === null || fightIndex < 0 || fightIndex > 10_000) return null;

  const upgrades = sanitizeUpgrades(value.run.upgrades);
  const pendingPickChoices = uniqueStrings(value.run.pendingPickChoices)
    .filter((id) => getUpgradeDef(id) !== undefined)
    .slice(0, 3);
  if (phase === 'upgrade_pick' && pendingPickChoices.length === 0) return null;

  const epochResults = Array.isArray(value.run.epochResults)
    ? value.run.epochResults
      .filter((result): result is 'completed' | 'lapsed' => result === 'completed' || result === 'lapsed')
      .slice(0, fightIndex + (phase === 'upgrade_pick' ? 1 : 0))
    : [];
  const chosenObjective = canonicalObjective(value.run.chosenObjective);
  if (phase === 'arena' && fightIndex >= OBJECTIVES.length && !chosenObjective) return null;

  return {
    version: 1,
    run: {
      phase: phase as RunPhase,
      fightIndex,
      upgrades,
      outcome: null,
      pendingPickChoices,
      seed,
      epochResults,
      chosenObjective,
    },
    loadout: uniqueStrings(value.loadout).filter((id) => KNOWN_LIFEFORMS.has(id)).slice(0, 6),
    pendingGenomeDecodeIds: uniqueStrings(value.pendingGenomeDecodeIds)
      .filter((id) => KNOWN_LIFEFORMS.has(id)),
    runStabilizedBreedIds: uniqueStrings(value.runStabilizedBreedIds)
      .filter((id) => id in BREED_DEFS),
    savedAt,
  };
}

function validDateString(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
}

function checkpointWithInvalidReadback(): RunCheckpoint {
  return {
    version: 1,
    run: {
      phase: 'title',
      fightIndex: 0,
      upgrades: [],
      outcome: null,
      pendingPickChoices: [],
      seed: 0,
      epochResults: [],
    },
    loadout: [],
    pendingGenomeDecodeIds: [],
    runStabilizedBreedIds: [],
    savedAt: '',
  };
}

function sanitizeUpgrades(value: unknown): UpgradeRef[] {
  if (!Array.isArray(value)) return [];
  const stacksById = new Map<string, number>();
  for (const item of value) {
    if (!isObject(item) || typeof item.id !== 'string' || !getUpgradeDef(item.id)) continue;
    const stacks = integer(item.stacks);
    if (stacks === null || stacks < 1) continue;
    stacksById.set(item.id, Math.min(99, stacks));
  }
  return [...stacksById].map(([id, stacks]) => ({ id, stacks }));
}

function canonicalObjective(value: unknown): ObjectiveDef | undefined {
  if (!isObject(value) || typeof value.name !== 'string') return undefined;
  return KNOWN_OBJECTIVES.find((objective) => objective.name === value.name);
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string'))];
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
