import type { ObjectiveDef } from '../content/objectives';
import { BREED_DEFS, type BreedId } from '../content/catalysis';
import { CRISES } from '../content/ecology';
import { ARENA_TIMING } from '../content/ecologyTuning';
import { getEscalation } from './escalation';
import { createRng } from '../sim/rng';

export interface DrawContext {
  epochIndex: number;
  discoveredBreeds: ReadonlySet<BreedId>;
  unlockedTools: readonly string[];
  seed: number;
}

export interface PoolObjective extends ObjectiveDef {
  available: (ctx: DrawContext) => boolean;
  unavailableReason?: string;
}

export interface CrisisResolutionWindow {
  epochTicks: number;
  crisisIntervalTicks: number;
  graceTicks: number;
  maxDurationTicks: number;
}

const CRISIS_GRACE_TICKS = 60 * 25;
const MAX_CRISIS_DURATION_TICKS = Math.max(...Object.values(CRISES).map((crisis) => crisis.durationTicks));

export const OBJECTIVE_POOL: ReadonlyArray<PoolObjective> = [
  {
    kind: 'cross_breed',
    name: 'Cross-Breed',
    description: 'Bring two discovered breeds together under a nutrient field to produce a hybrid offspring.',
    target: '1 hybrid breed created',
    hint: 'Overlap two breed cultures inside a nutrient conduit and hold until hybridisation triggers.',
    available: (ctx) => hasUnmadeHybrid(ctx.discoveredBreeds),
  },
  {
    kind: 'mega_culture',
    name: 'Mega-Culture',
    description: 'Grow any living culture beyond 800 volume before the deadline.',
    target: 'Culture volume > 800',
    hint: 'Keep seeding nutrient around the largest culture cluster and prevent toxin from eating its edge.',
    volumeTarget: 800,
    available: () => true,
  },
  {
    kind: 'reaction_chain',
    name: 'Reaction Chain',
    description: 'Trigger 3 separate reagent reactions in a single dish run.',
    target: '3 reactions triggered',
    hint: 'Overlap different reagent combinations in different areas of the dish to chain multiple events.',
    targetCount: 3,
    available: (ctx) => hasReactionPair(ctx.unlockedTools),
  },
  {
    kind: 'balance_keeper',
    name: 'Balance Keeper',
    description: 'Keep the dish balanced with no single breed above 40% dominance for 30 seconds.',
    target: 'No breed > 40% for 30s',
    hint: 'Use toxin to push back any culture that grows too large and nutrient to boost lagging ones.',
    maxDominance: 0.4,
    sustainTicks: 60 * 30,
    available: (ctx) => ctx.discoveredBreeds.size >= 2,
  },
  {
    kind: 'crisis_survivor',
    name: 'Crisis Survivor',
    description: 'Maintain 3 or more living cultures through a toxic crisis event.',
    target: '3+ cultures alive through crisis',
    hint: 'Spread cultures far apart before applying pressure, and keep water ready to dilute toxin spikes.',
    minCount: 3,
    available: (ctx) => crisisSurvivorResolvableForEpoch(ctx.epochIndex),
  },
  {
    kind: 'protector',
    name: 'Protector',
    description: 'Keep a fragile culture alive through a full outbreak without losing it.',
    target: 'Fragile culture survives outbreak',
    hint: 'Ring the fragile culture with nutrient and use acid sparingly near its edges.',
    unavailableReason: 'Fragile-culture survival is not tracked yet.',
    available: () => false,
  },
  {
    kind: 'acid_sculptor',
    name: 'Acid Sculptor',
    description: 'Use acid to precisely carve living matter into a configuration that triggers a reaction.',
    target: '1 reaction triggered via acid shaping',
    hint: 'Drop acid in thin strokes to redirect culture growth toward a reagent overlap zone.',
    available: (ctx) => ctx.unlockedTools.includes('acid'),
  },
  {
    kind: 'colony_founder',
    name: 'Colony Founder',
    description: 'Grow 5 or more cultures of the same archetype simultaneously.',
    target: '5+ of one archetype',
    hint: 'Seed multiple eggs of the same archetype and support them all with nutrient before the dish fills.',
    targetCount: 5,
    available: () => true,
  },
  {
    kind: 'symbiosis',
    name: 'Symbiosis',
    description: 'Have 2 different breeds coexist near each other for 30 seconds.',
    target: '2 breeds nearby for 30s',
    hint: 'Keep each breed in its own territory and avoid reagents that would trigger cross-breed interactions.',
    sustainTicks: 60 * 30,
    available: (ctx) => ctx.discoveredBreeds.size >= 2,
  },
  {
    kind: 'extinction_reversal',
    name: 'Extinction Reversal',
    description: 'Recover a culture that has dropped to 1 individual back to 4 or more.',
    target: 'Culture recovered from 1 to 4+',
    hint: 'Watch for cultures about to die, then flood them with nutrient while clearing nearby threats with toxin.',
    targetCount: 4,
    available: (ctx) => ctx.epochIndex >= 4,
  },
];

export function drawObjectives(ctx: DrawContext): ObjectiveDef[] {
  const available = OBJECTIVE_POOL.filter((obj) => obj.available(ctx));

  const pool = available.slice();
  const rng = createRng(ctx.seed);

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.randInt(i + 1);
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }

  return pool.slice(0, 2);
}

export function crisisSurvivorResolvableForEpoch(epochIndex: number): boolean {
  const esc = getEscalation(epochIndex);
  return canCrisisSurvivorResolve({
    epochTicks: esc.epochTicks,
    crisisIntervalTicks: Math.max(60, Math.round(ARENA_TIMING.crisisIntervalTicks * esc.crisisIntervalMul)),
    graceTicks: CRISIS_GRACE_TICKS,
    maxDurationTicks: MAX_CRISIS_DURATION_TICKS,
  });
}

export function canCrisisSurvivorResolve(window: CrisisResolutionWindow): boolean {
  if (window.epochTicks <= 0 || window.crisisIntervalTicks <= 0) return false;
  const firstCrisisStart = Math.ceil(window.graceTicks / window.crisisIntervalTicks) * window.crisisIntervalTicks;
  return firstCrisisStart + window.maxDurationTicks <= window.epochTicks;
}

function hasUnmadeHybrid(discoveredBreeds: ReadonlySet<BreedId>): boolean {
  return Object.values(BREED_DEFS).some((def) => (
    !!def.parents
    && !discoveredBreeds.has(def.id)
    && def.parents.every((parent) => discoveredBreeds.has(parent))
  ));
}

function hasReactionPair(unlockedTools: readonly string[]): boolean {
  const tools = new Set(unlockedTools);
  return (
    (tools.has('water') && tools.has('nutrient'))
    || (tools.has('water') && tools.has('salt'))
    || (tools.has('acid') && tools.has('toxin'))
    || (tools.has('acid') && tools.has('water'))
    || (tools.has('acid') && tools.has('nutrient'))
  );
}
