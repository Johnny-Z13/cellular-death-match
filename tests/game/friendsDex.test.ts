import { describe, expect, it } from 'vitest';
import { DEX, dexView, FRIENDS_SAVE_KEY, loadFriends, recordFriend } from '../../src/game/friendsDex';

function memoryStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } };
}

describe('friends dex', () => {
  it('numbers 32 friends from #000 to #031 with no gaps', () => {
    expect(DEX.map((entry) => entry.number)).toEqual(Array.from({ length: 32 }, (_, i) => i));
    expect(DEX.filter((entry) => entry.tier === 'common')).toHaveLength(14);
    expect(DEX.filter((entry) => entry.tier === 'rare')).toHaveLength(12);
    expect(DEX.filter((entry) => entry.tier === 'very-rare')).toHaveLength(5);
    expect(new Set(DEX.map((entry) => entry.id)).size).toBe(32);
  });

  it('keeps every line Dr. E says on a page within 90 characters', () => {
    for (const entry of DEX) expect(entry.note.length, entry.id).toBeLessThanOrEqual(90);
  });

  it('counts Dr. E and found strains, and friends found by merging', () => {
    const storage = memoryStorage();
    let save = loadFriends(storage);
    let view = dexView({ unlockedLifeforms: ['swarmlet'], discoveredBreedIds: ['bloom_mass'] }, save);
    expect(view.found).toBe(3);
    expect(view.byTier.rare).toEqual({ found: 0, total: 12 });

    save = recordFriend(storage, save, 'puddle_pals', 'Trial 2', 1000);
    expect(recordFriend(storage, save, 'puddle_pals', 'Open Lab', 2000)).toBe(save);
    view = dexView({ unlockedLifeforms: ['swarmlet'], discoveredBreedIds: ['bloom_mass'] }, loadFriends(storage));
    expect(view.found).toBe(4);
    expect(view.items.find((item) => item.id === 'puddle_pals')?.record).toEqual({ at: 1000, where: 'Trial 2' });
  });

  it('ignores a corrupt or unknown save rather than crashing', () => {
    expect(loadFriends(memoryStorage({ [FRIENDS_SAVE_KEY]: '{nope' })).found).toEqual({});
    expect(loadFriends(memoryStorage({ [FRIENDS_SAVE_KEY]: JSON.stringify({ v: 1, found: { ghost: { at: 1, where: 'x' } } }) })).found).toEqual({});
  });
});
