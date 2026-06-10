import {
  BREED_DEFS,
  DISCOVERY_NOTES,
  type BreedId,
  type CautionLevel,
  type DiscoveryNoteId,
} from './catalysis';
import { LIFEFORM_IDENTITIES, type LifeformIdentityId } from './lifeformIdentity';
import type { DiscoveryProgressionState } from '../game/discoveryProgression';

export type NotebookCategory = 'lifeform' | 'catalyst' | 'lab_note' | 'event';

export interface NotebookEntry {
  id: string;
  category: NotebookCategory;
  title: string;
  lockedTitle: string;
  body: string;
  clue: string;
  caution: CautionLevel;
  unlock: {
    starter?: boolean;
    breedId?: BreedId;
    noteId?: DiscoveryNoteId;
  };
}

export interface NotebookViewEntry extends NotebookEntry {
  discovered: boolean;
  displayTitle: string;
  displayBody: string;
  displayClue: string;
  displayNotes: string;
  displayRecipe: string;
  discoveredAtLabel: string;
  isFresh: boolean;
}

export interface NotebookView {
  discoveredCount: number;
  totalCount: number;
  entries: NotebookViewEntry[];
}

const STARTER_LIFEFORMS: readonly LifeformIdentityId[] = ['swarmlet', 'bruiser', 'splitter'];

const RARE_LIFEFORMS: readonly BreedId[] = [
  'bloom_mass',
  'glass_antibody',
  'needle_swarm',
  'static_lattice',
  'folded_anchor',
  'quill_bloom',
  'vitric_anchor',
  'mire_lattice',
];

const CATALYST_NOTES: readonly DiscoveryNoteId[] = [
  'recipe_nutrient_conduit',
  'recipe_bitter_bloom',
  'recipe_pressure_bloom',
  'recipe_toxin_water_mist',
  'recipe_foam_lightning',
  'recipe_chromatic_spill',
  'recipe_lattice_bloom',
  'recipe_velvet_prison',
  'recipe_mist_salt_discharge',
  'recipe_acid_water_foam',
  'recipe_crystal_toxin_prism',
  'recipe_brine_flash',
  'recipe_acid_toxin_flare',
  'recipe_salt_water_crystal',
  'recipe_agitated_chain',
  'recipe_brine_channel',
];

const EVENT_NOTES: readonly DiscoveryNoteId[] = [
  'recipe_incubator_shock',
  'recipe_spore_comet',
  'recipe_foam_salt_rule30',
  'recipe_folding_fault',
];

const LAB_NOTES: readonly DiscoveryNoteId[] = ['water_carries', 'water_dilutes'];

export const NOTEBOOK_ENTRIES: readonly NotebookEntry[] = [
  ...STARTER_LIFEFORMS.map(lifeformEntry),
  ...RARE_LIFEFORMS.map(rareLifeformEntry),
  ...CATALYST_NOTES.map((noteId) => noteEntry('catalyst', noteId)),
  ...LAB_NOTES.map((noteId) => noteEntry('lab_note', noteId)),
  ...EVENT_NOTES.map((noteId) => noteEntry('event', noteId)),
];

export function notebookViewForProgression(
  progression: DiscoveryProgressionState,
  viewedAt = new Date().toISOString(),
): NotebookView {
  const discoveredBreeds = new Set(progression.discoveredBreedIds);
  const discoveredNotes = new Set(progression.discoveredNoteIds);
  const breedRecords = new Map(progression.breedDiscoveryRecords.map((record) => [record.id, record]));
  const noteRecords = new Map(progression.noteDiscoveryRecords.map((record) => [record.id, record]));
  const entries = NOTEBOOK_ENTRIES.flatMap((entry): NotebookViewEntry[] => {
    const discovered = progression.revealAll
      || entry.unlock.starter === true
      || Boolean(entry.unlock.breedId && discoveredBreeds.has(entry.unlock.breedId))
      || Boolean(entry.unlock.noteId && discoveredNotes.has(entry.unlock.noteId));
    if (!discovered) return [];

    const record = entry.unlock.breedId
      ? breedRecords.get(entry.unlock.breedId)
      : entry.unlock.noteId
        ? noteRecords.get(entry.unlock.noteId)
        : null;

    return [{
      ...entry,
      discovered,
      displayTitle: entry.title,
      displayBody: entry.body,
      displayClue: entry.clue,
      displayNotes: `Notes: ${entry.body}`,
      displayRecipe: recipeLabelFor(entry.category, entry.clue),
      discoveredAtLabel: `Discovery discovered on ${formatDiscoveryDate(record?.discoveredAt ?? viewedAt)}`,
      isFresh: record?.fresh === true,
    }];
  });

  return {
    discoveredCount: entries.length,
    totalCount: NOTEBOOK_ENTRIES.length,
    entries,
  };
}

