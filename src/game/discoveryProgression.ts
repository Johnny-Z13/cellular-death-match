import type { EnemyArchetype } from '../content/enemies';
import {
  BREED_DEFS,
  DISCOVERY_NOTES,
  type BreedId,
  type DiscoveryNoteId,
} from '../content/catalysis';
import type { DiscoverySaveState } from './discoverySave';

export type ProgressionToolId = 'egg' | 'nutrient' | 'toxin' | 'water' | 'salt' | 'acid';
export type ProgressionLifeformId = EnemyArchetype | BreedId;

export interface DiscoveryProgressionState {
  discoveredBreedIds: BreedId[];
  discoveredNoteIds: DiscoveryNoteId[];
  unlockedTools: ProgressionToolId[];
  unlockedLifeforms: ProgressionLifeformId[];
  revealAll: boolean;
}

export interface DiscoveryDelta {
  breedIds?: readonly BreedId[];
  noteIds?: readonly DiscoveryNoteId[];
}

export const STARTER_PROGRESSION_TOOLS: readonly ProgressionToolId[] = ['egg', 'nutrient', 'toxin'];
export const STARTER_PROGRESSION_LIFEFORMS: readonly ProgressionLifeformId[] = [
  'swarmlet',
  'bruiser',
  'splitter',
];

export const ALL_PROGRESSION_TOOLS: readonly ProgressionToolId[] = [
  'egg',
  'nutrient',
  'toxin',
  'water',
  'salt',
  'acid',
];

export const ALL_PROGRESSION_LIFEFORMS: readonly ProgressionLifeformId[] = [
  'swarmlet',
  'bruiser',
  'splitter',
  'sniper',
  'mirror',
  'boss',
  'bloom_mass',
  'glass_antibody',
  'needle_swarm',
  'static_lattice',
  'folded_anchor',
];

const VALID_BREEDS = new Set(Object.keys(BREED_DEFS));
const VALID_NOTES = new Set(Object.keys(DISCOVERY_NOTES));

export function createDiscoveryProgression(
  saved?: Pick<DiscoverySaveState, 'discoveredBreedIds' | 'discoveredNoteIds' | 'revealAll'>,
): DiscoveryProgressionState {
  if (saved?.revealAll) return revealAllDiscoveryProgression();
  return buildProgression({
    discoveredBreedIds: uniqueValid(saved?.discoveredBreedIds ?? [], VALID_BREEDS) as BreedId[],
    discoveredNoteIds: uniqueValid(saved?.discoveredNoteIds ?? [], VALID_NOTES) as DiscoveryNoteId[],
    revealAll: false,
  });
}

export function updateDiscoveryProgression(
  state: DiscoveryProgressionState,
  delta: DiscoveryDelta,
): DiscoveryProgressionState {
  if (state.revealAll) return revealAllDiscoveryProgression();
  return buildProgression({
    discoveredBreedIds: uniqueValid([
      ...state.discoveredBreedIds,
      ...(delta.breedIds ?? []),
    ], VALID_BREEDS) as BreedId[],
    discoveredNoteIds: uniqueValid([
      ...state.discoveredNoteIds,
      ...(delta.noteIds ?? []),
    ], VALID_NOTES) as DiscoveryNoteId[],
    revealAll: false,
  });
}

export function revealAllDiscoveryProgression(
  state?: DiscoveryProgressionState,
): DiscoveryProgressionState {
  return {
    discoveredBreedIds: uniqueValid([
      ...(state?.discoveredBreedIds ?? []),
      ...Object.keys(BREED_DEFS),
    ], VALID_BREEDS) as BreedId[],
    discoveredNoteIds: uniqueValid([
      ...(state?.discoveredNoteIds ?? []),
      ...Object.keys(DISCOVERY_NOTES),
    ], VALID_NOTES) as DiscoveryNoteId[],
    unlockedTools: [...ALL_PROGRESSION_TOOLS],
    unlockedLifeforms: [...ALL_PROGRESSION_LIFEFORMS],
    revealAll: true,
  };
}

export function clearDiscoveryProgression(_state?: DiscoveryProgressionState): DiscoveryProgressionState {
  return buildProgression({
    discoveredBreedIds: [],
    discoveredNoteIds: [],
    revealAll: false,
  });
}

function buildProgression(base: {
  discoveredBreedIds: BreedId[];
  discoveredNoteIds: DiscoveryNoteId[];
  revealAll: boolean;
}): DiscoveryProgressionState {
  const toolSet = new Set<ProgressionToolId>(STARTER_PROGRESSION_TOOLS);
  const lifeformSet = new Set<ProgressionLifeformId>(STARTER_PROGRESSION_LIFEFORMS);
  const breeds = new Set(base.discoveredBreedIds);
  const notes = new Set(base.discoveredNoteIds);

  for (const breed of breeds) lifeformSet.add(breed);

  if (breeds.has('bloom_mass')) {
    toolSet.add('water');
  }
  if (notes.has('recipe_nutrient_conduit') || notes.has('water_carries')) {
    toolSet.add('salt');
  }
  if (notes.has('recipe_salt_water_crystal') || breeds.has('glass_antibody')) {
    toolSet.add('acid');
  }
  if (notes.has('recipe_acid_toxin_flare') || breeds.has('needle_swarm')) {
    lifeformSet.add('sniper');
  }
  if (breeds.has('needle_swarm') || breeds.has('static_lattice')) {
    lifeformSet.add('mirror');
  }
  if (notes.has('recipe_folding_fault') || breeds.has('folded_anchor')) {
    lifeformSet.add('boss');
  }

  return {
    discoveredBreedIds: base.discoveredBreedIds,
    discoveredNoteIds: base.discoveredNoteIds,
    unlockedTools: ALL_PROGRESSION_TOOLS.filter((tool) => toolSet.has(tool)),
    unlockedLifeforms: ALL_PROGRESSION_LIFEFORMS.filter((lifeform) => lifeformSet.has(lifeform)),
    revealAll: base.revealAll,
  };
}

function uniqueValid(values: readonly string[], allowed: Set<string>): string[] {
  return [...new Set(values.filter((value) => allowed.has(value)))];
}
