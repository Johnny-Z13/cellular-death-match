export type EnemyArchetype =
  | 'bruiser' | 'sniper' | 'splitter' | 'swarmlet' | 'mirror' | 'boss';

export interface ArchetypeInfo {
  name: string;
  summary: string;
  color: [number, number, number];
}

export interface EnemySpawn {
  archetype: EnemyArchetype;
  targetVol: number;
  speed: number;
  engulfMultiplier: number;
  instability?: number;           // mutation pressure in ecosystem mode
  shootCooldown?: number;          // ticks between shots (snipers only)
  bulletSize?: number;
  bulletSpeed?: number;
}

export const EGG_ARCHETYPES: EnemyArchetype[] = [
  'swarmlet',
  'bruiser',
  'splitter',
  'sniper',
  'mirror',
  'boss',
];

export const ARCHETYPE_INFO: Record<EnemyArchetype, ArchetypeInfo> = {
  swarmlet: {
    name: 'Swarmlet',
    summary: 'Small, quick colonies that spread fast and die fast.',
    color: [91, 180, 224],
  },
  bruiser: {
    name: 'Bruiser',
    summary: 'Large, slow feeders that push the dish toward dominance.',
    color: [42, 150, 214],
  },
  splitter: {
    name: 'Splitter',
    summary: 'Midweight cells that shed swarmlets when destroyed.',
    color: [48, 176, 156],
  },
  sniper: {
    name: 'Sniper',
    summary: 'Lean ranged cells that fire through crowded ecosystems.',
    color: [62, 202, 218],
  },
  mirror: {
    name: 'Mirror',
    summary: 'Adaptive imitators that echo the red lineage profile.',
    color: [126, 132, 232],
  },
  boss: {
    name: 'Boss',
    summary: 'Huge anchor organisms that reshape the whole ecology.',
    color: [171, 93, 220],
  },
};

// Per-archetype defaults for the current ecosystem sandbox.
export const ARCHETYPE_DEFAULTS: Record<EnemyArchetype, EnemySpawn> = {
  bruiser: {
    archetype: 'bruiser',
    targetVol: 450,
    speed: 8,
    engulfMultiplier: 6.5,
    instability: 0.9,
  },
  sniper: {
    archetype: 'sniper',
    targetVol: 240,
    speed: 12,
    engulfMultiplier: 1,           // snipers don't engulf
    instability: 1.15,
    shootCooldown: 45,             // ~1.3 shots/sec (was 30 — too punishing)
    bulletSize: 3,                 // same as player (was 4 — oversized hit area)
    bulletSpeed: 2,
  },
  splitter: {
    archetype: 'splitter',
    targetVol: 300,
    speed: 8,
    engulfMultiplier: 6.5,         // bruiser-like
    instability: 1.25,
  },
  swarmlet: {
    archetype: 'swarmlet',
    targetVol: 120,
    speed: 12,
    engulfMultiplier: 4,           // weaker than player baseline
    instability: 1.6,
  },
  mirror: {
    archetype: 'mirror',
    // Mirror's stats are overridden at fight time using the player's config.
    // These are placeholder defaults so the type checks; the arena replaces them.
    targetVol: 300,
    speed: 10,
    engulfMultiplier: 5,
    instability: 1,
  },
  boss: {
    archetype: 'boss',
    targetVol: 1350,
    speed: 8,
    engulfMultiplier: 6.5,
    instability: 0.7,
  },
};

const elite = (s: EnemySpawn): EnemySpawn => ({
  ...s,
  targetVol: s.targetVol * 1.2,
});

const colony = (count: number, spawn: EnemySpawn): EnemySpawn[] =>
  Array.from({ length: count }, () => ({ ...spawn }));

// Ecosystem schedule. Each entry is an initial ecology for a longer epoch; the
// arena can reseed and mutate it while the player survives inside it.
export const ECOSYSTEM_SCHEDULE: ReadonlyArray<ReadonlyArray<EnemySpawn>> = [
  [{ ...ARCHETYPE_DEFAULTS.bruiser }, ...colony(3, ARCHETYPE_DEFAULTS.swarmlet)],
  [{ ...ARCHETYPE_DEFAULTS.splitter }, ...colony(5, ARCHETYPE_DEFAULTS.swarmlet)],
  [{ ...ARCHETYPE_DEFAULTS.sniper }, { ...ARCHETYPE_DEFAULTS.bruiser }, ...colony(3, ARCHETYPE_DEFAULTS.swarmlet)],
  [{ ...ARCHETYPE_DEFAULTS.mirror }, elite({ ...ARCHETYPE_DEFAULTS.splitter }), ...colony(4, ARCHETYPE_DEFAULTS.swarmlet)],
  [{ ...ARCHETYPE_DEFAULTS.boss }, elite({ ...ARCHETYPE_DEFAULTS.sniper }), elite({ ...ARCHETYPE_DEFAULTS.splitter })],
];

// Back-compat export for older tests/docs that still refer to fights.
export const FIGHT_SCHEDULE = ECOSYSTEM_SCHEDULE;
