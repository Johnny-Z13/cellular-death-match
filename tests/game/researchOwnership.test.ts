import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../../src/game/discoverySave';
import type { DiscoverySaveState } from '../../src/game/discoverySave';
import { reconcileResearchOwnership } from '../../src/game/researchOwnership';
import { loadStrainLibraryState } from '../../src/game/strainLibrary';

const emptyDiscovery: DiscoverySaveState = {
  persistenceEnabled: true,
  discoveredBreedIds: [],
  discoveredNoteIds: [],
  breedDiscoveryRecords: [],
  noteDiscoveryRecords: [],
  revealAll: false,
};

describe('research ownership reconciliation', () => {
  it('backfills strain ownership from a stabilized genome without making it fresh', () => {
    const discovery: DiscoverySaveState = {
      ...emptyDiscovery,
      discoveredBreedIds: ['bloom_mass' as const],
      breedDiscoveryRecords: [{
        id: 'bloom_mass' as const,
        discoveredAt: '2026-08-28T10:00:00.000Z',
        fresh: false,
        stage: 'stabilized' as const,
      }],
    };
    const result = reconcileResearchOwnership(discovery, loadStrainLibraryState(createMemoryStorage()));
    expect(result.changed).toBe(true);
    expect(result.strains.availableStrains).toContain('bloom_mass');
    expect(result.discovery.breedDiscoveryRecords[0]?.fresh).toBe(false);
  });

  it('repairs stabilized progression from canonical historical strain ownership', () => {
    const strains = {
      ...loadStrainLibraryState(createMemoryStorage()),
      availableStrains: ['swarmlet', 'needle_swarm', 'old-unknown'],
    };
    const result = reconcileResearchOwnership(emptyDiscovery, strains);
    expect(result.discovery.discoveredBreedIds).toEqual(['needle_swarm']);
    expect(result.discovery.breedDiscoveryRecords[0]).toMatchObject({
      id: 'needle_swarm', stage: 'stabilized', fresh: false,
    });
    expect(result.discovery.discoveredBreedIds).not.toContain('old-unknown');
  });

  it('does not turn debug reveal-all into permanent library ownership', () => {
    const result = reconcileResearchOwnership(
      { ...emptyDiscovery, revealAll: true },
      loadStrainLibraryState(createMemoryStorage()),
    );
    expect(result.changed).toBe(false);
    expect(result.strains.availableStrains).toEqual(['swarmlet']);
  });
});
