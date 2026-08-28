import {
  canonicalCaseRecord,
  saveCaseRecordVerified,
  type CaseRecord,
} from './caseRecord';
import {
  BREED_DEFS,
  DISCOVERY_NOTES,
  type BreedId,
  type DiscoveryNoteId,
} from '../content/catalysis';
import type { ObjectiveDef } from '../content/objectives';
import type { LifeformIdentityId } from '../content/lifeformIdentity';
import { COMMON_COLD_CASE } from '../content/researchCases';
import {
  canonicalDiscoveryState,
  saveDiscoveryStateVerified,
  type DiscoverySaveState,
  type DiscoveryStorage,
} from './discoverySave';
import {
  canonicalResearchArchive,
  saveResearchArchiveVerified,
  type ResearchArchiveState,
} from './researchArchive';
import {
  RESEARCH_SEALS,
  MAX_BIOME_ARCHIVE_RECORDS,
  MAX_BIOME_NAME_CHARS,
  MAX_RESEARCH_RECORD_VALUE,
  recordResearchEvidence,
  type ResearchEvidence,
  type ResearchSealId,
} from './researchArchive';
import {
  canonicalRunCheckpoint,
  clearRunCheckpointVerified,
  savePreparedRunCheckpoint,
  type RunCheckpoint,
} from './runCheckpoint';
import { prepareRunCheckpoint } from './runCheckpoint';
import {
  canonicalStrainLibraryState,
  loadStrainLibraryState,
  saveStrainLibraryStateVerified,
  type StrainLibraryState,
} from './strainLibrary';
import { removeVerified, writeVerifiedJson } from './verifiedStorage';
import {
  ALL_PROGRESSION_LIFEFORMS,
  updateDiscoveryProgression,
  type DiscoveryProgressionState,
} from './discoveryProgression';
import {
  appendUniqueGenomeDecodes,
  genomeDecodeEventsForProgressionChange,
} from './genomeDiscovery';
import { planEpochCompletion, planRunConclusion, type RunState } from './run';

export const RESEARCH_BANK_KEY = 'cellular-death-match.research-bank.v1';

// The recovery journal can update every progression store. Its accepted
// language is intentionally smaller than the forgiving legacy-store readers:
// damaged or forged data must fail closed before the first target write.
const MAX_BANK_SERIALIZED_CHARS = 1_000_000;
const MAX_BANK_ID_CHARS = 128;
const MAX_TIMESTAMP_CHARS = 64;
const MAX_LIFETIME_COUNTER = MAX_RESEARCH_RECORD_VALUE;
const KNOWN_LIFEFORMS = new Set<string>(ALL_PROGRESSION_LIFEFORMS);
const KNOWN_BREEDS = new Set<string>(Object.keys(BREED_DEFS));
const KNOWN_NOTES = new Set<string>(Object.keys(DISCOVERY_NOTES));
const KNOWN_CASE_TRIALS = new Set<string>(COMMON_COLD_CASE.trials.map((trial) => trial.id));
const KNOWN_RESEARCH_SEALS = new Set<string>(RESEARCH_SEALS.map((seal) => seal.id));

export interface ResearchBankCommit {
  version: 1;
  id: string;
  createdAt: string;
  discovery: DiscoverySaveState;
  strains: StrainLibraryState;
  caseRecord: CaseRecord;
  archive: ResearchArchiveState;
  checkpoint: RunCheckpoint | null;
}

export type ResearchBankStage =
  | 'journal'
  | 'discovery'
  | 'strains'
  | 'case-record'
  | 'archive'
  | 'checkpoint'
  | 'journal-clear';

export type ResearchBankResult =
  | { status: 'saved'; commit: ResearchBankCommit }
  | { status: 'unavailable'; commit: ResearchBankCommit; stage: ResearchBankStage; reason: string };

