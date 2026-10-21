export const ARENA_TIMING = {
  defaultEpochTicks: 60 * 80,
  mutationIntervalTicks: 60 * 12,
  reseedIntervalTicks: 60 * 5,
  // Softer pressure cadence for a playful-discovery feel: hazards arrive less
  // often and never crowd the opening minute. The silent resupply is a slow
  // safety net (one charge every 18 s); Restock moments (RESTOCK_TUNING) are
  // where charges really come back, and they show.
  outbreakIntervalTicks: 60 * 14,
  resupplyIntervalTicks: 60 * 18,
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
// stock charges stay the strategic budget. The Membrane's cooldown starts when the
// drawn stroke ends, not per stamp.
export const TOOL_TUNING = {
  // Hunter eggs (Bruiser, Mirror, Boss) hatch at this share of the strain's
  // genome size; grazer eggs hatch as small buds.
  egg: { charges: 8, hatchRadius: 16, hatchTtl: 60 * 2, cooldownTicks: 120, hunterGenomeShare: 0.7 },
  nutrient: { charges: 5, radius: 20, ttl: 60 * 8, cooldownTicks: 90 },
  toxin: { charges: 4, radius: 24, ttl: 60 * 7, cooldownTicks: 180 },
  water: { charges: 6, radius: 28, ttl: 60 * 6, cooldownTicks: 90 },
  salt: { charges: 4, radius: 18, ttl: 60 * 9, cooldownTicks: 180 },
  acid: { charges: 3, radius: 17, ttl: 60 * 5, cooldownTicks: 240 },
  // The Membrane (tool id 'paste') draws a gel wall (game/agarWall.ts): each
  // charge buys a length of drawn path. Its stamps never feed; radius and ttl
  // are where a reagent dropped on a fresh membrane reacts along it.
  paste: { charges: 3, radius: 9, ttl: 60 * 7, cooldownTicks: 180 } as const,
} as const;

// Restock: good moments hand the player charges back, so a long sustain trial
// doesn't run dry. Every full minute of Balance tops up each tool below full
// by one; the first stable ecosystem in a dish restocks the whole bench; a
// discovery (a reaction or strain new to this dish, or a friend merged) slides
// a spare to the emptiest tools. Never past a tool's max.
// Lessons: while Dr. E's coach instructs a dish, or a trial asks the player to
// reproduce a reaction, reagent fields (and the reactions they make, like
// Foam) fade at this share of their usual speed: an 8 s Nutrient field lasts
// ~23 s, a 4 s Foam ~11 s, so a recipe never expires while the player reads.
export const LESSON_TUNING = {
  fieldFadeScale: 0.35,
} as const;

export const RESTOCK_TUNING = {
  balanceMinuteTicks: 60 * 60,
  discoverySpares: 2,
  /** Discovery and merge spares come at most once in this window, so a burst
   *  of new reactions is one gift, not four. */
  sparesCooldownTicks: 60 * 20,
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
    // The player's own hunters (planted, or their daughters) are lab-bred and
    // burn at this share of a wild hunter's rate, so a tended Bruiser or
    // Mirror has time to hunt before it starves.
    ownHunterBurnScale: 0.5,
    grazerMetabolismPerTick: 0.0004,
    // fraction of the gap to the agar ceiling regained per tick, × free space
    agarGrowthPerTick: 0.0014,
    agarCeiling: 2.2,
    divideAt: 2.0,            // splits into two halves at base × this
    digestTicks: 60 * 6,      // both halves rest after dividing
    divideCheckTicks: 30,
    starveBelow: 0.15,        // dissolves under base × this
    // A culture planted from an Egg lives on its yolk at first: no mass burned
    // for this long, so a fresh hunter can reach prey before it starves.
    yolkTicks: 60 * 20,
    // ...and it barely moves (this share of its speed), so an arrangement the
    // player plants holds together long enough to feed it into a merge.
    yolkSpeedScale: 0,
  },
};

export type LifeCycleProfileId = keyof typeof LIFE_CYCLE_PROFILES;
export type LifeCycleProfile = NonNullable<(typeof LIFE_CYCLE_PROFILES)[LifeCycleProfileId]>;
// Every dish after the coached onboarding runs the food web, the case trials
// as well as the open lab: a cosy pace where living dishes can hold.
export const DISH_LIFE_CYCLE: LifeCycleProfileId = 'culture';
