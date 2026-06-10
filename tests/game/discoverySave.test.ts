import { describe, expect, it } from 'vitest';
import {
  clearDiscoverySave,
  createMemoryStorage,
  loadDiscoverySave,
  revealAllDiscoveries,
  saveDiscoveryState,
  setDiscoveryPersistence,
} from '../../src/game/discoverySave';

describe('discovery save', () => {
  it('defaults to disabled persistence and empty discoveries', () => {
    const storage = createMemoryStorage();

    expect(loadDiscoverySave(storage)).toEqual({
      persistenceEnabled: false,
      discoveredBreedIds: [],
      discoveredNoteIds: [],
      breedDiscoveryRecords: [],
      noteDiscoveryRecords: [],
      revealAll: false,
    });
  });

  it('persists discoveries only when persistence is enabled', () => {
    const storage = createMemoryStorage();

    saveDiscoveryState(storage, {
      persistenceEnabled: false,
      discoveredBreedIds: ['needle_swarm'],
      discoveredNoteIds: ['breed_needle_swarm'],
      revealAll: false,
    });
    expect(loadDiscoverySave(storage).discoveredBreedIds).toEqual([]);

    setDiscoveryPersistence(storage, true);
    saveDiscoveryState(storage, {
      persistenceEnabled: true,
      discoveredBreedIds: ['needle_swarm'],
      discoveredNoteIds: ['breed_needle_swarm'],
      revealAll: false,
    });

    expect(loadDiscoverySave(storage).discoveredBreedIds).toEqual(['needle_swarm']);
  });

  it('clears saved discoveries but keeps persistence preference', () => {
    const storage = createMemoryStorage();

    setDiscoveryPersistence(storage, true);
    revealAllDiscoveries(storage);
    clearDiscoverySave(storage);

    expect(loadDiscoverySave(storage)).toEqual({
      persistenceEnabled: true,
      discoveredBreedIds: [],
      discoveredNoteIds: [],
      breedDiscoveryRecords: [],
      noteDiscoveryRecords: [],
      revealAll: false,
    });
  });

  it('falls back safely on corrupt JSON', () => {
    const storage = createMemoryStorage();

    storage.setItem('cellular-death-match.discovery.v1', '{bad json');

    expect(loadDiscoverySave(storage).discoveredBreedIds).toEqual([]);
  });

  it('drops obsolete discovery ids while preserving valid ones', () => {
    const storage = createMemoryStorage();

    storage.setItem('cellular-death-match.discovery.v1', JSON.stringify({
      persistenceEnabled: true,
      discoveredBreedIds: ['needle_swarm', 'missing_breed'],
      discoveredNoteIds: ['breed_needle_swarm', 'missing_note'],
      revealAll: false,
    }));

    expect(loadDiscoverySave(storage)).toEqual({
      persistenceEnabled: true,
      discoveredBreedIds: ['needle_swarm'],
      discoveredNoteIds: ['breed_needle_swarm'],
      breedDiscoveryRecords: [{
        id: 'needle_swarm',
        discoveredAt: expect.any(String),
        fresh: false,
      }],
      noteDiscoveryRecords: [{
        id: 'breed_needle_swarm',
        discoveredAt: expect.any(String),
        fresh: false,
      }],
      revealAll: false,
    });
  });
});