export interface ResearchBankPlanInput {
  id: string;
  createdAt: string;
  run: RunState;
  objective: ObjectiveDef;
  discovery: DiscoveryProgressionState;
  strainState: StrainLibraryState;
  caseRecord: CaseRecord;
  archive: ResearchArchiveState;
  discoveredNoteIds: readonly DiscoveryNoteId[];
  livingBreedIds: readonly BreedId[];
  loadout: readonly string[];
  pendingGenomeDecodeIds: readonly LifeformIdentityId[];
  runStabilizedBreedIds?: readonly BreedId[];
  caseTrialId?: string;
  allCaseTrialIds?: readonly string[];
  researchEvidence?: ResearchEvidence;
  completedStudy?: boolean;
  terminalOutcome?: 'won' | 'lost';
}

export interface PlannedResearchBank {
  commit: ResearchBankCommit;
  progression: DiscoveryProgressionState;
  runAfter: RunState;
  newGenomeDecodeIds: string[];
  newSealIds: ResearchSealId[];
  newBiome: boolean;
}

/** Derive the complete bank boundary without writes, UI, or live-run mutation. */
export function planResearchBank(input: ResearchBankPlanInput): PlannedResearchBank {
  let progression = input.discovery;
  const completedStudy = input.completedStudy !== false;
  // A named authored Case Trial is a controlled reproduction: Dr. E supplied
  // the prior signal. An Open Lab first encounter remains only observed until
  // the player reproduces it in a later dish.
  if (completedStudy && input.caseTrialId && input.objective.recipeId) {
    const noteId = `recipe_${input.objective.recipeId}` as DiscoveryNoteId;
    if (input.discoveredNoteIds.includes(noteId)) {
      progression = updateDiscoveryProgression(
        progression,
        { noteIds: [noteId] },
        input.createdAt,
        { note: 'understood' },
      );
    }
  }
  if (completedStudy && input.livingBreedIds.length > 0) {
    progression = updateDiscoveryProgression(
      progression,
      { breedIds: input.livingBreedIds },
      input.createdAt,
      { breed: 'stabilized' },
    );
  }

  const genomeEvents = genomeDecodeEventsForProgressionChange(input.discovery, progression);
  const runStabilizedBreedIds = [...new Set([
    ...(input.runStabilizedBreedIds ?? []),
    ...genomeEvents.map((event) => event.id).filter((id): id is BreedId => id in BREED_DEFS),
  ])];
  const pendingGenomeDecodeIds = appendUniqueGenomeDecodes(
    input.pendingGenomeDecodeIds,
    genomeEvents,
  );
  const caseRecord = canonicalCaseRecord({
    completedTrialIds: input.caseTrialId
      ? [...input.caseRecord.completedTrialIds, input.caseTrialId]
      : input.caseRecord.completedTrialIds,
  });
  const allCaseTrials = input.allCaseTrialIds ?? [];
  const caseComplete = allCaseTrials.length > 0
    && allCaseTrials.every((id) => caseRecord.completedTrialIds.includes(id));
  const stabilizedBreeds = progression.breedDiscoveryRecords.filter((record) => record.stage === 'stabilized');
  const understoodRecipes = progression.noteDiscoveryRecords.filter((record) => (
    record.id.startsWith('recipe_') && record.stage !== 'observed'
  ));
  const archiveUpdate = recordResearchEvidence(input.archive, {
    ...input.researchEvidence,
    caseComplete,
    stabilizedBreedCount: stabilizedBreeds.length,
    understoodRecipeCount: understoodRecipes.length,
    stabilizedHybridCount: stabilizedBreeds.filter((record) => Boolean(BREED_DEFS[record.id].parents)).length,
  }, input.createdAt);

  const terminal = input.terminalOutcome !== undefined;
  const runAfter = terminal
    ? planRunConclusion(input.run, input.terminalOutcome!)
    : planEpochCompletion(input.run, 'completed');
  const strainState = canonicalStrainLibraryState({
    ...input.strainState,
    availableStrains: [
      ...input.strainState.availableStrains,
      ...stabilizedBreeds.map((record) => record.id),
    ],
    runCount: input.strainState.runCount + (terminal ? 1 : 0),
    biomeCount: input.strainState.biomeCount + (terminal && archiveUpdate.newBiome ? 1 : 0),
  });
  const checkpoint = terminal ? null : prepareRunCheckpoint({
    run: runAfter,
    loadout: [...input.loadout],
    pendingGenomeDecodeIds,
    runStabilizedBreedIds,
  }, input.createdAt);

  return {
    commit: prepareResearchBankCommit({
      id: input.id,
      createdAt: input.createdAt,
      discovery: progressionToSave(progression),
      strains: strainState,
      caseRecord,
      archive: archiveUpdate.state,
      checkpoint,
    }),
    progression,
    runAfter,
    newGenomeDecodeIds: genomeEvents.map((event) => event.id),
    newSealIds: archiveUpdate.newSealIds,
    newBiome: archiveUpdate.newBiome,
  };
}

