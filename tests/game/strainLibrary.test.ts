import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../../src/game/discoverySave';
import { createStrainLibrary } from '../../src/game/strainLibrary';

describe('strainLibrary — initial state', () => {
  it('starts with swarmlet as the only available strain', () => {
    const storage = createMemoryStorage();
    const lib = createStrainLibrary(storage);
    expect(lib.getAvailableStrains()).toEqual(['swarmlet']);
  });

  it('starts with swarmlet in the loadout', () => {
    const storage = createMemoryStorage();
    const lib = createStrainLibrary(storage);
    expect(lib.getLoadout()).toEqual(['swarmlet']);
  });

  it('starts with 2 loadout slots', () => {
    const storage = createMemoryStorage();
    const lib = createStrainLibrary(storage);
    expect(lib.getLoadoutSlots()).toBe(2);
  });

  it('starts with runCount 0', () => {
    const storage = createMemoryStorage();
    const lib = createStrainLibrary(storage);
    expect(lib.getRunCount()).toBe(0);
  });

  it('starts with biomeCount 0', () => {
    const storage = createMemoryStorage();
    const lib = createStrainLibrary(storage);
    expect(lib.getBiomeCount()).toBe(0);
  });
});

describe('bankStrain', () => {
  it('adds a new breed to available strains', () => {
    const storage = createMemoryStorage();
    const lib = createStrainLibrary(storage);
    lib.bankStrain('needle_swarm');
    expect(lib.getAvailableStrains()).toContain('needle_swarm');
  });

  it('does not duplicate a strain already present', () => {
    const storage = createMemoryStorage();
    const lib = createStrainLibrary(storage);
    lib.bankStrain('needle_swarm');
    lib.bankStrain('needle_swarm');
    const available = lib.getAvailableStrains();
    expect(available.filter((s) => s === 'needle_swarm').length).toBe(1);
  });

  it('does not duplicate the default swarmlet strain', () => {
    const storage = createMemoryStorage();
    const lib = createStrainLibrary(storage);
    lib.bankStrain('swarmlet');
    const available = lib.getAvailableStrains();
    expect(available.filter((s) => s === 'swarmlet').length).toBe(1);
  });
});

describe('setLoadout', () => {
  it('accepts a valid loadout within slot count', () => {
    const storage = createMemoryStorage();
    const lib = createStrainLibrary(storage);
    lib.bankStrain('needle_swarm');
    lib.setLoadout(['swarmlet', 'needle_swarm']);
    expect(lib.getLoadout()).toEqual(['swarmlet', 'needle_swarm']);
  });

  it('rejects unknown strains', () => {
    const storage = createMemoryStorage();
    const lib = createStrainLibrary(storage);
    expect(() => lib.setLoadout(['unknown_breed'])).toThrow();
  });

  it('rejects exceeding slot count', () => {
    const storage = createMemoryStorage();
    const lib = createStrainLibrary(storage);
    // Slots = 2 by default; bank 2 extras and try to set 3 strains
    lib.bankStrain('strain_a');
    lib.bankStrain('strain_b');
    expect(() => lib.setLoadout(['swarmlet', 'strain_a', 'strain_b'])).toThrow();
  });

  it('allows exactly as many strains as there are slots', () => {
    const storage = createMemoryStorage();
    const lib = createStrainLibrary(storage);
    lib.bankStrain('strain_a');
    lib.setLoadout(['swarmlet', 'strain_a']); // 2 strains, 2 slots
    expect(lib.getLoadout()).toEqual(['swarmlet', 'strain_a']);
  });

  it('allows fewer strains than slots', () => {
    const storage = createMemoryStorage();
    const lib = createStrainLibrary(storage);
    lib.setLoadout(['swarmlet']); // 1 strain, 2 slots
    expect(lib.getLoadout()).toEqual(['swarmlet']);
  });
});

describe('getPlayableLoadout', () => {
  it('returns the saved valid loadout', () => {
    const storage = createMemoryStorage();
    const lib = createStrainLibrary(storage);
    lib.bankStrain('needle_swarm');
    lib.setLoadout(['swarmlet', 'needle_swarm']);
    expect(lib.getPlayableLoadout()).toEqual(['swarmlet', 'needle_swarm']);
  });

  it('falls back to swarmlet when the saved loadout is empty', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      'cellular-death-match.strains.v1',
      JSON.stringify({
        availableStrains: ['swarmlet', 'needle_swarm'],
        loadout: [],
        loadoutSlots: 2,
        runCount: 0,
        biomeCount: 0,
      }),
    );
    const lib = createStrainLibrary(storage);
    expect(lib.getPlayableLoadout()).toEqual(['swarmlet']);
  });

  it('falls back to swarmlet when a saved loadout only contains unavailable strains', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      'cellular-death-match.strains.v1',
      JSON.stringify({
        availableStrains: ['swarmlet'],
        loadout: ['ghost_breed'],
        loadoutSlots: 2,
        runCount: 0,
        biomeCount: 0,
      }),
    );
    const lib = createStrainLibrary(storage);
    expect(lib.getPlayableLoadout()).toEqual(['swarmlet']);
  });
});

