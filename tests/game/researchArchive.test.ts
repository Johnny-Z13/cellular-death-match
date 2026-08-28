import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../../src/game/discoverySave';
import {
  MAX_BIOME_ARCHIVE_RECORDS,
  RESEARCH_SEALS,
  emptyResearchArchive,
  loadResearchArchive,
  recordResearchEvidence,
  revealAllResearchArchive,
  saveResearchArchive,
} from '../../src/game/researchArchive';

describe('research archive', () => {
  it('starts empty and awards seals only from matching evidence', () => {
    const update = recordResearchEvidence(emptyResearchArchive(), {
      stabilizedBreedCount: 1,
      understoodRecipeCount: 1,
      reactions: 2,
      peakBiodiversity: 5,
    }, '2026-08-27T10:00:00.000Z');

    expect(update.newSealIds).toEqual(['first_specimen', 'repeatable_result']);
    expect(update.state.earnedSealIds).toEqual(['first_specimen', 'repeatable_result']);
    expect(update.newBiome).toBe(false);
  });

  it('records a biome once and preserves lifetime best records', () => {
    const first = recordResearchEvidence(emptyResearchArchive(), {
      reactions: 4,
      peakBiodiversity: 6,
      stabilitySeconds: 23,
      biomeName: 'Coral Basin',
    }, '2026-08-27T10:00:00.000Z');
    const repeated = recordResearchEvidence(first.state, {
      reactions: 1,
      peakBiodiversity: 2,
      stabilitySeconds: 4,
      biomeName: 'Coral Basin',
    }, '2026-08-27T11:00:00.000Z');

    expect(first.newBiome).toBe(true);
    expect(repeated.newBiome).toBe(false);
    expect(repeated.state.biomeRecords).toHaveLength(1);
    expect(repeated.state.records).toEqual({
      peakBiodiversity: 6,
      maxReactions: 4,
      longestStabilitySeconds: 23,
    });
    expect(repeated.state.earnedSealIds).toEqual([
      'chain_reaction', 'menagerie', 'living_clock', 'strange_attractor',
    ]);
  });

  it('persists a sanitized archive', () => {
    const storage = createMemoryStorage();
    const earned = recordResearchEvidence(emptyResearchArchive(), {
      caseComplete: true,
      stabilizedHybridCount: 1,
    }).state;

    saveResearchArchive(storage, earned);
    expect(loadResearchArchive(storage)).toEqual(earned);
  });

  it('reveal all creates a complete late-game preview', () => {
    const revealed = revealAllResearchArchive(emptyResearchArchive(), '2026-08-27T10:00:00.000Z');

    expect(revealed.earnedSealIds).toEqual(RESEARCH_SEALS.map((seal) => seal.id));
    expect(revealed.biomeRecords.map((record) => record.name)).toEqual(['Coral Basin']);
    expect(revealed.records).toEqual({
      peakBiodiversity: 6,
      maxReactions: 3,
      longestStabilitySeconds: 20,
    });
  });

  it('compacts only the oldest biome after the generous archive boundary', () => {
    const recordedAt = '2026-08-27T10:00:00.000Z';
    const full = {
      ...emptyResearchArchive(),
      biomeRecords: Array.from({ length: MAX_BIOME_ARCHIVE_RECORDS }, (_, index) => ({
        name: `Biome ${index}`,
        recordedAt,
      })),
    };

    const update = recordResearchEvidence(full, { biomeName: 'Newest Basin' }, recordedAt);

    expect(update.newBiome).toBe(true);
    expect(update.state.biomeRecords).toHaveLength(MAX_BIOME_ARCHIVE_RECORDS);
    expect(update.state.biomeRecords.some((record) => record.name === 'Biome 0')).toBe(false);
    expect(update.state.biomeRecords.at(-1)?.name).toBe('Newest Basin');
  });
});
