export interface PopulationSnapshot {
  breedVolumes: Map<string, number>;
  totalVolume: number;
}

export interface HomeostasisTracker {
  tick(snapshot: PopulationSnapshot): void;
  isAchieved(): boolean;
  progress(): number;  // 0-1
  getBiome(): BiomeRecord | null;
  reset(): void;
}

const WINDOW_TICKS = 60 * 20;    // 20 seconds at 60fps
const MIN_BIODIVERSITY = 3;
const MAX_SHARE_SWING = 0.10;    // 10%

export function createHomeostasisTracker(): HomeostasisTracker {
  let samples: Array<Map<string, number>> = [];
  let achieved = false;
  let biome: BiomeRecord | null = null;

  function clearWindow(): void {
    samples = [];
    biome = null;
  }

  return {
    tick(snapshot) {
      if (achieved) return;
      const currentShares = volumeShares(snapshot);
      if (currentShares.size < MIN_BIODIVERSITY) {
        clearWindow();
        return;
      }

      if (samples.length > 0 && !sameBreedSet(samples[0]!, currentShares)) {
        samples = [currentShares];
        biome = null;
        return;
      }

      samples.push(currentShares);
      while (samples.length > WINDOW_TICKS) samples.shift();
      if (!isStableWindow(samples)) {
        samples = [currentShares];
        biome = null;
        return;
      }

      if (samples.length >= WINDOW_TICKS) {
        achieved = true;
        biome = classifyBiome(snapshot.breedVolumes);
      }
    },
    isAchieved() { return achieved; },
    progress() {
      if (achieved) return 1;
      return Math.min(1, samples.length / WINDOW_TICKS);
    },
    getBiome() {
      return biome ? { ...biome, topBreeds: [...biome.topBreeds] } : null;
    },
    reset() {
      achieved = false;
      clearWindow();
    },
  };
}

function volumeShares(snapshot: PopulationSnapshot): Map<string, number> {
  const shares = new Map<string, number>();
  if (snapshot.totalVolume <= 0) return shares;
  for (const [breed, volume] of snapshot.breedVolumes) {
    if (volume <= 0) continue;
    shares.set(breed, volume / snapshot.totalVolume);
  }
  return shares;
}

function sameBreedSet(a: Map<string, number>, b: Map<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const breed of a.keys()) {
    if (!b.has(breed)) return false;
  }
  return true;
}

function isStableWindow(windowSamples: Array<Map<string, number>>): boolean {
  const first = windowSamples[0];
  if (!first) return false;
  for (const breed of first.keys()) {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const sample of windowSamples) {
      const share = sample.get(breed);
      if (share === undefined) return false;
      min = Math.min(min, share);
      max = Math.max(max, share);
    }
    if (max - min > MAX_SHARE_SWING) return false;
  }
  return true;
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

export function classifyBiome(breedVolumes: Map<string, number>): BiomeRecord {
  const sorted = [...breedVolumes.entries()]
    .filter(([, volume]) => volume > 0)
    .sort((a, b) => b[1] - a[1]);
  const topBreeds = sorted.slice(0, 3).map(([breed]) => breed);
  const dominant = topBreeds[0];
  const total = sorted.reduce((sum, [, volume]) => sum + volume, 0);
  const dominantShare = dominant && total > 0 ? (breedVolumes.get(dominant) ?? 0) / total : 0;

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
