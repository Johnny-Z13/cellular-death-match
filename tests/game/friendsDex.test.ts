import { describe, expect, it } from 'vitest';
import { DEX, dexView, FRIENDS_SAVE_KEY, LEAD_TUNING, loadFriends, nextLead, recordFriend } from '../../src/game/friendsDex';

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

  it('shows every friend as found under Reveal all', () => {
    const view = dexView({ unlockedLifeforms: [], discoveredBreedIds: [], revealAll: true }, { found: {} });
    expect(view.found).toBe(32);
    expect(view.byTier['very-rare']).toEqual({ found: 5, total: 5 });
  });

  it('ignores a corrupt or unknown save rather than crashing', () => {
    expect(loadFriends(memoryStorage({ [FRIENDS_SAVE_KEY]: '{nope' })).found).toEqual({});
    expect(loadFriends(memoryStorage({ [FRIENDS_SAVE_KEY]: JSON.stringify({ v: 1, found: { ghost: { at: 1, where: 'x' } } }) })).found).toEqual({});
  });
});

describe("Dr. E's leads", () => {
  const progression = { unlockedLifeforms: ['swarmlet', 'bruiser', 'splitter', 'bloom_mass'], discoveredBreedIds: ['bloom_mass'] } as const;
  const tray = ['swarmlet', 'bruiser', 'splitter', 'bloom_mass'];

  it('points at a merge the tray can make first, with the pen tip until a merge is made', () => {
    const view = dexView({ unlockedLifeforms: [...progression.unlockedLifeforms], discoveredBreedIds: [...progression.discoveredBreedIds] }, { found: {} });
    const lead = nextLead(view, tray)!;
    expect(lead.tier).toBe('rare');
    expect(lead.id).toBe('bloom_buddy');
    expect(lead.tip).toBe(LEAD_TUNING.mergeTip);
    // Merge leads use strains in the tray.
    for (let turn = 0; turn < 3; turn++) {
      const lead = nextLead(view, tray, turn)!;
      expect(lead.tier).toBe('rare');
      expect(DEX.find((e) => e.id === lead.id)!.strains.every((strain) => tray.includes(strain)), lead.id).toBe(true);
    }
    // A hybrid the tray can cross (both parents in it) joins the merges.
    const crossTray = [...tray, 'needle_swarm'];
    const crossView = dexView({ unlockedLifeforms: [...progression.unlockedLifeforms, 'needle_swarm'], discoveredBreedIds: ['bloom_mass', 'needle_swarm'] }, { found: {} });
    expect([0, 1, 2].map((turn) => nextLead(crossView, crossTray, turn)!.id)).toContain('quill_bloom');
    // After the first merge, no tip.
    const merged = dexView({ unlockedLifeforms: [...progression.unlockedLifeforms], discoveredBreedIds: [...progression.discoveredBreedIds] },
      { found: { bloom_buddy: { at: 1, where: 'Open Lab' } } });
    expect(nextLead(merged, tray)!.tip).toBeNull();
    expect(nextLead(merged, tray)!.id).not.toBe('bloom_buddy');
  });

  it('rotates through the next few leads by trial, and runs out when all is found', () => {
    const view = dexView({ unlockedLifeforms: [...progression.unlockedLifeforms], discoveredBreedIds: [...progression.discoveredBreedIds] }, { found: {} });
    const ids = [0, 1, 2, 3].map((turn) => nextLead(view, tray, turn)!.id);
    expect(new Set(ids.slice(0, LEAD_TUNING.window)).size).toBe(LEAD_TUNING.window);
    expect(ids[LEAD_TUNING.window]).toBe(ids[0]);
    const all = dexView({ unlockedLifeforms: [], discoveredBreedIds: [], revealAll: true }, { found: {} });
    expect(nextLead(all, tray)).toBeNull();
  });
});
