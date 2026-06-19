import type { ObjectiveDef } from '../content/objectives';
import type { BreedId } from '../content/catalysis';
import { createRng } from '../sim/rng';

export interface DrawContext {
  epochIndex: number;
  discoveredBreeds: ReadonlySet<BreedId>;
  unlockedTools: readonly string[];
  seed: number;
}

export interface PoolObjective extends ObjectiveDef {
  available: (ctx: DrawContext) => boolean;
}

export const OBJECTIVE_POOL: ReadonlyArray<PoolObjective> = [
  {
    kind: 'cross_breed' as any,
    name: 'Cross-Breed',
    description: 'Bring two discovered breeds together under a nutrient field to produce a hybrid offspring.',
    target: '1 hybrid breed created',
    hint: 'Overlap two breed cultures inside a nutrient conduit and hold until hybridisation triggers.',
    available: (ctx) => ctx.discoveredBreeds.size >= 2,
  },
  {
    kind: 'mega_culture' as any,
    name: 'Mega-Culture',
    description: 'Sustain a culture volume above 800 units for the full deadline period.',
    target: 'Culture volume > 800 sustained',
    hint: 'Keep seeding nutrient around the largest culture cluster and prevent toxin from eating its edge.',
    available: () => true,
  },
  {
    kind: 'reaction_chain' as any,
    name: 'Reaction Chain',
    description: 'Trigger 3 separate reagent reactions in a single dish run.',
    target: '3 reactions triggered',
    hint: 'Overlap different reagent combinations in different areas of the dish to chain multiple events.',
    available: (ctx) => ctx.unlockedTools.length >= 4,
  },
  {
    kind: 'balance_keeper' as any,
    name: 'Balance Keeper',
    description: 'Keep the dish balanced with no single breed above 40% dominance for 30 seconds.',
    target: 'No breed > 40% for 30s',
    hint: 'Use toxin to push back any culture that grows too large and nutrient to boost lagging ones.',
    available: (ctx) => ctx.discoveredBreeds.size >= 2,
  },
  {
    kind: 'crisis_survivor' as any,
    name: 'Crisis Survivor',
    description: 'Maintain 3 or more living cultures through a toxic crisis event.',
    target: '3+ cultures alive through crisis',
    hint: 'Spread cultures far apart before applying pressure, and keep water ready to dilute toxin spikes.',
    available: (ctx) => ctx.epochIndex >= 5,
  },
  {
    kind: 'protector' as any,
    name: 'Protector',
    description: 'Keep a fragile culture alive through a full outbreak without losing it.',
    target: 'Fragile culture survives outbreak',
    hint: 'Ring the fragile culture with nutrient and use acid sparingly near its edges.',
    available: (ctx) => ctx.epochIndex >= 4,
  },
  {
    kind: 'acid_sculptor' as any,
    name: 'Acid Sculptor',
    description: 'Use acid to precisely carve living matter into a configuration that triggers a reaction.',
    target: '1 reaction triggered via acid shaping',
    hint: 'Drop acid in thin strokes to redirect culture growth toward a reagent overlap zone.',
    available: (ctx) => ctx.unlockedTools.includes('acid'),
  },
  {
    kind: 'colony_founder' as any,
    name: 'Colony Founder',
    description: 'Grow 5 or more cultures of the same archetype type simultaneously.',
    target: '5+ of one archetype type',
    hint: 'Seed multiple eggs of the same archetype and support them all with nutrient before the dish fills.',
    available: () => true,
  },
  {
    kind: 'symbiosis' as any,
    name: 'Symbiosis',
    description: 'Have 2 different breeds coexist in the dish simultaneously for 30 seconds.',
    target: '2 breeds coexisting for 30s',
    hint: 'Keep each breed in its own territory and avoid reagents that would trigger cross-breed interactions.',
    available: (ctx) => ctx.discoveredBreeds.size >= 1,
  },
  {
    kind: 'extinction_reversal' as any,
    name: 'Extinction Reversal',
    description: 'Recover a culture that has dropped to 1 individual back to 4 or more.',
    target: 'Culture recovered from 1 to 4+',
    hint: 'Watch for cultures about to die, then flood them with nutrient while clearing nearby threats with toxin.',
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
