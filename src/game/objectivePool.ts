import type { ObjectiveDef } from '../content/objectives';
import {
  BREED_DEFS,
  REACTION_RECIPES,
  type BreedId,
  type CatalysisEffectType,
} from '../content/catalysis';
import { ARCHETYPE_REACTION_TRAITS, CRISES } from '../content/ecology';
import { EGG_ARCHETYPES, type EnemyArchetype } from '../content/enemies';
import { ARENA_TIMING } from '../content/ecologyTuning';
import { getEscalation } from './escalation';
import { createRng } from '../sim/rng';

export interface ToolBudget {
  readonly [toolId: string]: number;
}

export interface StudyCapabilities {
  epochIndex: number;
  knownBreeds: ReadonlySet<BreedId>;
  seedableLifeforms: ReadonlySet<string>;
  unlockedTools: readonly string[];
  toolBudget: ToolBudget;
  seed: number;
}

export type DrawContext = StudyCapabilities;

export interface ObjectiveAvailability {
  available: boolean;
  uses: string;
  reason?: string;
}

export interface StudyChoice extends ObjectiveDef {
  uses: string;
}

export interface PoolObjective extends ObjectiveDef {
  availability: (ctx: StudyCapabilities) => ObjectiveAvailability;
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
const ok = (uses: string): ObjectiveAvailability => ({ available: true, uses });
// Strains that hunt in the food-web life cycle (game/balance.ts HUNTER_ROLES).
const HUNTER_STRAINS = new Set(['bruiser', 'mirror', 'boss']);
const no = (uses: string, reason: string): ObjectiveAvailability => ({ available: false, uses, reason });

export const OBJECTIVE_POOL: ReadonlyArray<PoolObjective> = [
  {
    kind: 'cross_breed',
    name: 'Cross Strains',
    description: 'Bring two parent strains together under a Nutrient field to grow a hybrid.',
    target: '1 hybrid strain created',
    hint: 'Overlap both parent cultures inside a nutrient field and hold until hybridisation triggers.',
    availability: (ctx) => {
      const route = unmadeSeedableHybrid(ctx);
      const uses = route
        ? `${BREED_DEFS[route.parents![0]].name} + ${BREED_DEFS[route.parents![1]].name} + Nutrient`
        : 'Two parent strains + Nutrient';
      if (!route) return no(uses, 'No undecoded hybrid has both parents equipped.');
      if (!hasCharges(ctx, 'egg', 2) || !hasCharges(ctx, 'nutrient', 1)) {
        return no(uses, 'Your upgrades do not provide enough Eggs and Nutrient.');
      }
      return ok(uses);
    },
  },
  {
    kind: 'mega_culture',
    name: 'Mega-Culture',
    description: 'Grow one living culture beyond 800 volume.',
    target: 'Any culture volume > 800',
    hint: 'Keep feeding the largest culture cluster and protect its growing edge.',
    volumeTarget: 800,
    availability: (ctx) => hasCharges(ctx, 'egg', 1) && hasCharges(ctx, 'nutrient', 1)
      ? ok('1 seedable culture + Nutrient')
      : no('1 seedable culture + Nutrient', 'An Egg and Nutrient charge are required.'),
  },
  {
    kind: 'reaction_chain',
    name: 'Reaction Chain',
    description: 'Trigger 3 separate reactions in one trial.',
    target: '3 reactions triggered',
    hint: 'Repeat a working tool combo in separate areas of the dish.',
    targetCount: 3,
    availability: (ctx) => {
      const route = reachableDirectReaction(ctx, 3);
      return route
        ? ok(`3× ${route.name}: ${displayInputs(route.inputs)}`)
        : no('A repeatable 3-reaction route', 'No compatible reaction has enough charges for three repetitions.');
    },
  },
  {
    kind: 'balance_keeper',
    name: 'Even Spread',
    description: 'Keep the dish balanced, with no strain above 40% of living matter, for 30 seconds in all. A dip only pauses the clock.',
    target: 'No strain > 40% for 30s',
    hint: 'Use Toxin to check the leader and Nutrient to support the trailing culture.',
    maxDominance: 0.4,
    sustainTicks: 60 * 30,
    availability: (ctx) => distinctSeedables(ctx) >= 2
      && hasCharges(ctx, 'egg', 2)
      && hasCharges(ctx, 'nutrient', 1)
      && hasCharges(ctx, 'toxin', 1)
      ? ok('2 strains + Nutrient + Toxin')
      : no('2 strains + Nutrient + Toxin', 'Your strains or upgrades cannot support two-way balancing.'),
  },
  {
    kind: 'crisis_survivor',
    name: 'Crisis Survivor',
    description: 'Maintain 3 or more living cultures through a toxic crisis event.',
    target: '3+ cultures alive through crisis',
    hint: 'Spread three cultures apart and keep Nutrient ready before the crisis arrives.',
    minCount: 3,
    timed: true,
    availability: (ctx) => {
      if (!crisisSurvivorResolvableForEpoch(ctx.epochIndex)) {
        return no('3 Eggs + Nutrient', 'A full crisis cannot resolve inside this trial window.');
      }
      return hasCharges(ctx, 'egg', 3) && hasCharges(ctx, 'nutrient', 1)
        ? ok('3 Eggs + Nutrient')
        : no('3 Eggs + Nutrient', 'Your upgrades cannot seed and support three cultures.');
    },
  },
  {
    kind: 'protector',
    name: 'Protector',
    description: 'Keep a fragile culture alive through a full outbreak without losing it.',
    target: 'Fragile culture survives outbreak',
    hint: 'Ring the fragile culture with nutrient and use acid sparingly near its edges.',
    unavailableReason: 'Fragile-culture survival is not tracked yet.',
    availability: () => no('Fragile culture + tracked outbreak', 'Fragile-culture survival is not tracked yet.'),
  },
  {
    kind: 'acid_sculptor',
    name: 'Acid Sculptor',
    description: 'Use acid to precisely carve living matter into a configuration that triggers a reaction.',
    target: '1 reaction triggered via acid shaping',
    hint: 'Drop Acid in a thin stroke, then overlap a compatible tool near living tissue.',
    availability: (ctx) => {
      const route = reachableDirectReaction(ctx, 1, 'acid');
      return route
        ? ok(`${route.name}: ${displayInputs(route.inputs)}`)
        : no('Acid + a compatible tool and culture', 'No acid-led route is possible with these strains and upgrades.');
    },
  },
  {
    kind: 'colony_founder',
    name: 'Founder Strain',
    description: 'Keep 5 or more living cultures of the same strain at once.',
    target: '5+ matching living cultures',
    hint: 'Plant five Eggs of one strain in separate fertile spots before the dish fills.',
    targetCount: 5,
    availability: (ctx) => hasCharges(ctx, 'egg', 5) && hasCharges(ctx, 'nutrient', 1)
      ? ok('5 Eggs of one strain + Nutrient')
      : no('5 Eggs of one strain + Nutrient', 'Your upgrades cannot seed five cultures.'),
  },
  {
    kind: 'symbiosis',
    name: 'Symbiosis',
    description: 'Keep one of your strains beside a different strain for a minute in all. A dip only pauses the clock.',
    target: '2 strains nearby for 60s',
    hint: 'Plant one of each strain with a stable border and support either side with Nutrient.',
    sustainTicks: 60 * 60,
    availability: (ctx) => distinctSeedables(ctx) >= 2
      && hasCharges(ctx, 'egg', 2)
      && hasCharges(ctx, 'nutrient', 1)
      ? ok('2 different strains + Nutrient')
      : no('2 different strains + Nutrient', 'Two different strains are required.'),
  },
  {
    kind: 'hold_balance',
    name: 'Living Dish',
    description: 'Hold the dish in balance for two minutes in all: 3 or more strains alive, none holding over half the dish. A dip only pauses the clock.',
    target: 'Balance held 2:00',
    hint: 'Plant three strains apart. Feed whoever is fading; slow whoever is taking over.',
    sustainTicks: 60 * 120,
    availability: (ctx) => distinctSeedables(ctx) >= 3 && hasCharges(ctx, 'egg', 3)
      ? ok('3 different strains')
      : no('3 different strains', 'Three different strains are required.'),
  },
  {
    kind: 'keep_alive',
    name: 'Full House',
    description: 'Keep 5 different strains alive at once for three minutes in all. A dip only pauses the clock.',
    target: '5 strains alive 3:00',
    hint: 'Give each strain its own corner, and plant a new one when a strain fades.',
    minCount: 5,
    sustainTicks: 60 * 180,
    availability: (ctx) => distinctSeedables(ctx) >= 5 && hasCharges(ctx, 'egg', 5)
      ? ok('5 different strains')
      : no('5 different strains', 'Five different strains are required.'),
  },
  {
    kind: 'food_web',
    name: 'Food Web',
    description: 'Let a hunter and its prey share the dish for three minutes in all, neither taking over. A dip only pauses the clock.',
    target: 'Hunter and prey together 3:00',
    hint: 'Plant a Bruiser beside a few Swarmlets, and keep the Swarmlets fed so they outgrow the hunt.',
    sustainTicks: 60 * 180,
    availability: (ctx) => [...ctx.seedableLifeforms].some((id) => HUNTER_STRAINS.has(id))
      && [...ctx.seedableLifeforms].some((id) => !HUNTER_STRAINS.has(id))
      && hasCharges(ctx, 'egg', 3)
      ? ok('A hunter strain + a prey strain')
      : no('A hunter strain + a prey strain', 'A hunter (Bruiser, Mirror or Boss) and a prey strain are required.'),
  },
  {
    kind: 'extinction_reversal',
    name: 'Extinction Reversal',
    description: 'Let the dish fall to one living culture, then recover to 4 or more.',
    target: 'Dish recovers from 1 to 4+ living cultures',
    hint: 'Hold Egg charges in reserve; once only one culture remains, reseed and feed three more.',
    targetCount: 4,
    availability: (ctx) => ctx.epochIndex >= 4
      && hasCharges(ctx, 'egg', 4)
      && hasCharges(ctx, 'nutrient', 1)
      ? ok('4 Eggs held in reserve + Nutrient')
      : no('4 Eggs held in reserve + Nutrient', 'This trial needs four Egg charges and later-lab pressure.'),
  },
];

/** Trials that reward holding a living dish over time. */
export const SUSTAIN_KINDS: ReadonlySet<ObjectiveDef['kind']> = new Set([
  'hold_balance', 'keep_alive', 'food_web', 'balance_keeper', 'symbiosis',
]);

export function drawObjectives(ctx: StudyCapabilities): StudyChoice[] {
  const available = OBJECTIVE_POOL.flatMap((objective): StudyChoice[] => {
    const result = objective.availability(ctx);
    return result.available ? [{ ...objective, uses: result.uses }] : [];
  });
  const pool = available.slice();
  const rng = createRng(ctx.seed);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.randInt(i + 1);
    const tmp = pool[i];
    pool[i] = pool[j]!;
    pool[j] = tmp!;
  }
  // Cosy pace: one of the two choices always asks the player to sustain a
  // living dish, whenever such a trial is available.
  const choices = pool.slice(0, 2);
  if (!choices.some((choice) => SUSTAIN_KINDS.has(choice.kind))) {
    const sustain = pool.find((choice) => SUSTAIN_KINDS.has(choice.kind));
    if (sustain) choices[choices.length - 1] = sustain;
  }
  return choices;
}

