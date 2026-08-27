import { describe, expect, it } from 'vitest';
import {
  ALL_PROGRESSION_LIFEFORMS,
  ALL_PROGRESSION_TOOLS,
  acknowledgeNotebookDiscoveries,
  clearDiscoveryProgression,
  createDiscoveryProgression,
  discoveryAnnouncementsForProgressionChange,
  revealAllDiscoveryProgression,
  updateDiscoveryProgression,
} from '../../src/game/discoveryProgression';

describe('discovery progression', () => {
  it('starts with only the onboarding kit', () => {
    const progression = createDiscoveryProgression();

    expect(progression.unlockedLifeforms).toEqual(['swarmlet']);
    expect(progression.unlockedTools).toEqual(['egg', 'nutrient']);
    expect(progression.discoveredBreedIds).toEqual([]);
    expect(progression.discoveredNoteIds).toEqual([]);
  });

  it('records fresh evidence and clears the flags after notebook acknowledgement', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass', 'recipe_pressure_bloom'],
    }, '2026-06-07T13:20:00.000Z');

    expect(progression.breedDiscoveryRecords[0]).toEqual({
      id: 'bloom_mass',
      discoveredAt: '2026-06-07T13:20:00.000Z',
      fresh: true,
      stage: 'stabilized',
    });
    expect(progression.noteDiscoveryRecords.find((record) => record.id === 'recipe_pressure_bloom')?.stage)
      .toBe('understood');

    const acknowledged = acknowledgeNotebookDiscoveries(progression);
    expect(acknowledged.breedDiscoveryRecords.every((record) => !record.fresh)).toBe(true);
    expect(acknowledged.noteDiscoveryRecords.every((record) => !record.fresh)).toBe(true);
  });

  it('unlocks the first complete laboratory bundle when Bloom Mass is stabilized', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass'],
    });

    expect(progression.unlockedLifeforms).toEqual(['swarmlet', 'bruiser', 'splitter', 'bloom_mass']);
    expect(progression.unlockedTools).toEqual([
      'egg', 'nutrient', 'toxin', 'water', 'paste', 'agitate',
    ]);
  });

  it('reveals canonical specimen and capability catalogues, then clears to onboarding', () => {
    const revealed = revealAllDiscoveryProgression(createDiscoveryProgression());

    expect(revealed.revealAll).toBe(true);
    expect(revealed.unlockedTools).toEqual(ALL_PROGRESSION_TOOLS);
    expect(revealed.unlockedLifeforms).toEqual(ALL_PROGRESSION_LIFEFORMS);

    const cleared = clearDiscoveryProgression(revealed);
    expect(cleared.revealAll).toBe(false);
    expect(cleared.unlockedTools).toEqual(['egg', 'nutrient']);
    expect(cleared.unlockedLifeforms).toEqual(['swarmlet']);
  });

  it.each([
    'recipe_mist_salt_discharge',
    'recipe_foam_lightning',
  ] as const)('unlocks Mirror eggs from %s evidence', (noteId) => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), { noteIds: [noteId] });
    expect(progression.unlockedLifeforms).toContain('mirror');
  });

  it.each([
    'recipe_folding_fault',
    'recipe_foam_salt_rule30',
    'recipe_crystal_toxin_prism',
    'recipe_brine_flash',
  ] as const)('unlocks Boss eggs from %s evidence', (noteId) => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), { noteIds: [noteId] });
    expect(progression.unlockedLifeforms).toContain('boss');
  });

  it.each([
    'recipe_nutrient_conduit',
    'recipe_agitated_chain',
    'recipe_bitter_bloom',
    'recipe_pressure_bloom',
    'recipe_incubator_shock',
    'recipe_toxin_water_mist',
    'water_carries',
  ] as const)('unlocks Salt from understood %s evidence', (noteId) => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), { noteIds: [noteId] });
    expect(progression.unlockedTools).toContain('salt');
  });

  it('announces an observed recipe before it is understood', () => {
    const previous = createDiscoveryProgression();
    const next = updateDiscoveryProgression(previous, {
      noteIds: ['recipe_pressure_bloom'],
    }, '2026-06-07T13:20:00.000Z', { note: 'observed' });

    expect(discoveryAnnouncementsForProgressionChange(previous, next)).toEqual([{
      message: 'Reaction observed: Pressure Bloom. Reproduce it to understand the protocol.',
      tone: 'critical',
    }]);
  });

  it('does not unlock observed evidence until a repeated result promotes it', () => {
    const observed = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['recipe_bitter_bloom'],
    }, '2026-06-07T13:20:00.000Z', { breed: 'observed', note: 'observed' });

    expect(observed.unlockedLifeforms).not.toContain('bloom_mass');
    expect(observed.unlockedTools).toEqual(['egg', 'nutrient']);

    const understood = updateDiscoveryProgression(observed, {
      noteIds: ['recipe_bitter_bloom'],
    }, '2026-06-07T13:21:00.000Z', { note: 'understood' });
    const stabilized = updateDiscoveryProgression(understood, {
      breedIds: ['bloom_mass'],
    }, '2026-06-07T13:22:00.000Z', { breed: 'stabilized' });

    expect(understood.noteDiscoveryRecords.find((record) => record.id === 'recipe_bitter_bloom')?.stage)
      .toBe('understood');
    expect(stabilized.unlockedLifeforms).toContain('bloom_mass');
  });
});
