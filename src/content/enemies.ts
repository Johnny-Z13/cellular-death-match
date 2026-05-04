export type EnemyArchetype =
  | 'bruiser' | 'sniper' | 'splitter' | 'swarmlet' | 'mirror' | 'boss';

export interface EnemySpawn {
  archetype: EnemyArchetype;
  targetVol: number;
  speed: number;
  engulfMultiplier: number;
  shootCooldown?: number;          // ticks between shots (snipers only)
  bulletSize?: number;
  bulletSpeed?: number;
}

// Per-archetype default stats. Per spec section 7.1.
export const ARCHETYPE_DEFAULTS: Record<EnemyArchetype, EnemySpawn> = {
  // Player base = 300 targetVol, 10 speed, 5 engulfMultiplier (in run.ts).
  bruiser: {
    archetype: 'bruiser',
    targetVol: 450,                // +50% per spec
    speed: 8,                      // -20% per spec
    engulfMultiplier: 6.5,         // +30% per spec (5 * 1.3)
  },
  sniper: {
    archetype: 'sniper',
    targetVol: 240,                // -20% per spec
    speed: 12,                     // +20% per spec
    engulfMultiplier: 1,           // snipers don't engulf
    shootCooldown: 45,             // ~1.3 shots/sec (was 30 — too punishing)
    bulletSize: 3,                 // same as player (was 4 — oversized hit area)
    bulletSpeed: 2,
  },
  splitter: {
    archetype: 'splitter',
    targetVol: 300,                // base, per spec
    speed: 8,
    engulfMultiplier: 6.5,         // bruiser-like
  },
  swarmlet: {
    archetype: 'swarmlet',
    targetVol: 120,                // -60% per spec (300 * 0.4)
    speed: 12,                     // +20%
    engulfMultiplier: 4,           // weaker than player baseline
  },
  mirror: {
    archetype: 'mirror',
    // Mirror's stats are overridden at fight time using the player's config.
    // These are placeholder defaults so the type checks; the arena replaces them.
    targetVol: 300,
    speed: 10,
    engulfMultiplier: 5,
  },
  boss: {
    archetype: 'boss',
    targetVol: 1350,               // 3x bruiser per spec
    speed: 8,
    engulfMultiplier: 6.5,
  },
};

const elite = (s: EnemySpawn): EnemySpawn => ({
  ...s,
  targetVol: s.targetVol * 1.2,
});

const swarmlet4: EnemySpawn[] = Array.from({ length: 4 }, () => ({ ...ARCHETYPE_DEFAULTS.swarmlet }));

// Fight schedule. Spec section 7.1.
export const FIGHT_SCHEDULE: ReadonlyArray<ReadonlyArray<EnemySpawn>> = [
  [{ ...ARCHETYPE_DEFAULTS.bruiser }],
  [{ ...ARCHETYPE_DEFAULTS.sniper }],
  [{ ...ARCHETYPE_DEFAULTS.bruiser }, { ...ARCHETYPE_DEFAULTS.sniper }],
  [{ ...ARCHETYPE_DEFAULTS.splitter }],
  swarmlet4,
  [{ ...ARCHETYPE_DEFAULTS.mirror }],
  [elite({ ...ARCHETYPE_DEFAULTS.splitter }), elite({ ...ARCHETYPE_DEFAULTS.sniper })],
  [{ ...ARCHETYPE_DEFAULTS.boss }],
];
