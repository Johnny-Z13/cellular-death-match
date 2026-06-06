import { describe, expect, it } from 'vitest';
import { DISCOVERY_NOTES } from '../../src/content/catalysis';
import {
  NOTEBOOK_ENTRIES,
  notebookViewForProgression,
  type NotebookCategory,
} from '../../src/content/notebook';
import {
  clearDiscoveryProgression,
  createDiscoveryProgression,
  revealAllDiscoveryProgression,
  updateDiscoveryProgression,
} from '../../src/game/discoveryProgression';

describe('notebook catalogue content', () => {
  it('defines complete entries across every notebook category', () => {
    const categories = new Set<NotebookCategory>();

    for (const entry of NOTEBOOK_ENTRIES) {
      categories.add(entry.category);
      expect(entry.id.length).toBeGreaterThan(3);
      expect(entry.title.length).toBeGreaterThan(3);
      expect(entry.lockedTitle.length).toBeGreaterThan(3);
      expect(entry.body.length).toBeGreaterThan(12);
      expect(entry.clue.length).toBeGreaterThan(12);
      expect(['stable', 'volatile', 'critical']).toContain(entry.caution);
      expect(
        entry.unlock.starter === true
          || Boolean(entry.unlock.breedId)
          || Boolean(entry.unlock.noteId),
      ).toBe(true);
    }

    expect([...categories].sort()).toEqual(['catalyst', 'event', 'lab_note', 'lifeform']);
  });

  it('starts with starter lifeforms visible and mysteries locked', () => {
    const view = notebookViewForProgression(createDiscoveryProgression());
    const visible = view.entries.filter((entry) => entry.discovered);
    const locked = view.entries.filter((entry) => !entry.discovered);

    expect(view.discoveredCount).toBe(3);
    expect(view.totalCount).toBe(NOTEBOOK_ENTRIES.length);
    expect(visible.map((entry) => entry.title).sort()).toEqual(['Bruiser', 'Splitter', 'Swarmlet']);
    expect(locked.length).toBeGreaterThan(8);
    expect(locked.every((entry) => entry.displayTitle.startsWith('Unknown'))).toBe(true);
    expect(locked.some((entry) => entry.category === 'catalyst')).toBe(true);
  });

  it('reveals breed and catalyst entries from progression discoveries', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass', 'recipe_nutrient_conduit', 'water_carries'],
    });

    const view = notebookViewForProgression(progression);

    expect(view.entries.find((entry) => entry.id === 'lifeform_bloom_mass')?.discovered).toBe(true);
    expect(view.entries.find((entry) => entry.id === 'catalyst_recipe_nutrient_conduit')?.discovered).toBe(true);
    expect(view.entries.find((entry) => entry.id === 'lab_note_water_carries')?.discovered).toBe(true);
    expect(view.discoveredCount).toBe(6);
  });

  it('reveals every entry in reveal-all mode and returns to starters after clear', () => {
    const revealed = notebookViewForProgression(revealAllDiscoveryProgression(createDiscoveryProgression()));
    expect(revealed.discoveredCount).toBe(revealed.totalCount);
    expect(revealed.entries.every((entry) => entry.discovered)).toBe(true);

    const cleared = notebookViewForProgression(clearDiscoveryProgression());
    expect(cleared.discoveredCount).toBe(3);
    expect(cleared.entries.filter((entry) => entry.discovered).map((entry) => entry.title).sort()).toEqual([
      'Bruiser',
      'Splitter',
      'Swarmlet',
    ]);
  });

  it('uses authored discovery notes for catalyst and lab-note catalogue entries', () => {
    const noteTitles = new Set(Object.values(DISCOVERY_NOTES).map((note) => note.title));
    const noteBackedEntries = NOTEBOOK_ENTRIES.filter((entry) => entry.unlock.noteId);

    expect(noteBackedEntries.length).toBeGreaterThan(10);
    for (const entry of noteBackedEntries) {
      expect(noteTitles.has(entry.title)).toBe(true);
    }
  });

  it('catalogues the expanded fictional catalyst discoveries', () => {
    const entryIds = NOTEBOOK_ENTRIES.map((entry) => entry.id);

    expect(entryIds).toContain('catalyst_recipe_chromatic_spill');
    expect(entryIds).toContain('catalyst_recipe_lattice_bloom');
    expect(entryIds).toContain('event_recipe_spore_comet');
    expect(entryIds).toContain('catalyst_recipe_velvet_prison');
  });
});
