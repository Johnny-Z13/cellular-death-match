// The friends dex: one numbered collection of everything alive. #000 is Dr. E.
// #001-#014 are the strains, found as they always have been (eggs, reactions,
// cross-breeding). Then the merged forms (rare) and the exotic behaviours of
// locked forms (very rare). Strains read the existing discovery progression;
// friends found by merging are saved under their own key.
import { BREED_DEFS, type BreedId } from '../content/catalysis';
import { FORMS } from '../content/forms';
import { LIFEFORM_IDENTITIES } from '../content/lifeformIdentity';
import { ALL_PROGRESSION_LIFEFORMS, type DiscoveryProgressionState } from './discoveryProgression';
import type { DiscoveryStorage } from './discoverySave';

export type DexTier = 'origin' | 'common' | 'rare' | 'very-rare';

export interface DexEntry {
  number: number;
  id: string;
  name: string;
  tier: DexTier;
  /** Strain keys of the cultures it is made of: one for a strain, none for
   *  Dr. E and the behaviours. */
  strains: readonly string[];
  touching: ReadonlyArray<readonly [number, number]>;
  /** Dr. E's line on its page. */
  note: string;
  /** What he says when he hints at it. */
  hint: string;
}

// Dr. E's line on each strain's page; 90 characters at most.
const STRAIN_NOTES: Record<string, string> = {
  swarmlet: 'Swarmlet. Small, quick, everywhere. My oldest friend.',
  bruiser: 'Bruiser. Big, slow and always hungry. Means well.',
  splitter: 'Splitter. Pop one and you get two Swarmlets. Generous!',
  sniper: 'Sniper. Fires from range. Do not stand in front of it.',
  mirror: 'Mirror. Copies the Control sample. Flattering, really.',
  boss: 'Boss. A huge anchor. The whole dish leans its way.',
  needle_swarm: 'Needle Swarm. Fast, sharp and fragile. Handle with care.',
  folded_anchor: 'Folded Anchor. Gelatinous and tough. Shrugs off toxin.',
  glass_antibody: 'Glass Antibody. Laughs at toxin, shatters at a touch.',
  bloom_mass: 'Bloom Mass! A fed Swarmlet that just kept growing.',
  static_lattice: 'Static Lattice. Holds its shape like a crystal.',
  quill_bloom: 'Quill Bloom. Needle Swarm crossed with Bloom Mass. Prickly.',
  vitric_anchor: 'Vitric Anchor. Glass meets anchor. Very stubborn.',
  mire_lattice: 'Mire Lattice. A lattice in the mud. Slow, but sure.',
};

// Very rares are behaviours, so their art is a fixed arrangement chosen to
// suggest each one: a line that travels, a row that pulses, two pairs bonded,
// four strains in a ring, one old giant.
const VERY_RARE: readonly Omit<DexEntry, 'tier'>[] = [
  {
    id: 'glider', number: 27, name: 'Glider', strains: ['swarmlet', 'splitter', 'swarmlet'], touching: [[0, 1], [1, 2]],
    note: 'A Glider! It keeps going and going. Where to?', hint: 'A merged friend that travels a long way without stopping.',
  },
  {
    id: 'blinker', number: 28, name: 'Blinker', strains: ['mirror', 'mirror', 'mirror'], touching: [[0, 1], [1, 2]],
    note: 'A Blinker: in, out, in, out. It has a heartbeat now.', hint: 'A merged friend that pulses, steady as a clock.',
  },
  {
    id: 'compound', number: 29, name: 'Compound', strains: ['swarmlet', 'swarmlet', 'bruiser', 'bruiser'], touching: [[0, 1], [1, 2], [2, 3], [0, 3]],
    note: 'Two merges, merged. I need to sit down.', hint: 'Two merged friends, fed together, touching.',
  },
  {
    id: 'rainbow', number: 30, name: 'Rainbow', strains: ['swarmlet', 'bruiser', 'splitter', 'mirror'], touching: [[0, 1], [1, 2], [2, 3], [0, 3]],
    note: 'Four strains, one organism. A Rainbow!', hint: 'One merge made of four different strains.',
  },
  {
    id: 'old_timer', number: 31, name: 'Old Timer', strains: ['boss'], touching: [],
    note: 'Old Timer. Three minutes together and still holding hands.', hint: 'Keep one merged friend together for a very long time.',
  },
];

export const DEX: readonly DexEntry[] = [
  {
    number: 0, id: 'dr_e', name: 'Dr. E', tier: 'origin', strains: [], touching: [],
    note: 'That is me! A merge of several old friends. Hello.', hint: '',
  },
  ...ALL_PROGRESSION_LIFEFORMS.map((id, i): DexEntry => {
    const identity = LIFEFORM_IDENTITIES[id];
    return {
      number: i + 1, id, name: identity.name, tier: 'common', strains: [id], touching: [],
      note: STRAIN_NOTES[id] ?? `${identity.name}. ${identity.role}.`, hint: identity.origin,
    };
  }),
  ...FORMS.map((form): DexEntry => ({
    number: form.number, id: form.id, name: form.name, tier: 'rare', strains: form.strains, touching: form.touching,
    note: form.note, hint: form.hint,
  })),
  ...VERY_RARE.map((entry): DexEntry => ({ ...entry, tier: 'very-rare' })),
];

