// The goal bar's headline: one short imperative sentence per objective kind,
// generated from the objective's own parameters so the numbers on screen can
// never drift from the rules that score them. The live status line (the
// objective summary) explains how far along the player is; this line explains
// what to do.
import { ARCHETYPE_INFO } from './enemies';
import { BREED_DEFS, REACTION_RECIPES } from './catalysis';
import type { ObjectiveDef } from './objectives';

function strainName(def: ObjectiveDef, fallback: string): string {
  if (def.breedId) return BREED_DEFS[def.breedId]?.name ?? fallback;
  if (def.archetype) return ARCHETYPE_INFO[def.archetype]?.name ?? fallback;
  return fallback;
}

function reactionName(def: ObjectiveDef): string {
  return REACTION_RECIPES.find((recipe) => recipe.id === def.recipeId)?.name ?? 'the target';
}

function seconds(ticks: number | undefined, fallback: number): number {
  return Math.round((ticks ?? fallback * 60) / 60);
}

/** m:ss, for the minute-scale sustain goals. */
function clock(ticks: number | undefined, fallbackSeconds: number): string {
  const total = seconds(ticks, fallbackSeconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function goalLineFor(def: ObjectiveDef): string {
  if (def.goal) return def.goal;
  switch (def.kind) {
    case 'discover_breed':
      return `Create ${strainName(def, 'a new strain')}`;
    case 'stabilize_breed':
      return `Grow ${strainName(def, 'Bloom Mass')} and keep it alive`;
    case 'understand_recipe':
      return `Trigger the ${reactionName(def)} reaction`;
    case 'apply_recipe':
      return `Trigger ${reactionName(def)} with ${def.minCount ?? 2}+ cultures alive`;
    case 'preserve_grazers':
      return `Keep ${def.minCount ?? 3} grazing cultures alive`;
    case 'breed_archetype':
      return `Grow ${def.targetCount ?? 4} ${strainName(def, 'Swarmlet')} cultures`;
    case 'controlled_reaction':
      return `Cause ${def.targetCount ?? 2} reactions in a living dish`;
    case 'balanced_ecology':
      return `Keep ${def.minCount ?? 3}+ cultures, none over ${Math.round((def.maxDominance ?? 0.5) * 100)}%`;
    case 'dominant_archetype':
      return `Make ${strainName(def, 'Boss')} the dominant strain`;
    case 'cross_breed':
      return 'Cross two strains into a hybrid';
    case 'mega_culture':
      return `Grow one culture past size ${def.volumeTarget ?? 800}`;
    case 'reaction_chain':
      return `Cause ${def.targetCount ?? 3} reactions`;
    case 'balance_keeper':
      return `Keep every strain under ${Math.round((def.maxDominance ?? 0.4) * 100)}% for ${seconds(def.sustainTicks, 30)}s`;
    case 'crisis_survivor':
      return `Keep ${def.minCount ?? 3}+ of your cultures through a crisis`;
    case 'protector':
      return 'Shield a fragile culture from harm';
    case 'acid_sculptor':
      return 'Start a reaction with Acid';
    case 'colony_founder':
      return `Grow ${def.targetCount ?? 5} cultures of one strain`;
    case 'symbiosis':
      return `Keep two of your strains together for ${seconds(def.sustainTicks, 30)}s`;
    case 'extinction_reversal':
      return `After a crash, regrow ${def.targetCount ?? 4} of your cultures`;
    case 'hold_balance':
      return `Hold the dish in balance for ${clock(def.sustainTicks, 120)}`;
    case 'keep_alive':
      return `Keep ${def.minCount ?? 5} strains alive for ${clock(def.sustainTicks, 180)}`;
    case 'food_web':
      return `Let hunter and prey share the dish for ${clock(def.sustainTicks, 180)}`;
    default: {
      const unhandled: never = def.kind;
      throw new Error(`Unhandled objective kind: ${unhandled}`);
    }
  }
}
