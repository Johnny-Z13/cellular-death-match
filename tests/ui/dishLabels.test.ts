import { describe, expect, it } from 'vitest';
import {
  DISH_LABEL_TUNING,
  humanEventLabel,
  planDishLabels,
  type DishLabelInput,
  type LabelCulture,
} from '../../src/ui/dishLabels';

function culture(overrides: Partial<LabelCulture> & Pick<LabelCulture, 'id'>): LabelCulture {
  return {
    strainKey: 'swarmlet',
    name: 'Swarmlet',
    color: [72, 201, 255],
    center: [80, 80],
    vol: 120,
    isControl: false,
    isGoal: false,
    strainFirstSeenMs: 0,
    ...overrides,
  };
}

function input(overrides: Partial<DishLabelInput> = {}): DishLabelInput {
  return {
    cultures: [],
    events: [],
    nowMs: 60_000,
    dishStartMs: 0,
    gridSize: 160,
    dishPx: 400,
    pingId: null,
    compact: false,
    ...overrides,
  };
}

describe('planDishLabels', () => {
  it('tags each strain once, on its largest living culture', () => {
    const plan = planDishLabels(input({
      cultures: [
        culture({ id: 2, center: [20, 30], vol: 60 }),
        culture({ id: 3, center: [120, 40], vol: 240 }),
        culture({ id: 4, strainKey: 'bloom_mass', name: 'Bloom Mass', center: [60, 120], vol: 300 }),
      ],
    }));
    const strainTags = plan.filter((label) => label.kind === 'strain');
    expect(strainTags.map((label) => label.text).sort()).toEqual(['Bloom Mass', 'Swarmlet']);
    const swarmlet = strainTags.find((label) => label.text === 'Swarmlet')!;
    expect(swarmlet.cultureId).toBe(3);
    expect(swarmlet.xPct).toBeCloseTo(75, 0);
  });

  it('ignores dead and speck-sized cultures', () => {
    const plan = planDishLabels(input({
      cultures: [
        culture({ id: 2, vol: 0 }),
        culture({ id: 3, strainKey: 'bruiser', name: 'Bruiser', vol: DISH_LABEL_TUNING.minVol - 1 }),
      ],
    }));
    expect(plan).toEqual([]);
  });

  it('names the control sample and marks goal strains with a goal icon', () => {
    const plan = planDishLabels(input({
      cultures: [
        culture({ id: 1, strainKey: 'control', name: 'Control sample', isControl: true, color: [186, 32, 42], center: [30, 30] }),
        culture({ id: 5, strainKey: 'bloom_mass', name: 'Bloom Mass', isGoal: true, center: [120, 120] }),
      ],
    }));
    expect(plan.find((label) => label.kind === 'control')?.text).toBe('Control sample');
    const goal = plan.find((label) => label.kind === 'goal')!;
    expect(goal.text).toBe('Bloom Mass');
    expect(goal.icon).toBe(DISH_LABEL_TUNING.icons.goal);
  });

  it('announces a strain that appears mid-dish as new, but not the starting cast', () => {
    const plan = planDishLabels(input({
      nowMs: 20_000,
      dishStartMs: 0,
      cultures: [
        culture({ id: 2, strainFirstSeenMs: 200, center: [30, 30] }),
        culture({ id: 3, strainKey: 'needle_swarm', name: 'Needle Swarm', strainFirstSeenMs: 18_000, center: [120, 120] }),
      ],
    }));
    expect(plan.find((label) => label.cultureId === 2)?.kind).toBe('strain');
    const fresh = plan.find((label) => label.cultureId === 3)!;
    expect(fresh.kind).toBe('new');
    expect(fresh.text).toBe('New · Needle Swarm');

    const later = planDishLabels(input({
      nowMs: 18_000 + DISH_LABEL_TUNING.newStrainMs + 1,
      cultures: [culture({ id: 3, strainKey: 'needle_swarm', name: 'Needle Swarm', strainFirstSeenMs: 18_000 })],
    }));
    expect(later[0]!.kind).toBe('strain');
  });

  it('pings the culture under a tap even when it is not its strain\'s largest', () => {
    const plan = planDishLabels(input({
      pingId: 2,
      cultures: [
        culture({ id: 2, center: [20, 20], vol: 40 }),
        culture({ id: 3, center: [140, 140], vol: 400 }),
      ],
    }));
    const ping = plan.find((label) => label.kind === 'ping')!;
    expect(ping.cultureId).toBe(2);
    expect(ping.text).toBe('Swarmlet');
    expect(plan.filter((label) => label.cultureId === 2)).toHaveLength(1);
  });

  it('caps strain tags: fewer on compact phones', () => {
    const many = Array.from({ length: 12 }, (_, index) => culture({
      id: index + 2,
      strainKey: `strain-${index}`,
      name: `Strain ${index}`,
      center: [10 + (index % 4) * 40, 15 + Math.floor(index / 4) * 50],
    }));
    expect(planDishLabels(input({ cultures: many, compact: true })).length).toBeLessThanOrEqual(DISH_LABEL_TUNING.maxTags.compact);
    expect(planDishLabels(input({ cultures: many })).length).toBeLessThanOrEqual(DISH_LABEL_TUNING.maxTags.wide);
  });

  it('flips a colliding tag below its culture, then drops the lowest priority', () => {
    const plan = planDishLabels(input({
      cultures: [
        culture({ id: 2, strainKey: 'swarmlet', name: 'Swarmlet', center: [80, 80], vol: 120 }),
        culture({ id: 3, strainKey: 'bloom_mass', name: 'Bloom Mass', isGoal: true, center: [80, 80], vol: 100 }),
        culture({ id: 4, strainKey: 'bruiser', name: 'Bruiser', center: [80, 80], vol: 90 }),
      ],
    }));
    expect(plan.map((label) => [label.text, label.placement])).toEqual([
      ['Bloom Mass', 'above'],
      ['Swarmlet', 'below'],
    ]);
  });

  it('keeps tags inside the dish at the edges, flipping below when there is no room above', () => {
    const plan = planDishLabels(input({
      cultures: [
        culture({ id: 2, center: [1, 2], vol: 50 }),
        culture({ id: 3, strainKey: 'bruiser', name: 'Bruiser', center: [159, 158], vol: 50 }),
      ],
    }));
    for (const label of plan) {
      expect(label.xPct).toBeGreaterThanOrEqual(DISH_LABEL_TUNING.edgePct);
      expect(label.xPct).toBeLessThanOrEqual(100 - DISH_LABEL_TUNING.edgePct);
      expect(label.yPct).toBeGreaterThanOrEqual(0);
      expect(label.yPct).toBeLessThanOrEqual(100);
    }
    expect(plan.find((label) => label.cultureId === 2)?.placement).toBe('below');
    expect(plan.find((label) => label.cultureId === 3)?.placement).toBe('above');
  });

  it('shows at most two fresh event callouts, newest first, ahead of strain tags', () => {
    const plan = planDishLabels(input({
      cultures: [culture({ id: 2, center: [80, 84], vol: 200 })],
      events: [
        { id: 7, kind: 'critical', label: 'PREDATOR OUTBREAK', pos: [80, 80], ageMs: 400 },
        { id: 8, kind: 'mutation', label: 'VISIBLE MUTATION', pos: [20, 140], ageMs: 100 },
        { id: 9, kind: 'caution', label: 'ROGUE REAGENT', pos: [140, 20], ageMs: 900 },
        { id: 10, kind: 'critical', label: 'PREDATOR OUTBREAK FLASH', pos: [80, 80], ageMs: 0 },
        { id: 11, kind: 'stabilize', label: 'AGAR BLOOM', pos: [40, 40], ageMs: DISH_LABEL_TUNING.eventMs + 1 },
      ],
    }));
    const events = plan.filter((label) => label.kind === 'event');
    expect(events.map((label) => label.text)).toEqual(['Mutation', 'Predator outbreak']);
    expect(events[1]!.icon).toBe(DISH_LABEL_TUNING.icons.critical);
    expect(events[1]!.placement).toBe('center');
    // Callouts are planned (and therefore stacked) ahead of every tag.
    expect(plan[0]!.kind).toBe('event');
    expect(plan[1]!.kind).toBe('event');
  });
});

