export interface PopulationSnapshot {
  breedCounts: Map<string, number>;
  totalLiving: number;
}

export interface HomeostasisTracker {
  tick(snapshot: PopulationSnapshot): void;
  isAchieved(): boolean;
  progress(): number;  // 0-1
  reset(): void;
}

const SUSTAIN_TICKS = 60 * 20;   // 20 seconds at 60fps
const MIN_BIODIVERSITY = 3;
const MAX_SHARE_SWING = 0.10;    // 10%

export function createHomeostasisTracker(): HomeostasisTracker {
  let stableTicks = 0;
  let achieved = false;
  let prevShares = new Map<string, number>();

  return {
    tick(snapshot) {
      if (achieved) return;
      const livingBreeds = [...snapshot.breedCounts.entries()]
        .filter(([, count]) => count > 0).length;
      if (livingBreeds < MIN_BIODIVERSITY || snapshot.totalLiving === 0) {
        stableTicks = 0;
        prevShares = new Map();
        return;
      }
      const currentShares = new Map<string, number>();
      for (const [breed, count] of snapshot.breedCounts) {
        if (count > 0) currentShares.set(breed, count / snapshot.totalLiving);
      }
      if (prevShares.size > 0) {
        for (const [breed, share] of currentShares) {
          const prev = prevShares.get(breed) ?? 0;
          if (Math.abs(share - prev) > MAX_SHARE_SWING) {
            stableTicks = 0;
            prevShares = currentShares;
            return;
          }
        }
        for (const [breed] of prevShares) {
          if (!currentShares.has(breed)) {
            stableTicks = 0;
            prevShares = currentShares;
            return;
          }
        }
      }
      prevShares = currentShares;
      stableTicks++;
      if (stableTicks >= SUSTAIN_TICKS) achieved = true;
    },
    isAchieved() { return achieved; },
    progress() {
      if (achieved) return 1;
      return Math.min(1, stableTicks / SUSTAIN_TICKS);
    },
    reset() {
      stableTicks = 0;
      achieved = false;
      prevShares = new Map();
    },
  };
}

// --- Biome Classification ---

export interface BiomeRecord {
  id: string;
  name: string;
  topBreeds: string[];
}

const BIOME_NAMES: Record<string, string> = {
  bloom_mass: 'Coral Basin',
  needle_swarm: 'Needle Garden',
  glass_antibody: 'Glass Reef',
  folded_anchor: 'Iron Crucible',
  static_lattice: 'Crystal Web',
  mire_lattice: 'Spore Drift',
  quill_bloom: 'Thorn Meadow',
  vitric_anchor: 'Obsidian Shelf',
  boss: 'Titan Basin',
  bruiser: 'Brawl Pit',
  swarmlet: 'Swarm Flats',
  splitter: 'Fission Pool',
  sniper: 'Marksman Ridge',
  mirror: 'Echo Chamber',
};

export function classifyBiome(breedCounts: Map<string, number>): BiomeRecord {
  const sorted = [...breedCounts.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  const topBreeds = sorted.slice(0, 3).map(([breed]) => breed);
  const dominant = topBreeds[0];
  const total = sorted.reduce((sum, [, count]) => sum + count, 0);
  const dominantShare = dominant ? (breedCounts.get(dominant) ?? 0) / total : 0;

  let name: string;
  if (dominant && dominantShare > 0.4) {
    name = BIOME_NAMES[dominant] ?? `${dominant} Dominion`;
  } else {
    const breed1 = topBreeds[0] ?? 'unknown';
    const breed2 = topBreeds[1] ?? 'unknown';
    const name1 = BIOME_NAMES[breed1]?.split(' ')[0] ?? breed1;
    const name2 = BIOME_NAMES[breed2]?.split(' ')[1] ?? breed2;
    name = `${name1} ${name2}`;
  }
  const id = [...topBreeds].sort().join('+');
  return { id, name, topBreeds };
}