describe('addLoadoutSlot', () => {
  it('increments slot count', () => {
    const storage = createMemoryStorage();
    const lib = createStrainLibrary(storage);
    lib.addLoadoutSlot();
    expect(lib.getLoadoutSlots()).toBe(3);
  });

  it('caps at 6 slots', () => {
    const storage = createMemoryStorage();
    const lib = createStrainLibrary(storage);
    for (let i = 0; i < 10; i++) {
      lib.addLoadoutSlot();
    }
    expect(lib.getLoadoutSlots()).toBe(6);
  });
});

describe('incrementRunCount and incrementBiomeCount', () => {
  it('increments runCount', () => {
    const storage = createMemoryStorage();
    const lib = createStrainLibrary(storage);
    lib.incrementRunCount();
    lib.incrementRunCount();
    expect(lib.getRunCount()).toBe(2);
  });

  it('increments biomeCount', () => {
    const storage = createMemoryStorage();
    const lib = createStrainLibrary(storage);
    lib.incrementBiomeCount();
    expect(lib.getBiomeCount()).toBe(1);
  });
});

describe('persistence', () => {
  it('persists state across instances via storage', () => {
    const storage = createMemoryStorage();
    const lib1 = createStrainLibrary(storage);
    lib1.bankStrain('needle_swarm');
    lib1.addLoadoutSlot();
    lib1.setLoadout(['swarmlet', 'needle_swarm']);
    lib1.incrementRunCount();
    lib1.incrementBiomeCount();
    lib1.save();

    const lib2 = createStrainLibrary(storage);
    expect(lib2.getAvailableStrains()).toContain('needle_swarm');
    expect(lib2.getLoadoutSlots()).toBe(3);
    expect(lib2.getLoadout()).toEqual(['swarmlet', 'needle_swarm']);
    expect(lib2.getRunCount()).toBe(1);
    expect(lib2.getBiomeCount()).toBe(1);
  });

  it('does not persist state that has not been saved', () => {
    const storage = createMemoryStorage();
    const lib1 = createStrainLibrary(storage);
    lib1.bankStrain('needle_swarm');
    // No lib1.save() call

    const lib2 = createStrainLibrary(storage);
    expect(lib2.getAvailableStrains()).not.toContain('needle_swarm');
  });
});

describe('corrupt storage handling', () => {
  it('falls back to defaults on corrupt JSON', () => {
    const storage = createMemoryStorage();
    storage.setItem('cellular-death-match.strains.v1', '{bad json');
    const lib = createStrainLibrary(storage);
    expect(lib.getAvailableStrains()).toEqual(['swarmlet']);
    expect(lib.getLoadoutSlots()).toBe(2);
    expect(lib.getRunCount()).toBe(0);
  });

  it('falls back to defaults on non-object JSON', () => {
    const storage = createMemoryStorage();
    storage.setItem('cellular-death-match.strains.v1', '"just a string"');
    const lib = createStrainLibrary(storage);
    expect(lib.getAvailableStrains()).toEqual(['swarmlet']);
  });

  it('falls back to defaults on null JSON', () => {
    const storage = createMemoryStorage();
    storage.setItem('cellular-death-match.strains.v1', 'null');
    const lib = createStrainLibrary(storage);
    expect(lib.getAvailableStrains()).toEqual(['swarmlet']);
  });

  it('handles partial data gracefully — preserves valid fields, defaults invalid ones', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      'cellular-death-match.strains.v1',
      JSON.stringify({
        availableStrains: ['swarmlet', 'needle_swarm'],
        // loadout omitted — should default gracefully
        loadoutSlots: 99, // out of range — should default to 2
        runCount: 'not-a-number', // wrong type — should default to 0
        biomeCount: 5,
      }),
    );
    const lib = createStrainLibrary(storage);
    expect(lib.getAvailableStrains()).toContain('needle_swarm');
    expect(lib.getLoadoutSlots()).toBe(2); // clamped to default since 99 > 6
    expect(lib.getRunCount()).toBe(0);
    expect(lib.getBiomeCount()).toBe(5);
  });

  it('drops unavailable strains from saved loadout on load', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      'cellular-death-match.strains.v1',
      JSON.stringify({
        availableStrains: ['swarmlet'],
        loadout: ['swarmlet', 'ghost_breed'],
        loadoutSlots: 2,
        runCount: 0,
        biomeCount: 0,
      }),
    );
    const lib = createStrainLibrary(storage);
    expect(lib.getLoadout()).not.toContain('ghost_breed');
  });
});
