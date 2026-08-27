import { describe, expect, it } from 'vitest';
import {
  DISCOVERY_SAVE_KEY,
  clearDiscoverySave,
  createMemoryStorage,
  loadDiscoverySave,
  revealAllDiscoveries,
  saveDiscoveryState,
} from '../../src/game/discoverySave';

describe('discovery save', () => {
  it('defaults to persistent research with an empty archive', () => {
    expect(loadDiscoverySave(createMemoryStorage())).toEqual({
      persistenceEnabled: true,
      discoveredBreedIds: [],
      discoveredNoteIds: [],
      breedDiscoveryRecords: [],
      noteDiscoveryRecords: [],
      revealAll: false,
    });
  });

  it('persists discoveries even when an obsolete save claims persistence is disabled', () => {
    const storage = createMemoryStorage();
    saveDiscoveryState(storage, {
      persistenceEnabled: false,
      discoveredBreedIds: ['needle_swarm'],
      discoveredNoteIds: ['breed_needle_swarm'],
      revealAll: false,
    });

    const saved = loadDiscoverySave(storage);
    expect(saved.persistenceEnabled).toBe(true);
    expect(saved.discoveredBreedIds).toEqual(['needle_swarm']);
    expect(saved.discoveredNoteIds).toEqual(['breed_needle_swarm']);
  });

  it('clears saved discoveries while retaining the durable model', () => {
    const storage = createMemoryStorage();
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
    storage.setItem(DISCOVERY_SAVE_KEY, '{bad json');
    expect(loadDiscoverySave(storage).discoveredBreedIds).toEqual([]);
  });

  it('ignores the retired v1 key and starts from an empty durable archive', () => {
    const storage = createMemoryStorage();
    storage.setItem('cellular-death-match.discovery.v1', JSON.stringify({
      discoveredBreedIds: ['needle_swarm'],
      revealAll: true,
    }));
    expect(loadDiscoverySave(storage).persistenceEnabled).toBe(true);
    expect(loadDiscoverySave(storage).discoveredBreedIds).toEqual([]);
  });

  it('drops obsolete ids while preserving valid discoveries', () => {
    const storage = createMemoryStorage();
    storage.setItem(DISCOVERY_SAVE_KEY, JSON.stringify({
      persistenceEnabled: true,
      discoveredBreedIds: ['needle_swarm', 'missing_breed'],
      discoveredNoteIds: ['breed_needle_swarm', 'missing_note'],
      revealAll: false,
    }));

    const saved = loadDiscoverySave(storage);
    expect(saved.discoveredBreedIds).toEqual(['needle_swarm']);
    expect(saved.discoveredNoteIds).toEqual(['breed_needle_swarm']);
    expect(saved.breedDiscoveryRecords[0]).toMatchObject({ id: 'needle_swarm', stage: 'stabilized' });
    expect(saved.noteDiscoveryRecords[0]).toMatchObject({ id: 'breed_needle_swarm', stage: 'understood' });
  });
});
