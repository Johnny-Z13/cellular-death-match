import type { EnemyArchetype } from '../content/enemies';
import { EGG_ARCHETYPES } from '../content/enemies';
import {
  BREED_DEFS,
  DISCOVERY_NOTES,
  type BreedId,
  type CautionLevel,
  type DiscoveryNoteId,
} from '../content/catalysis';
import type { DiscoverySaveRecord, DiscoverySaveState, ResearchStage } from './discoverySave';

export type ProgressionToolId = 'egg' | 'nutrient' | 'toxin' | 'water' | 'salt' | 'acid' | 'paste' | 'agitate';
export type ProgressionLifeformId = EnemyArchetype | BreedId;
export type DiscoveryRecord<Id extends string> = DiscoverySaveRecord<Id>;

export interface DiscoveryProgressionState {
  discoveredBreedIds: BreedId[];
  discoveredNoteIds: DiscoveryNoteId[];
  breedDiscoveryRecords: DiscoveryRecord<BreedId>[];
  noteDiscoveryRecords: DiscoveryRecord<DiscoveryNoteId>[];
  unlockedTools: ProgressionToolId[];
  unlockedLifeforms: ProgressionLifeformId[];
  revealAll: boolean;
}

export interface DiscoveryDelta {
  breedIds?: readonly BreedId[];
  noteIds?: readonly DiscoveryNoteId[];
}

export interface DiscoveryStageDelta {
  breed?: ResearchStage;
  note?: ResearchStage;
}

export type DiscoveryTickerTone = 'discovery' | 'caution' | 'critical';

export interface DiscoveryAnnouncement {
  message: string;
  tone: DiscoveryTickerTone;
}

export const STARTER_PROGRESSION_TOOLS: readonly ProgressionToolId[] = ['egg', 'nutrient'];
export const STARTER_PROGRESSION_LIFEFORMS: readonly ProgressionLifeformId[] = [
  'swarmlet',
];

export const ALL_PROGRESSION_TOOLS: readonly ProgressionToolId[] = [
  'egg',
  'nutrient',
  'toxin',
  'water',
  'salt',
  'acid',
  'paste',
  'agitate',
];

export const ALL_PROGRESSION_LIFEFORMS: readonly ProgressionLifeformId[] = [
  ...EGG_ARCHETYPES,
  ...(Object.keys(BREED_DEFS) as BreedId[]),
];

const VALID_BREEDS = new Set(Object.keys(BREED_DEFS));
const VALID_NOTES = new Set(Object.keys(DISCOVERY_NOTES));

export function createDiscoveryProgression(
  saved?: Pick<
    DiscoverySaveState,
    'discoveredBreedIds'
    | 'discoveredNoteIds'
    | 'breedDiscoveryRecords'
    | 'noteDiscoveryRecords'
    | 'revealAll'
  >,
): DiscoveryProgressionState {
  const discoveredAt = new Date().toISOString();
  const discoveredBreedIds = uniqueValid(saved?.discoveredBreedIds ?? [], VALID_BREEDS) as BreedId[];
  const discoveredNoteIds = uniqueValid(saved?.discoveredNoteIds ?? [], VALID_NOTES) as DiscoveryNoteId[];
  const progression = buildProgression({
    discoveredBreedIds,
    discoveredNoteIds,
    breedDiscoveryRecords: discoveryRecordsForIds(
      saved?.breedDiscoveryRecords,
      discoveredBreedIds,
      discoveredAt,
      false,
      VALID_BREEDS,
      'stabilized',
    ),
    noteDiscoveryRecords: discoveryRecordsForIds(
      saved?.noteDiscoveryRecords,
      discoveredNoteIds,
      discoveredAt,
      false,
      VALID_NOTES,
      'understood',
    ),
    revealAll: false,
  });
  if (saved?.revealAll) return revealAllDiscoveryProgression(progression, discoveredAt, false);
  return progression;
}

export function updateDiscoveryProgression(
  state: DiscoveryProgressionState,
  delta: DiscoveryDelta,
  discoveredAt = new Date().toISOString(),
  stages: DiscoveryStageDelta = {},
): DiscoveryProgressionState {
  if (state.revealAll) return revealAllDiscoveryProgression(state, discoveredAt);
  const breedStage = stages.breed ?? 'stabilized';
  const noteStage = stages.note ?? 'understood';
  const discoveredBreedIds = uniqueValid([
    ...state.discoveredBreedIds,
    ...(delta.breedIds ?? []),
  ], VALID_BREEDS) as BreedId[];
  const discoveredNoteIds = uniqueValid([
    ...state.discoveredNoteIds,
    ...(delta.noteIds ?? []),
  ], VALID_NOTES) as DiscoveryNoteId[];
  return buildProgression({
    discoveredBreedIds,
    discoveredNoteIds,
    breedDiscoveryRecords: discoveryRecordsForIds(
      state.breedDiscoveryRecords,
      discoveredBreedIds,
      discoveredAt,
      true,
      VALID_BREEDS,
      breedStage,
      breedStage,
      delta.breedIds,
    ),
    noteDiscoveryRecords: discoveryRecordsForIds(
      state.noteDiscoveryRecords,
      discoveredNoteIds,
      discoveredAt,
      true,
      VALID_NOTES,
      noteStage,
      noteStage,
      delta.noteIds,
    ),
    revealAll: false,
  });
}

