export const ARENA_TIMING = {
  defaultEpochTicks: 60 * 75,
  mutationIntervalTicks: 60 * 10,
  reseedIntervalTicks: 60 * 5,
  outbreakIntervalTicks: 60 * 7,
  resupplyIntervalTicks: 60 * 11,
  accidentIntervalTicks: 60 * 13,
  emergencyEggRefillTicks: 60 * 8,
  crisisIntervalTicks: 60 * 18,
} as const;

export const ECOSYSTEM_LIMITS = {
  minPopulation: 5,
  quietEggRefillPopulation: 2,
  maxPopulation: 28,
  playerThreatRange: 16,
  maxToolEffects: 10,
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
