import { describe, expect, it } from 'vitest';
import { DISCOVERY_NOTES } from '../../src/content/catalysis';
import { EGG_ARCHETYPES } from '../../src/content/enemies';
import {
  NOTEBOOK_ENTRIES,
  notebookViewForProgression,
  atlasViewForProgression,
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
      expect(entry.body.length).toBeGreaterThan(12);
      expect(entry.clue.length).toBeGreaterThan(12);
      expect(['stable', 'volatile', 'critical']).toContain(entry.caution);
      expect(
        entry.unlock.starter === true
          || Boolean(entry.unlock.lifeformId)
          || Boolean(entry.unlock.breedId)
          || Boolean(entry.unlock.noteId),
      ).toBe(true);
    }

    expect([...categories].sort()).toEqual(['catalyst', 'event', 'lab_note', 'lifeform']);
  });

  it('starts with starter lifeforms visible and hides undiscovered entries', () => {
    const view = notebookViewForProgression(
      createDiscoveryProgression(),
      '2026-06-07T10:00:00.000Z',
    );

    expect(view.discoveredCount).toBe(1);
    expect(view.totalCount).toBe(NOTEBOOK_ENTRIES.length);
    expect(view.entries.map((entry) => entry.title)).toEqual(['Swarmlet']);
    expect(view.entries.every((entry) => entry.discovered)).toBe(true);
    expect(view.entries.every((entry) => entry.displayTitle.startsWith('Unknown') === false)).toBe(true);
    expect(view.entries[0]?.discoveredAtLabel).toBe('Discovered on Jun 7, 2026');
  });

  it('reveals breed and catalyst entries from progression discoveries with notes and recipes', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass', 'recipe_nutrient_conduit', 'water_carries'],
    }, '2026-06-07T13:20:00.000Z');

    const view = notebookViewForProgression(progression, '2026-06-07T14:00:00.000Z');
    const catalyst = view.entries.find((entry) => entry.id === 'catalyst_recipe_nutrient_conduit');

    expect(view.entries.find((entry) => entry.id === 'lifeform_bloom_mass')?.discovered).toBe(true);
    expect(catalyst?.discovered).toBe(true);
    expect(catalyst?.isFresh).toBe(true);
    expect(catalyst?.discoveredAtLabel).toBe('Discovered on Jun 7, 2026');
    expect(catalyst?.displayNotes).toContain(DISCOVERY_NOTES.recipe_nutrient_conduit.body);
    expect(catalyst?.displayRecipe).toBe('Protocol: Nutrient + Water → Conduit');
    expect(view.entries.find((entry) => entry.id === 'lab_note_water_carries')?.discovered).toBe(true);
    expect(view.discoveredCount).toBe(6);
    expect(view.entries).toHaveLength(6);
  });

  it('marks freshly discovered entries as fresh for notebook highlighting', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass', 'recipe_nutrient_conduit'],
    });

    const view = notebookViewForProgression(progression);

    expect(view.entries.find((entry) => entry.id === 'lifeform_bloom_mass')?.isFresh).toBe(true);
    expect(view.entries.find((entry) => entry.id === 'catalyst_recipe_nutrient_conduit')?.isFresh).toBe(true);
    expect(view.entries.find((entry) => entry.id === 'lifeform_swarmlet')?.isFresh).toBe(false);
  });

  it('shows observed evidence without revealing the full protocol', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      noteIds: ['recipe_bitter_bloom'],
    }, '2026-06-07T13:20:00.000Z', { note: 'observed' });
    const entry = notebookViewForProgression(progression).entries.find(
      (candidate) => candidate.id === 'catalyst_recipe_bitter_bloom',
    );

    expect(entry?.researchStage).toBe('observed');
    expect(entry?.displayRecipe).toBe('Protocol: unresolved');
    expect(entry?.displayNotes).toContain('reaction signature');
  });

  it('reveals every entry in reveal-all mode and returns to starters after clear', () => {
    const revealed = notebookViewForProgression(revealAllDiscoveryProgression(createDiscoveryProgression()));
    expect(revealed.discoveredCount).toBe(revealed.totalCount);
    expect(revealed.entries.every((entry) => entry.discovered)).toBe(true);

    const cleared = notebookViewForProgression(clearDiscoveryProgression());
    expect(cleared.discoveredCount).toBe(1);
    expect(cleared.entries.map((entry) => entry.title)).toEqual(['Swarmlet']);
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

  it('keeps every base egg and derived breed in one canonical specimen catalogue', () => {
    const lifeformEntries = NOTEBOOK_ENTRIES.filter((entry) => entry.category === 'lifeform');
    const baseIds = lifeformEntries.flatMap((entry) => entry.unlock.lifeformId ?? []);

    expect(baseIds).toEqual(EGG_ARCHETYPES);
    expect(lifeformEntries).toHaveLength(14);
  });
});