export function revealAllDiscoveryProgression(
  state?: DiscoveryProgressionState,
  discoveredAt = new Date().toISOString(),
  freshForMissing = true,
): DiscoveryProgressionState {
  const discoveredBreedIds = uniqueValid([
    ...(state?.discoveredBreedIds ?? []),
    ...Object.keys(BREED_DEFS),
  ], VALID_BREEDS) as BreedId[];
  const discoveredNoteIds = uniqueValid([
    ...(state?.discoveredNoteIds ?? []),
    ...Object.keys(DISCOVERY_NOTES),
  ], VALID_NOTES) as DiscoveryNoteId[];
  return {
    discoveredBreedIds,
    discoveredNoteIds,
    breedDiscoveryRecords: discoveryRecordsForIds(
      state?.breedDiscoveryRecords,
      discoveredBreedIds,
      discoveredAt,
      freshForMissing,
      VALID_BREEDS,
      'stabilized',
      'stabilized',
      discoveredBreedIds,
    ),
    noteDiscoveryRecords: discoveryRecordsForIds(
      state?.noteDiscoveryRecords,
      discoveredNoteIds,
      discoveredAt,
      freshForMissing,
      VALID_NOTES,
      'understood',
      'understood',
      discoveredNoteIds,
    ),
    unlockedTools: [...ALL_PROGRESSION_TOOLS],
    unlockedLifeforms: [...ALL_PROGRESSION_LIFEFORMS],
    revealAll: true,
  };
}

export function clearDiscoveryProgression(_state?: DiscoveryProgressionState): DiscoveryProgressionState {
  return buildProgression({
    discoveredBreedIds: [],
    discoveredNoteIds: [],
    breedDiscoveryRecords: [],
    noteDiscoveryRecords: [],
    revealAll: false,
  });
}

export function acknowledgeNotebookDiscoveries(
  state: DiscoveryProgressionState,
): DiscoveryProgressionState {
  const hasFreshBreed = state.breedDiscoveryRecords.some((record) => record.fresh);
  const hasFreshNote = state.noteDiscoveryRecords.some((record) => record.fresh);
  if (!hasFreshBreed && !hasFreshNote) return state;
  return {
    ...state,
    breedDiscoveryRecords: state.breedDiscoveryRecords.map((record) => ({ ...record, fresh: false })),
    noteDiscoveryRecords: state.noteDiscoveryRecords.map((record) => ({ ...record, fresh: false })),
  };
}

export function discoveryAnnouncementsForProgressionChange(
  previous: DiscoveryProgressionState,
  next: DiscoveryProgressionState,
): DiscoveryAnnouncement[] {
  const previousBreeds = new Set(previous.discoveredBreedIds);
  const previousNotes = new Set(previous.discoveredNoteIds);
  const previousBreedStages = new Map(previous.breedDiscoveryRecords.map((record) => [record.id, record.stage]));
  const previousNoteStages = new Map(previous.noteDiscoveryRecords.map((record) => [record.id, record.stage]));
  const nextBreedStages = new Map(next.breedDiscoveryRecords.map((record) => [record.id, record.stage]));
  const nextNoteStages = new Map(next.noteDiscoveryRecords.map((record) => [record.id, record.stage]));
  const announcements: DiscoveryAnnouncement[] = [];

  for (const breedId of next.discoveredBreedIds) {
    const stage = nextBreedStages.get(breedId) ?? 'observed';
    const previousStage = previousBreedStages.get(breedId);
    if (previousBreeds.has(breedId) && stageRank(previousStage) >= stageRank(stage)) continue;
    announcements.push({
      message: stage === 'stabilized'
        ? `Specimen stabilized: ${BREED_DEFS[breedId].name}. Added to the Atlas.`
        : `New lifeform observed: ${BREED_DEFS[breedId].name}. Stabilize it alive to bank the egg.`,
      tone: toneForCaution(DISCOVERY_NOTES[`breed_${breedId}`].caution),
    });
  }

  for (const noteId of next.discoveredNoteIds) {
    const stage = nextNoteStages.get(noteId) ?? 'observed';
    const previousStage = previousNoteStages.get(noteId);
    if ((previousNotes.has(noteId) && stageRank(previousStage) >= stageRank(stage)) || noteId.startsWith('breed_')) continue;
    const note = DISCOVERY_NOTES[noteId];
    announcements.push({
      message: stage === 'observed'
        ? `Reaction observed: ${note.title}. Reproduce it to understand the protocol.`
        : `${noteId.startsWith('recipe_') ? 'Protocol understood' : 'Lab note understood'}: ${note.title}.`,
      tone: toneForCaution(note.caution),
    });
  }

  return announcements;
}