describe('humanEventLabel', () => {
  it('turns shouted marker labels into short sentence-case callouts', () => {
    expect(humanEventLabel('PREDATOR OUTBREAK')).toBe('Predator outbreak');
    expect(humanEventLabel('VISIBLE MUTATION')).toBe('Mutation');
    expect(humanEventLabel('ROGUE REAGENT')).toBe('Rogue chemical');
    expect(humanEventLabel('NEW LIFEFORM: Bloom Mass')).toBe('New strain: Bloom Mass');
    expect(humanEventLabel('CATALYTIC FLARE: Bitter Bloom discovered.')).toBe('Reaction: Bitter Bloom');
    expect(humanEventLabel('FOLDING FAULT: Folding Fault discovered.')).toBe('Folding fault');
    expect(humanEventLabel('FOLDING FAULT: Velvet Prison discovered.')).toBe('Folding fault: Velvet Prison');
    expect(humanEventLabel('WATER DILUTED ACID')).toBe('Water diluted acid');
  });

  it('suppresses the duplicate flash and spark markers', () => {
    expect(humanEventLabel('PREDATOR OUTBREAK FLASH')).toBeNull();
    expect(humanEventLabel('CATALYTIC FOAM: Foam Lightning discovered. SPARK')).toBeNull();
  });
});