export function isObjectiveFeasible(objective: ObjectiveDef, ctx: StudyCapabilities): boolean {
  const candidate = OBJECTIVE_POOL.find((item) => item.kind === objective.kind);
  return candidate?.availability(ctx).available === true;
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

function unmadeSeedableHybrid(ctx: StudyCapabilities) {
  return Object.values(BREED_DEFS).find((def) => (
    !!def.parents
    && !ctx.knownBreeds.has(def.id)
    && def.parents.every((parent) => ctx.seedableLifeforms.has(parent))
  ));
}

function reachableDirectReaction(
  ctx: StudyCapabilities,
  repetitions: number,
  requiredInput?: CatalysisEffectType,
) {
  return REACTION_RECIPES.find((recipe) => {
    if (requiredInput && !recipe.inputs.includes(requiredInput)) return false;
    if (recipe.inputs.some((input) => !isDirectPlayerInput(input))) return false;
    if (recipe.id === 'agitated_chain' || recipe.id === 'spore_comet') {
      if (!hasCharges(ctx, 'agitate', repetitions)) return false;
    }
    const counts = new Map<string, number>();
    for (const input of recipe.inputs) counts.set(input, (counts.get(input) ?? 0) + repetitions);
    if ([...counts].some(([tool, count]) => !hasCharges(ctx, tool, count))) return false;
    return [...ctx.seedableLifeforms].some((id) => recipeSupportsLifeform(recipe, id));
  });
}

function recipeSupportsLifeform(
  recipe: (typeof REACTION_RECIPES)[number],
  lifeformId: string,
): boolean {
  const breed = lifeformId in BREED_DEFS ? BREED_DEFS[lifeformId as BreedId] : undefined;
  const archetype = (breed?.baseArchetype ?? lifeformId) as EnemyArchetype;
  if (!EGG_ARCHETYPES.includes(archetype)) return false;
  const traits = new Set([
    ...ARCHETYPE_REACTION_TRAITS[archetype],
    ...(breed?.traits ?? []),
  ]);
  const traitOk = !recipe.traits || recipe.traits.some((trait) => traits.has(trait));
  const archetypeOk = !recipe.archetypes || recipe.archetypes.includes(archetype);
  return traitOk && archetypeOk;
}

function isDirectPlayerInput(input: CatalysisEffectType): boolean {
  return input === 'nutrient'
    || input === 'toxin'
    || input === 'water'
    || input === 'salt'
    || input === 'acid';
}

function hasCharges(ctx: StudyCapabilities, tool: string, required: number): boolean {
  return ctx.unlockedTools.includes(tool) && (ctx.toolBudget[tool] ?? 0) >= required;
}

function distinctSeedables(ctx: StudyCapabilities): number {
  return new Set([...ctx.seedableLifeforms]).size;
}

function displayInputs(inputs: readonly CatalysisEffectType[]): string {
  return inputs.map((input) => input[0]!.toUpperCase() + input.slice(1)).join(' + ');
}