function buildProgression(base: {
  discoveredBreedIds: BreedId[];
  discoveredNoteIds: DiscoveryNoteId[];
  breedDiscoveryRecords: DiscoveryRecord<BreedId>[];
  noteDiscoveryRecords: DiscoveryRecord<DiscoveryNoteId>[];
  revealAll: boolean;
}): DiscoveryProgressionState {
  const toolSet = new Set<ProgressionToolId>(STARTER_PROGRESSION_TOOLS);
  const lifeformSet = new Set<ProgressionLifeformId>(STARTER_PROGRESSION_LIFEFORMS);
  const breeds = new Set(base.breedDiscoveryRecords
    .filter((record) => record.stage === 'stabilized')
    .map((record) => record.id));
  const notes = new Set(base.noteDiscoveryRecords
    .filter((record) => stageRank(record.stage) >= stageRank('understood'))
    .map((record) => record.id));

  for (const breed of breeds) lifeformSet.add(breed);

  if (breeds.has('bloom_mass')) {
    toolSet.add('toxin');
    toolSet.add('water');
    toolSet.add('paste');
    toolSet.add('agitate');
  }
  if (notes.has('recipe_bitter_bloom') || notes.has('recipe_pressure_bloom')) {
    lifeformSet.add('bruiser');
  }
  if (notes.has('recipe_nutrient_conduit') || notes.has('water_carries')) {
    lifeformSet.add('splitter');
  }
  if (
    notes.has('recipe_nutrient_conduit')
    || notes.has('recipe_agitated_chain')
    || notes.has('recipe_bitter_bloom')
    || notes.has('recipe_pressure_bloom')
    || notes.has('recipe_incubator_shock')
    || notes.has('recipe_toxin_water_mist')
    || notes.has('water_carries')
  ) {
    toolSet.add('salt');
  }
  if (notes.has('recipe_salt_water_crystal') || breeds.has('glass_antibody')) {
    toolSet.add('acid');
  }
  if (notes.has('recipe_acid_toxin_flare') || breeds.has('needle_swarm')) {
    lifeformSet.add('sniper');
  }
  if (
    breeds.has('needle_swarm')
    || breeds.has('static_lattice')
    || notes.has('recipe_foam_lightning')
    || notes.has('recipe_mist_salt_discharge')
  ) {
    lifeformSet.add('mirror');
  }
  if (
    notes.has('recipe_folding_fault')
    || notes.has('recipe_foam_salt_rule30')
    || notes.has('recipe_crystal_toxin_prism')
    || notes.has('recipe_brine_flash')
    || breeds.has('folded_anchor')
  ) {
    lifeformSet.add('boss');
  }

  return {
    discoveredBreedIds: base.discoveredBreedIds,
    discoveredNoteIds: base.discoveredNoteIds,
    breedDiscoveryRecords: base.breedDiscoveryRecords,
    noteDiscoveryRecords: base.noteDiscoveryRecords,
    unlockedTools: ALL_PROGRESSION_TOOLS.filter((tool) => toolSet.has(tool)),
    unlockedLifeforms: ALL_PROGRESSION_LIFEFORMS.filter((lifeform) => lifeformSet.has(lifeform)),
    revealAll: base.revealAll,
  };
}

function uniqueValid(values: readonly string[], allowed: Set<string>): string[] {
  return [...new Set(values.filter((value) => allowed.has(value)))];
}

function discoveryRecordsForIds<Id extends string>(
  existingRecords: readonly DiscoveryRecord<Id>[] | undefined,
  ids: readonly Id[],
  discoveredAt: string,
  freshForMissing: boolean,
  allowed: Set<string>,
  stageForMissing: ResearchStage,
  promoteStage?: ResearchStage,
  idsToPromote: readonly Id[] = [],
): DiscoveryRecord<Id>[] {
  const wantedIds = new Set<string>(ids);
  const promoteIds = new Set<string>(idsToPromote);
  const records = new Map<string, DiscoveryRecord<Id>>();

  for (const record of existingRecords ?? []) {
    if (!allowed.has(record.id) || !wantedIds.has(record.id)) continue;
    const stage = promoteStage && promoteIds.has(record.id)
      ? higherResearchStage(record.stage, promoteStage)
      : record.stage;
    records.set(record.id, {
      id: record.id,
      discoveredAt: record.discoveredAt || discoveredAt,
      fresh: record.fresh === true || stage !== record.stage,
      stage,
    });
  }

  for (const id of ids) {
    if (records.has(id)) continue;
    records.set(id, {
      id,
      discoveredAt,
      fresh: freshForMissing,
      stage: stageForMissing,
    });
  }

  return ids.map((id) => records.get(id)!);
}

function stageRank(stage: ResearchStage | undefined): number {
  if (stage === 'stabilized') return 2;
  if (stage === 'understood') return 1;
  return 0;
}

function higherResearchStage(current: ResearchStage, requested: ResearchStage): ResearchStage {
  return stageRank(requested) > stageRank(current) ? requested : current;
}

function toneForCaution(caution: CautionLevel): DiscoveryTickerTone {
  if (caution === 'critical') return 'critical';
  if (caution === 'volatile') return 'caution';
  return 'discovery';
}