function lifeformEntry(id: LifeformIdentityId): NotebookEntry {
  const identity = LIFEFORM_IDENTITIES[id];
  return {
    id: `lifeform_${id}`,
    category: 'lifeform',
    title: identity.name,
    lockedTitle: 'Unknown lifeform',
    body: `${identity.role}. ${identity.behavior}`,
    clue: identity.origin,
    caution: 'stable',
    unlock: { starter: true },
  };
}

function rareLifeformEntry(id: BreedId): NotebookEntry {
  const identity = LIFEFORM_IDENTITIES[id];
  const note = DISCOVERY_NOTES[`breed_${id}`];
  return {
    id: `lifeform_${id}`,
    category: 'lifeform',
    title: identity.name,
    lockedTitle: 'Unknown lifeform',
    body: note.body,
    clue: BREED_DEFS[id].discoveryTrigger,
    caution: note.caution,
    unlock: { breedId: id },
  };
}

function noteEntry(category: Exclude<NotebookCategory, 'lifeform'>, noteId: DiscoveryNoteId): NotebookEntry {
  const note = DISCOVERY_NOTES[noteId];
  return {
    id: `${category}_${noteId}`,
    category,
    title: note.title,
    lockedTitle: lockedTitleFor(category),
    body: note.body,
    clue: clueForNote(noteId, category),
    caution: note.caution,
    unlock: { noteId },
  };
}

function lockedTitleFor(category: Exclude<NotebookCategory, 'lifeform'>): string {
  if (category === 'catalyst') return 'Unknown catalyst';
  if (category === 'event') return 'Unknown event';
  return 'Unknown lab note';
}

function clueForNote(noteId: DiscoveryNoteId, category: NotebookCategory): string {
  if (noteId === 'water_carries') return 'Try Water on Nutrient fields near budding cultures.';
  if (noteId === 'water_dilutes') return 'Try Water after Acid or Toxin if the dish is getting too sharp.';
  if (noteId === 'recipe_nutrient_conduit') return 'Water plus Nutrient carries food through budding cultures.';
  if (noteId === 'recipe_bitter_bloom') return 'Feed a budding culture, then sour it with Toxin.';
  if (noteId === 'recipe_pressure_bloom') return 'Put Toxin pressure into a resistant fed culture.';
  if (noteId === 'recipe_incubator_shock') return 'Hatch an egg inside overlapping Nutrient and Toxin.';
  if (noteId === 'recipe_toxin_water_mist') return 'Use Water to disturb Toxin around quick starter cultures.';
  if (noteId === 'recipe_foam_lightning') return 'Add Water back into unstable Foam near quick cultures.';
  if (noteId === 'recipe_chromatic_spill') return 'Layer Acid, Water, and Nutrient around fragile or budding tissue.';
  if (noteId === 'recipe_lattice_bloom') return 'Feed a Crystal field near budding or mirror-like cultures.';
  if (noteId === 'recipe_spore_comet') return 'Shake the dish, then hatch into reactive Foam.';
  if (noteId === 'recipe_velvet_prison') return 'Trap gelatinous anchors with Salt and Toxin.';
  if (noteId === 'recipe_mist_salt_discharge') return 'Salt can snap a drifting mist into static.';
  if (noteId === 'recipe_acid_water_foam') return 'Water can invert Acid around soft or fragile tissue.';
  if (noteId === 'recipe_foam_salt_rule30') return 'Salt can turn unstable Foam into a Rule-30 style fold.';
  if (noteId === 'recipe_crystal_toxin_prism') return 'Fracture crystal pressure with Toxin near mirror-like cultures.';
  if (noteId === 'recipe_brine_flash') return 'Put Acid into salty pressure near soft or resistant cultures.';
  if (noteId === 'recipe_acid_toxin_flare') return 'Acid and Toxin are dangerous near fragile cultures.';
  if (noteId === 'recipe_salt_water_crystal') return 'Salt and Water crystallize movement near gel cultures.';
  if (noteId === 'recipe_agitated_chain') return 'Shake a fed reaction field before it settles.';
  if (noteId === 'recipe_folding_fault') return 'Acid, Water, and Salt can fold gel cultures into local rules.';
  return category === 'event'
    ? 'Look for the dish event ring that matches this notebook entry.'
    : 'Repeat the experiment and watch the dish log.';
}

function recipeLabelFor(category: NotebookCategory, clue: string): string {
  if (category === 'lifeform') return `Recipe: ${clue}`;
  if (category === 'lab_note') return `Evidence: ${clue}`;
  return `Recipe: ${clue}`;
}

function formatDiscoveryDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return 'date unknown';
  const [, year, monthText, dayText] = match;
  const month = Number(monthText);
  const day = Number(dayText);
  const monthName = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ][month - 1];
  if (!year || !monthName || !Number.isFinite(day)) return 'date unknown';
  return `${monthName} ${day}, ${year}`;
}
