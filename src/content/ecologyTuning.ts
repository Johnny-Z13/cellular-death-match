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

export const TOOL_TUNING = {
  egg: { charges: 8, hatchRadius: 16, hatchTtl: 60 * 2 },
  nutrient: { charges: 5, radius: 20, ttl: 60 * 8 },
  toxin: { charges: 4, radius: 24, ttl: 60 * 7 },
  water: { charges: 6, radius: 28, ttl: 60 * 6 },
  salt: { charges: 4, radius: 18, ttl: 60 * 9 },
  acid: { charges: 3, radius: 17, ttl: 60 * 5 },
  // Paste draws a trail: each charge buys a length of drawn path. Stamps are
  // small, long-lived nutrient fields so colonies gently drift along the line.
  paste: { charges: 3, radius: 9, ttl: 60 * 7 } as const,
} as const;

export const PASTE_TUNING = {
  maxTrailStamps: 28,    // own budget, separate from catalysis tool effects
  stampSpacing: 5,       // grid units between stamps along a drag
  unitsPerCharge: 64,    // drawn path length one charge buys
} as const;

export const TOOL_EFFECT_TUNING = {
  nutrientPulseGrowth: 80,
  nutrientGrowthPerTick: 1.8,
  nutrientPullSpeed: 5.5,
  toxinPulseDamage: 42,
  toxinShrinkPerTick: 0.24,
  toxinFleeSpeed: 13,
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
} as const;