export const FRIENDS_SAVE_KEY = 'cdm.friends.v1';

export interface FriendRecord {
  /** Epoch milliseconds of the first find. */
  at: number;
  /** Where it was first found, e.g. "Trial 2" or "Open Lab". */
  where: string;
}

export interface FriendsSave {
  found: Record<string, FriendRecord>;
}

export function loadFriends(storage: Pick<DiscoveryStorage, 'getItem'>): FriendsSave {
  try {
    const parsed = JSON.parse(storage.getItem(FRIENDS_SAVE_KEY) ?? 'null') as { v?: number; found?: Record<string, FriendRecord> } | null;
    if (parsed?.v !== 1 || typeof parsed.found !== 'object' || !parsed.found) return { found: {} };
    const known = new Set(DEX.map((entry) => entry.id));
    const found: Record<string, FriendRecord> = {};
    for (const [id, record] of Object.entries(parsed.found)) {
      if (known.has(id) && Number.isFinite(record?.at) && typeof record?.where === 'string') found[id] = { at: record.at, where: record.where };
    }
    return { found };
  } catch {
    return { found: {} };
  }
}

/** Record a first find. Returns the same save when it was already found. */
export function recordFriend(storage: Pick<DiscoveryStorage, 'setItem'>, save: FriendsSave, id: string, where: string, at = Date.now()): FriendsSave {
  if (save.found[id]) return save;
  const next = { found: { ...save.found, [id]: { at, where } } };
  try {
    storage.setItem(FRIENDS_SAVE_KEY, JSON.stringify({ v: 1, found: next.found }));
  } catch { /* the in-memory save still counts this session */ }
  return next;
}

export interface DexItem extends DexEntry {
  found: boolean;
  record: FriendRecord | null;
}

export interface DexView {
  items: DexItem[];
  found: number;
  total: number;
  byTier: Record<DexTier, { found: number; total: number }>;
}

/** `revealAll` (Options → Reveal all) shows every friend as found. */
export function dexView(progression: Pick<DiscoveryProgressionState, 'unlockedLifeforms' | 'discoveredBreedIds'> & { revealAll?: boolean }, save: FriendsSave): DexView {
  const strains = new Set<string>([...progression.unlockedLifeforms, ...progression.discoveredBreedIds]);
  const items = DEX.map((entry): DexItem => {
    const found = progression.revealAll === true
      || entry.tier === 'origin'
      || (entry.tier === 'common' ? strains.has(entry.id) : !!save.found[entry.id]);
    return { ...entry, found, record: save.found[entry.id] ?? null };
  });
  const byTier = { origin: { found: 0, total: 0 }, common: { found: 0, total: 0 }, rare: { found: 0, total: 0 }, 'very-rare': { found: 0, total: 0 } };
  for (const item of items) {
    byTier[item.tier].total += 1;
    if (item.found) byTier[item.tier].found += 1;
  }
  return { items, found: items.filter((item) => item.found).length, total: items.length, byTier };
}

// Dr. E's leads: in the Open Lab he points at one friend the player can find
// next, so the sandbox always has something to try. Merges (their strains
// must all be in the Egg tray) alternate with hybrids the tray can cross
// (both parents in it), so the leads mix merging with breeding; other
// strains still to find come after, and the very rares once a merge has been
// made. `turn` (the Open Lab trial) walks the
// first few candidates, so a lead the player could not land gives way to
// another next trial instead of nagging.
export const LEAD_TUNING = {
  /** How many of the next candidates the turn rotates through. */
  window: 3,
  /** Said with merge leads until the player has made a merge. */
  mergeTip: 'Plant them touching, then feed them at once.',
};

export interface Lead {
  id: string;
  name: string;
  tier: DexTier;
  hint: string;
  /** How to do it, while the player is new to it. */
  tip: string | null;
}

export function nextLead(view: DexView, tray: readonly string[], turn = 0): Lead | null {
  const has = new Set(tray);
  const open = view.items.filter((item) => !item.found && item.hint);
  const mergedBefore = view.byTier.rare.found > 0;
  const merges = open.filter((item) => item.tier === 'rare' && item.strains.length > 0 && item.strains.every((strain) => has.has(strain)));
  const crossable = (item: DexItem) => BREED_DEFS[item.id as BreedId]?.parents?.every((parent) => has.has(parent)) ?? false;
  const hybrids = open.filter((item) => item.tier === 'common' && crossable(item));
  const candidates: DexItem[] = [];
  for (let i = 0; i < Math.max(merges.length, hybrids.length); i++) {
    if (merges[i]) candidates.push(merges[i]!);
    if (hybrids[i]) candidates.push(hybrids[i]!);
  }
  candidates.push(...open.filter((item) => item.tier === 'common' && !crossable(item)));
  if (mergedBefore) candidates.push(...open.filter((item) => item.tier === 'very-rare'));
  if (candidates.length === 0) return null;
  const item = candidates[turn % Math.min(LEAD_TUNING.window, candidates.length)]!;
  return {
    id: item.id,
    name: item.name,
    tier: item.tier,
    hint: item.hint,
    tip: item.tier === 'rare' && !mergedBefore ? LEAD_TUNING.mergeTip : null,
  };
}
