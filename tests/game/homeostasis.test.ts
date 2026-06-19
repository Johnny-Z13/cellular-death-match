import { describe, it, expect } from 'vitest';
import {
  createHomeostasisTracker,
  classifyBiome,
  type PopulationSnapshot,
} from '../../src/game/homeostasis';

// Helper: build a stable snapshot with exactly `n` breeds, evenly distributed.
function stableSnapshot(breeds: string[], total: number): PopulationSnapshot {
  const perBreed = Math.floor(total / breeds.length);
  const breedVolumes = new Map<string, number>();
  for (const b of breeds) breedVolumes.set(b, perBreed);
  return { breedVolumes, totalVolume: total };
}

const SUSTAIN_TICKS = 60 * 20; // 1200

describe('HomeostasisTracker', () => {
  it('does not trigger before 20 seconds of stable snapshots', () => {
    const tracker = createHomeostasisTracker();
    const snapshot = stableSnapshot(['a', 'b', 'c'], 300);
    for (let i = 0; i < SUSTAIN_TICKS - 1; i++) {
      tracker.tick(snapshot);
    }
    expect(tracker.isAchieved()).toBe(false);
    expect(tracker.progress()).toBeGreaterThan(0);
    expect(tracker.progress()).toBeLessThan(1);
  });

  it('triggers after 20 seconds of stable three-breed volume shares', () => {
    const tracker = createHomeostasisTracker();
    const snapshot = stableSnapshot(['a', 'b', 'c'], 300);
    for (let i = 0; i < SUSTAIN_TICKS; i++) {
      tracker.tick(snapshot);
    }
    expect(tracker.isAchieved()).toBe(true);
    expect(tracker.progress()).toBe(1);
    expect(tracker.getBiome()?.topBreeds).toEqual(['a', 'b', 'c']);
  });

  it('resets if biodiversity drops below 3', () => {
    const tracker = createHomeostasisTracker();
    const good = stableSnapshot(['a', 'b', 'c'], 300);
    // Build up half-way
    for (let i = 0; i < SUSTAIN_TICKS / 2; i++) {
      tracker.tick(good);
    }
    expect(tracker.progress()).toBeCloseTo(0.5, 1);

    // Drop to 2 breeds
    const lowDiversity: PopulationSnapshot = {
      breedVolumes: new Map([['a', 150], ['b', 150]]),
      totalVolume: 300,
    };
    tracker.tick(lowDiversity);
    expect(tracker.progress()).toBe(0);
    expect(tracker.isAchieved()).toBe(false);
  });

  it('does not achieve if a breed volume share swings more than 10% over the window', () => {
    const tracker = createHomeostasisTracker();
    // Start: a=33%, b=33%, c=34% of 300
    const snapshot1 = stableSnapshot(['a', 'b', 'c'], 300);
    for (let i = 0; i < SUSTAIN_TICKS - 1; i++) tracker.tick(snapshot1);

    // Big swing: a goes to 50% — swing > 10%
    const snapshot2: PopulationSnapshot = {
      breedVolumes: new Map([['a', 150], ['b', 75], ['c', 75]]),
      totalVolume: 300,
    };
    tracker.tick(snapshot2);
    expect(tracker.isAchieved()).toBe(false);
    expect(tracker.progress()).toBeLessThan(1);
  });

  it('resets if a breed disappears from the stable window', () => {
    const tracker = createHomeostasisTracker();
    const snapshot = stableSnapshot(['a', 'b', 'c'], 300);
    for (let i = 0; i < SUSTAIN_TICKS / 2; i++) tracker.tick(snapshot);

    tracker.tick({
      breedVolumes: new Map([['a', 150], ['b', 150], ['c', 0]]),
      totalVolume: 300,
    });

    expect(tracker.isAchieved()).toBe(false);
    expect(tracker.progress()).toBe(0);
  });

  it('progress() returns a 0-1 fraction proportional to stable ticks', () => {
    const tracker = createHomeostasisTracker();
    const snapshot = stableSnapshot(['a', 'b', 'c'], 300);
    const halfway = SUSTAIN_TICKS / 2;
    for (let i = 0; i < halfway; i++) tracker.tick(snapshot);
    const p = tracker.progress();
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
    expect(p).toBeCloseTo(0.5, 1);
  });

  it('reset() clears all state', () => {
    const tracker = createHomeostasisTracker();
    const snapshot = stableSnapshot(['a', 'b', 'c'], 300);
    for (let i = 0; i < SUSTAIN_TICKS; i++) tracker.tick(snapshot);
    expect(tracker.isAchieved()).toBe(true);

    tracker.reset();
    expect(tracker.isAchieved()).toBe(false);
    expect(tracker.progress()).toBe(0);
  });

  it('once achieved, further ticks do not change state', () => {
    const tracker = createHomeostasisTracker();
    const snapshot = stableSnapshot(['a', 'b', 'c'], 300);
    for (let i = 0; i < SUSTAIN_TICKS; i++) tracker.tick(snapshot);
    expect(tracker.isAchieved()).toBe(true);

    // Tick with a bad snapshot — should still be achieved
    const bad: PopulationSnapshot = {
      breedVolumes: new Map([['a', 300]]),
      totalVolume: 300,
    };
    tracker.tick(bad);
    expect(tracker.isAchieved()).toBe(true);
    expect(tracker.progress()).toBe(1);
  });
});

describe('classifyBiome', () => {
  it('bloom-dominant dish returns "Coral Basin"', () => {
    const counts = new Map([
      ['bloom_mass', 500],
      ['needle_swarm', 100],
      ['glass_antibody', 100],
    ]);
    const biome = classifyBiome(counts);
    expect(biome.name).toBe('Coral Basin');
    expect(biome.topBreeds[0]).toBe('bloom_mass');
  });

  it('needle-dominant dish returns "Needle Garden"', () => {
    const counts = new Map([
      ['needle_swarm', 600],
      ['bloom_mass', 50],
      ['glass_antibody', 50],
    ]);
    const biome = classifyBiome(counts);
    expect(biome.name).toBe('Needle Garden');
  });

  it('balanced dish gets a composed name', () => {
    // No breed exceeds 40% share — should compose a name
    const counts = new Map([
      ['bloom_mass', 100],
      ['needle_swarm', 100],
      ['glass_antibody', 100],
    ]);
    const biome = classifyBiome(counts);
    // name1 = BIOME_NAMES['bloom_mass'].split(' ')[0] = 'Coral'
    // name2 = BIOME_NAMES['needle_swarm'].split(' ')[1] = 'Garden'
    expect(biome.name).toBe('Coral Garden');
  });

  it('different breed compositions get different ids', () => {
    const counts1 = new Map([['a', 10], ['b', 10], ['c', 10]]);
    const counts2 = new Map([['a', 10], ['b', 10], ['d', 10]]);
    const biome1 = classifyBiome(counts1);
    const biome2 = classifyBiome(counts2);
    expect(biome1.id).not.toBe(biome2.id);
  });

  it('id is deterministic — sorted breeds joined with +', () => {
    // topBreeds ordered by count descending: bloom_mass, needle_swarm, glass_antibody
    // id should be those sorted alphabetically
    const counts = new Map([
      ['bloom_mass', 300],
      ['needle_swarm', 200],
      ['glass_antibody', 100],
    ]);
    const biome = classifyBiome(counts);
    const expected = ['bloom_mass', 'glass_antibody', 'needle_swarm'].join('+');
    expect(biome.id).toBe(expected);
  });
});
