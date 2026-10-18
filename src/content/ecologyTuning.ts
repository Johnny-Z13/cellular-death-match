export const ARENA_TIMING = {
  defaultEpochTicks: 60 * 80,
  mutationIntervalTicks: 60 * 12,
  reseedIntervalTicks: 60 * 5,
  // Softer pressure cadence for a playful-discovery feel: hazards arrive less
  // often and never crowd the opening minute, and tools resupply sooner.
  outbreakIntervalTicks: 60 * 14,
  resupplyIntervalTicks: 60 * 9,
  accidentIntervalTicks: 60 * 22,
  emergencyEggRefillTicks: 60 * 6,
  crisisIntervalTicks: 60 * 30,
} as const;

export const SIM_SPEED_TUNING = {
  // Gameplay durations and per-tick forces are authored at 60 ticks/second.
  defaultTicksPerSecond: 60,
  minTicksPerSecond: 30,
  maxTicksPerSecond: 90,
  ticksPerSecondStep: 1,
  maxTicksPerFrame: 3,
  maxFrameDeltaMs: 250,
  storageKey: 'cdm.simSpeed.tps.v1',
} as const;

export const ECOSYSTEM_LIMITS = {
  minPopulation: 5,
  quietEggRefillPopulation: 2,
  maxPopulation: 28,
  playerThreatRange: 16,
  maxToolEffects: 10,
  maxDishEvents: 16,
  outbreakMinTargetVol: 360,
  outbreakHunterCount: 3,
} as const;

// cooldownTicks paces repeat uses of the same tool (radial wipe on the button);
// stock charges stay the strategic budget. Paste's cooldown starts when the
// drawn stroke ends, not per stamp.
export const TOOL_TUNING = {
  egg: { charges: 8, hatchRadius: 16, hatchTtl: 60 * 2, cooldownTicks: 120 },
  nutrient: { charges: 5, radius: 20, ttl: 60 * 8, cooldownTicks: 90 },
  toxin: { charges: 4, radius: 24, ttl: 60 * 7, cooldownTicks: 180 },
  water: { charges: 6, radius: 28, ttl: 60 * 6, cooldownTicks: 90 },
  salt: { charges: 4, radius: 18, ttl: 60 * 9, cooldownTicks: 180 },
  acid: { charges: 3, radius: 17, ttl: 60 * 5, cooldownTicks: 240 },
  // Paste draws an agar wall (game/agarWall.ts): each charge buys a length of
  // drawn path. Fresh gel is also a small nutrient field along the line.
  paste: { charges: 3, radius: 9, ttl: 60 * 7, cooldownTicks: 180 } as const,
} as const;

export const PASTE_TUNING = {
  maxTrailStamps: 28,    // own budget, separate from catalysis tool effects
  stampSpacing: 5,       // grid units between stamps along a drag
  unitsPerCharge: 64,    // drawn path length one charge buys
} as const;

export const WORLD_EVENT_TUNING = {
  defaultIntensity: 0.25,
  intervalTicks: 60 * 8,
  graceTicks: 60 * 12,
  sporeDriftChance: 0.45,
  agarBloomRadius: 15,
  agarBloomTtl: 60 * 5,
} as const;

export const TOOL_EFFECT_TUNING = {
  nutrientPulseGrowth: 80,
  nutrientGrowthPerTick: 1.8,
  nutrientPullSpeed: 13,
  toxinPulseDamage: 42,
  toxinShrinkPerTick: 0.24,
  toxinFleeSpeed: 24,
  waterPulseGrowth: 34,
  waterGrowthPerTick: 0.58,
  waterSpreadSpeed: 4.2,
  saltPulseDamage: 24,
  saltShrinkPerTick: 0.38,
  saltMaxSpeed: 3.6,
  acidPulseDamage: 76,
  acidShrinkPerTick: 0.66,
  acidFleeSpeed: 9,
  bloomGrowthPerTick: 3.1,
  brineShrinkPerTick: 0.72,
} as const;

export const OBJECTIVE_TUNING = {
  preserveGrazerMin: 3,
  breedTargetCount: 4,
  controlledReactionMinCount: 1,
  controlledReactionMinCoverage: 0.04,
  dominantMinCoverage: 0.04,
  bloomMinCoverage: 0.10,
  sterilizeMaxCoverage: 0.04,
  balanceMaxDominance: 0.56,
  balanceMinLifeforms: 3,
} as const;

export const AGITATION_TUNING = {
  defaultCharges: 2,
  durationTicks: 90,
  minSpeed: 10,
  extraSpeed: 14,
  cooldownTicks: 300,
} as const;

// Life cycle for open dishes. 'arena' is the original death match: every
// culture hunts until one remains. 'culture' is a food web. Grazers feed on
// the agar in proportion to free space; hunters eat other strains until they
// divide, then digest. Everything burns mass, and starved cultures dissolve.
// Ratios are multiples of a culture's genome size (its spawn targetVol).
export const LIFE_CYCLE_PROFILES = {
  arena: null,
  culture: {
    // Snipers (suppressors) never engulf, so they feed on agar like grazers.
    hunterRoles: ['predator', 'anchor', 'mimic'],
    desperateBelow: 0.5,      // grazers hunt only under base × this
    satedSpeed: 0.35,         // speed multiplier while not hunting
    huntEngulfScale: 1,       // scales a hunter's engulf multiplier above 1
    // Engulfing is charged per pixel transfer, and contact boundaries churn,
    // so the arena's 0.5 gain / 0.6 drain bleeds a victim dry within seconds.
    engulfGain: 0.2,
    engulfDrain: 0.2,
    bulletDrain: 0.2,
    hunterMetabolismPerTick: 0.0008, // fraction of base burned per tick
    grazerMetabolismPerTick: 0.0004,
    // fraction of the gap to the agar ceiling regained per tick, × free space
    agarGrowthPerTick: 0.0014,
    agarCeiling: 2.2,
    divideAt: 2.0,            // splits into two halves at base × this
    digestTicks: 60 * 6,      // both halves rest after dividing
    divideCheckTicks: 30,
    starveBelow: 0.15,        // dissolves under base × this
  },
};

export type LifeCycleProfileId = keyof typeof LIFE_CYCLE_PROFILES;
export type LifeCycleProfile = NonNullable<(typeof LIFE_CYCLE_PROFILES)[LifeCycleProfileId]>;
// Every dish after the coached onboarding runs the food web, the case trials
// as well as the open lab: a cosy pace where living dishes can hold.
export const DISH_LIFE_CYCLE: LifeCycleProfileId = 'culture';
