import { describe, expect, it } from 'vitest';
import {
  createDiscoveryProgression,
  updateDiscoveryProgression,
} from '../../src/game/discoveryProgression';
import {
  appendUniqueGenomeDecodes,
  genomeDecodeEventsForProgressionChange,
} from '../../src/game/genomeDiscovery';

describe('genome decode transitions', () => {
  it('does not award ownership when a derived phenotype is only observed', () => {
    const before = createDiscoveryProgression();
    const observed = updateDiscoveryProgression(
      before,
      { breedIds: ['bloom_mass'] },
      '2026-08-28T10:00:00.000Z',
      { breed: 'observed' },
    );

    expect(genomeDecodeEventsForProgressionChange(before, observed)).toEqual([]);
    expect(observed.unlockedLifeforms).not.toContain('bloom_mass');
  });

  it('decodes only the stabilized organism after the opening dish', () => {
    const observed = updateDiscoveryProgression(
      createDiscoveryProgression(),
      { breedIds: ['bloom_mass'] },
      '2026-08-28T10:00:00.000Z',
      { breed: 'observed' },
    );
    const stabilized = updateDiscoveryProgression(
      observed,
      { breedIds: ['bloom_mass'] },
      '2026-08-28T10:05:00.000Z',
      { breed: 'stabilized' },
    );

    expect(genomeDecodeEventsForProgressionChange(observed, stabilized)).toEqual([
      { id: 'bloom_mass', reason: 'stabilized' },
    ]);
  });

  it('decodes Bruiser and Splitter one at a time from matching protocols', () => {
    const bloomed = updateDiscoveryProgression(
      createDiscoveryProgression(),
      { breedIds: ['bloom_mass'] },
      '2026-08-28T10:00:00.000Z',
      { breed: 'stabilized' },
    );
    const pressured = updateDiscoveryProgression(
      bloomed,
      { noteIds: ['recipe_bitter_bloom'] },
      '2026-08-28T10:05:00.000Z',
      { note: 'understood' },
    );
    const carried = updateDiscoveryProgression(
      pressured,
      { noteIds: ['recipe_nutrient_conduit'] },
      '2026-08-28T10:10:00.000Z',
      { note: 'understood' },
    );

    expect(genomeDecodeEventsForProgressionChange(bloomed, pressured)).toEqual([
      { id: 'bruiser', reason: 'research-unlock' },
    ]);
    expect(genomeDecodeEventsForProgressionChange(pressured, carried)).toEqual([
      { id: 'splitter', reason: 'research-unlock' },
    ]);
  });

  it('emits a foundational decode exactly once when research makes it seedable', () => {
    const before = createDiscoveryProgression();
    const unlocked = updateDiscoveryProgression(
      before,
      { noteIds: ['recipe_acid_toxin_flare'] },
      '2026-08-28T11:00:00.000Z',
      { note: 'understood' },
    );

    expect(genomeDecodeEventsForProgressionChange(before, unlocked)).toEqual([
      { id: 'sniper', reason: 'research-unlock' },
    ]);
    expect(genomeDecodeEventsForProgressionChange(unlocked, unlocked)).toEqual([]);
    const repeated = updateDiscoveryProgression(
      unlocked,
      { noteIds: ['recipe_acid_toxin_flare'] },
      '2026-08-28T11:05:00.000Z',
      { note: 'understood' },
    );
    expect(genomeDecodeEventsForProgressionChange(unlocked, repeated)).toEqual([]);
  });

  it('hydrates historical stabilized genomes as decoded state without synthesizing live events', () => {
    const hydrated = createDiscoveryProgression({
      discoveredBreedIds: ['needle_swarm'],
      discoveredNoteIds: [],
      breedDiscoveryRecords: [{
        id: 'needle_swarm',
        discoveredAt: '2026-01-01T00:00:00.000Z',
        fresh: false,
        stage: 'stabilized',
      }],
      noteDiscoveryRecords: [],
      revealAll: false,
    });

    expect(hydrated.unlockedLifeforms).toContain('needle_swarm');
    expect(genomeDecodeEventsForProgressionChange(hydrated, hydrated)).toEqual([]);
  });

  it('collapses duplicate pending decodes while retaining arrival order', () => {
    expect(appendUniqueGenomeDecodes(
      ['splitter'],
      [
        { id: 'splitter', reason: 'research-unlock' },
        { id: 'bloom_mass', reason: 'stabilized' },
      ],
    )).toEqual(['splitter', 'bloom_mass']);
  });
});