describe('chimera reframe', () => {
  it('preserves chimera lore while surfacing canonical genome art for every lifeform', () => {
    const view = notebookViewForProgression(revealAllDiscoveryProgression(createDiscoveryProgression()));
    const breedEntries = view.entries.filter((e) => e.category === 'lifeform' && e.unlock.breedId);
    expect(breedEntries.length).toBeGreaterThan(0);
    for (const entry of breedEntries) {
      expect(entry.chimeraSplice).toMatch(/ × /); // "Real × Fantastical"
      expect(entry.chimeraPortrait).toContain('/art/chimera/');
      expect(entry.genomePortrait).toContain('/art/genomes/');
      expect(entry.genomeAlt.length).toBeGreaterThan(30);
      expect(entry.eggSynthesisAvailable).toBe(true);
      expect(entry.displayNotes.length).toBeGreaterThan(20);
    }
    // Starter (non-breed) lifeforms carry no chimera data.
    const starter = view.entries.find((e) => e.id === 'lifeform_swarmlet');
    expect(starter?.chimeraSplice).toBeNull();
    expect(starter?.chimeraPortrait).toBeNull();
    expect(starter?.genomePortrait).toBe('/art/genomes/swarmlet.png');
    expect(starter?.eggSynthesisAvailable).toBe(true);
    expect(starter?.isReferenceGenome).toBe(true);
    expect(view.entries.find((entry) => entry.id === 'lifeform_quill_bloom')?.genomeLineage)
      .toBe('Needle Swarm × Bloom Mass');
  });

  it('keeps an observed genome unresolved until the organism is stabilized alive', () => {
    const observed = updateDiscoveryProgression(
      createDiscoveryProgression(),
      { breedIds: ['bloom_mass'] },
      '2026-08-28T10:00:00.000Z',
      { breed: 'observed' },
    );
    const observedEntry = notebookViewForProgression(observed).entries.find(
      (entry) => entry.id === 'lifeform_bloom_mass',
    );
    expect(observedEntry?.researchStage).toBe('observed');
    expect(observedEntry?.genomePortrait).toBe('/art/genomes/bloom_mass.png');
    expect(observedEntry?.eggSynthesisAvailable).toBe(false);
    expect(observedEntry?.displayRecipe).toBe('Protocol: unresolved');
  });
});

describe('notebook atlas (progression map)', () => {
  it('shows every entry as a locked-or-discovered node, grouped by category', () => {
    const atlas = atlasViewForProgression(createDiscoveryProgression());

    expect(atlas.totalCount).toBe(NOTEBOOK_ENTRIES.length);
    // The onboarding specimen is discovered; the rest are locked but visible.
    expect(atlas.discoveredCount).toBe(1);
    expect(atlas.groups.find((group) => group.key === 'lifeform')?.label).toBe('Genome Archive');
    expect(atlas.groups.find((group) => group.key === 'lifeform')?.decoded).toBe(1);
    const allNodes = atlas.groups.flatMap((g) => g.nodes);
    expect(allNodes).toHaveLength(NOTEBOOK_ENTRIES.length);
    expect(allNodes.some((n) => n.state === 'locked')).toBe(true);
    // Locked nodes hide their title but keep a hint to drive discovery.
    const locked = allNodes.filter((n) => n.state === 'locked');
    expect(locked.every((n) => n.title === 'Undiscovered' && n.hint.length > 0)).toBe(true);
    // Group tallies are internally consistent.
    for (const group of atlas.groups) {
      expect(group.nodes.length).toBe(group.total);
      expect(group.nodes.filter((n) => n.state !== 'locked').length).toBe(group.discovered);
    }
  });

  it('reveals all atlas nodes in reveal-all mode with identity colours on lifeforms', () => {
    const atlas = atlasViewForProgression(revealAllDiscoveryProgression(createDiscoveryProgression()));
    expect(atlas.discoveredCount).toBe(atlas.totalCount);
    const lifeforms = atlas.groups.find((g) => g.key === 'lifeform');
    expect(lifeforms?.nodes.every((n) => n.state === 'stabilized')).toBe(true);
    expect(lifeforms?.nodes.every((n) => Array.isArray(n.color))).toBe(true);
    expect(lifeforms?.nodes.every((n) => n.decoded && n.genomePortrait?.startsWith('/art/genomes/'))).toBe(true);
    expect(lifeforms?.decoded).toBe(14);
  });
});