export function prepareResearchBankCommit(input: Omit<ResearchBankCommit, 'version'>): ResearchBankCommit {
  const commit = canonicalResearchBankCommit({ ...input, version: 1 });
  if (!commit) throw new Error('Cannot prepare an invalid research bank commit');
  return commit;
}

export function loadPendingResearchBank(
  storage: Pick<DiscoveryStorage, 'getItem'>,
): ResearchBankCommit | null {
  try {
    const raw = storage.getItem(RESEARCH_BANK_KEY);
    return raw ? canonicalResearchBankCommit(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function executeResearchBank(
  storage: DiscoveryStorage,
  commit: ResearchBankCommit,
  journalAlreadySaved = false,
): ResearchBankResult {
  const canonical = canonicalResearchBankCommit(commit);
  if (!canonical) throw new Error('Cannot execute an invalid research bank commit');

  if (!journalAlreadySaved) {
    const journal = writeVerifiedJson(
      storage,
      RESEARCH_BANK_KEY,
      canonical,
      () => loadPendingResearchBank(storage) ?? invalidCommit(),
    );
    if (journal.status !== 'saved') return unavailable(canonical, 'journal', journal.reason);
  }

  const discovery = saveDiscoveryStateVerified(storage, canonical.discovery);
  if (discovery.status !== 'saved') return unavailable(canonical, 'discovery', discovery.reason);

  // A journal may be replayed after some target stores were already written.
  // Merge ownership and apply terminal counters by monotonic absolute target so
  // a retry can neither lose a newer value nor increment the same run twice.
  const currentStrains = loadStrainLibraryState(storage);
  const targetStrains = canonicalStrainLibraryState({
    ...canonical.strains,
    availableStrains: [
      ...currentStrains.availableStrains,
      ...canonical.strains.availableStrains,
    ],
    loadoutSlots: Math.max(currentStrains.loadoutSlots, canonical.strains.loadoutSlots),
    runCount: Math.max(currentStrains.runCount, canonical.strains.runCount),
    biomeCount: Math.max(currentStrains.biomeCount, canonical.strains.biomeCount),
  });
  const strains = saveStrainLibraryStateVerified(storage, targetStrains);
  if (strains.status !== 'saved') return unavailable(canonical, 'strains', strains.reason);

  const caseRecord = saveCaseRecordVerified(storage, canonical.caseRecord);
  if (caseRecord.status !== 'saved') return unavailable(canonical, 'case-record', caseRecord.reason);

  const archive = saveResearchArchiveVerified(storage, canonical.archive);
  if (archive.status !== 'saved') return unavailable(canonical, 'archive', archive.reason);

  const checkpoint = canonical.checkpoint
    ? savePreparedRunCheckpoint(storage, canonical.checkpoint)
    : clearRunCheckpointVerified(storage);
  if (checkpoint.status !== 'saved') return unavailable(canonical, 'checkpoint', checkpoint.reason);

  const cleared = removeVerified(storage, RESEARCH_BANK_KEY);
  if (cleared.status !== 'saved') return unavailable(canonical, 'journal-clear', cleared.reason);
  return { status: 'saved', commit: { ...canonical, strains: strains.value } };
}

export function replayPendingResearchBank(storage: DiscoveryStorage): ResearchBankResult | null {
  const commit = loadPendingResearchBank(storage);
  return commit ? executeResearchBank(storage, commit, true) : null;
}

export function canonicalResearchBankCommit(value: unknown): ResearchBankCommit | null {
  if (!isObject(value) || serializedChars(value) > MAX_BANK_SERIALIZED_CHARS) return null;
  if (
    value.version !== 1
    || !boundedString(value.id, 3, MAX_BANK_ID_CHARS)
    || !boundedTimestamp(value.createdAt)
    || !isBoundedResearchBankContent(value)
  ) return null;
  if (
    !isExactCanonical(value.discovery, canonicalDiscoveryState)
    || !isExactCanonical(value.strains, canonicalStrainLibraryState)
    || !isExactCanonical(value.caseRecord, canonicalCaseRecord)
    || !isExactCanonical(value.archive, canonicalResearchArchive)
  ) return null;
  const checkpoint = value.checkpoint === null ? null : canonicalRunCheckpoint(value.checkpoint);
  if (value.checkpoint !== null && (!checkpoint || stableJson(checkpoint) !== stableJson(value.checkpoint))) return null;
  return {
    version: 1,
    id: value.id,
    createdAt: value.createdAt,
    discovery: canonicalDiscoveryState(value.discovery),
    strains: canonicalStrainLibraryState(value.strains),
    caseRecord: canonicalCaseRecord(value.caseRecord),
    archive: canonicalResearchArchive(value.archive),
    checkpoint,
  };
}

function unavailable(
  commit: ResearchBankCommit,
  stage: ResearchBankStage,
  reason: string,
): ResearchBankResult {
  return { status: 'unavailable', commit, stage, reason };
}

function progressionToSave(progression: DiscoveryProgressionState): DiscoverySaveState {
  return canonicalDiscoveryState({
    persistenceEnabled: true,
    discoveredBreedIds: progression.discoveredBreedIds,
    discoveredNoteIds: progression.discoveredNoteIds,
    breedDiscoveryRecords: progression.breedDiscoveryRecords,
    noteDiscoveryRecords: progression.noteDiscoveryRecords,
    revealAll: progression.revealAll,
  });
}

function invalidCommit(): ResearchBankCommit {
  return {
    version: 1,
    id: 'invalid-readback',
    createdAt: '1970-01-01T00:00:00.000Z',
    discovery: canonicalDiscoveryState({}),
    strains: canonicalStrainLibraryState({}),
    caseRecord: canonicalCaseRecord({}),
    archive: canonicalResearchArchive({}),
    checkpoint: null,
  };
}

function isExactCanonical<T>(value: unknown, canonicalize: (value: unknown) => T): boolean {
  if (!isObject(value)) return false;
  return stableJson(value) === stableJson(canonicalize(value));
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function serializedChars(value: unknown): number {
  try {
    return JSON.stringify(value).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function isBoundedResearchBankContent(value: Record<string, unknown>): boolean {
  if (
    !isObject(value.discovery)
    || !isObject(value.strains)
    || !isObject(value.caseRecord)
    || !isObject(value.archive)
  ) return false;

  const discovery = value.discovery;
  if (
    !boundedKnownIds(discovery.discoveredBreedIds, KNOWN_BREEDS, KNOWN_BREEDS.size)
    || !boundedKnownIds(discovery.discoveredNoteIds, KNOWN_NOTES, KNOWN_NOTES.size)
    || !boundedDiscoveryRecords(discovery.breedDiscoveryRecords, KNOWN_BREEDS, KNOWN_BREEDS.size)
    || !boundedDiscoveryRecords(discovery.noteDiscoveryRecords, KNOWN_NOTES, KNOWN_NOTES.size)
  ) return false;

  const strains = value.strains;
  if (
    !boundedKnownIds(strains.availableStrains, KNOWN_LIFEFORMS, KNOWN_LIFEFORMS.size)
    || !boundedKnownIds(strains.loadout, KNOWN_LIFEFORMS, 6)
    || !boundedCounter(strains.runCount)
    || !boundedCounter(strains.biomeCount)
  ) return false;

  const caseRecord = value.caseRecord;
  if (!boundedKnownIds(
    caseRecord.completedTrialIds,
    KNOWN_CASE_TRIALS,
    KNOWN_CASE_TRIALS.size,
  )) return false;

  const archive = value.archive;
  if (
    !boundedKnownIds(archive.earnedSealIds, KNOWN_RESEARCH_SEALS, KNOWN_RESEARCH_SEALS.size)
    || !Array.isArray(archive.biomeRecords)
    || archive.biomeRecords.length > MAX_BIOME_ARCHIVE_RECORDS
    || !archive.biomeRecords.every((record) => (
      isObject(record)
      && boundedString(record.name, 1, MAX_BIOME_NAME_CHARS)
      && boundedTimestamp(record.recordedAt)
    ))
    || !isObject(archive.records)
    || !boundedCounter(archive.records.peakBiodiversity)
    || !boundedCounter(archive.records.maxReactions)
    || !boundedCounter(archive.records.longestStabilitySeconds)
  ) return false;

  return value.checkpoint === null || isBoundedCheckpoint(value.checkpoint);
}

function boundedDiscoveryRecords(
  value: unknown,
  knownIds: ReadonlySet<string>,
  maxItems: number,
): boolean {
  return Array.isArray(value)
    && value.length <= maxItems
    && value.every((record) => (
      isObject(record)
      && boundedString(record.id, 1, MAX_BANK_ID_CHARS)
      && knownIds.has(record.id)
      && boundedTimestamp(record.discoveredAt)
      && typeof record.fresh === 'boolean'
      && (record.stage === 'observed' || record.stage === 'understood' || record.stage === 'stabilized')
    ));
}

function isBoundedCheckpoint(value: unknown): boolean {
  if (!isObject(value) || !isObject(value.run)) return false;
  const run = value.run;
  return boundedTimestamp(value.savedAt)
    && Number.isSafeInteger(run.seed)
    && Number.isSafeInteger(run.fightIndex)
    && boundedArray(run.upgrades, 64)
    && boundedArray(run.pendingPickChoices, 3)
    && boundedArray(run.epochResults, 10_001)
    && boundedKnownIds(value.loadout, KNOWN_LIFEFORMS, 6)
    && boundedKnownIds(value.pendingGenomeDecodeIds, KNOWN_LIFEFORMS, KNOWN_LIFEFORMS.size)
    && boundedKnownIds(value.runStabilizedBreedIds, KNOWN_BREEDS, KNOWN_BREEDS.size);
}

function boundedKnownIds(
  value: unknown,
  knownIds: ReadonlySet<string>,
  maxItems: number,
): boolean {
  return Array.isArray(value)
    && value.length <= maxItems
    && value.every((id) => boundedString(id, 1, MAX_BANK_ID_CHARS) && knownIds.has(id));
}

function boundedArray(value: unknown, maxItems: number): boolean {
  return Array.isArray(value) && value.length <= maxItems;
}

function boundedCounter(value: unknown): boolean {
  return Number.isSafeInteger(value)
    && (value as number) >= 0
    && (value as number) <= MAX_LIFETIME_COUNTER;
}

function boundedTimestamp(value: unknown): value is string {
  return boundedString(value, 1, MAX_TIMESTAMP_CHARS) && Number.isFinite(Date.parse(value));
}

function boundedString(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.length >= min && value.length <= max;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, sortValue(item)]),
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
