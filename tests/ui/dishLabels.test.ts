import { describe, expect, it } from 'vitest';
import {
  DISH_LABEL_TUNING,
  humanEventLabel,
  planDishLabels,
  type DishLabelInput,
  type LabelCulture,
  type LabelEvent,
  type PlannedLabel,
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
    isNew: false,
    ...overrides,
  };
}

function event(overrides: Partial<LabelEvent> & Pick<LabelEvent, 'id' | 'label'>): LabelEvent {
  return { kind: 'caution', pos: [80, 80], radius: 12, ageMs: 100, isGoal: false, ...overrides };
}

function input(overrides: Partial<DishLabelInput> = {}): DishLabelInput {
  return {
    cultures: [],
    events: [],
    gridSize: 160,
    dishPx: 400,
    pingId: null,
    compact: false,
    ...overrides,
  };
}

const PX = 400 / 160;

function labelRect(label: PlannedLabel) {
  const w = label.text.length * DISH_LABEL_TUNING.charPx + DISH_LABEL_TUNING.chromePx + (label.icon ? 12 : 0);
  const h = DISH_LABEL_TUNING.heightPx;
  const x = (label.xPct / 100) * 400 - w / 2;
  const anchor = (label.yPct / 100) * 400;
  const y = label.placement.startsWith('above') ? anchor - h : anchor;
  return { x, y, w, h };
}

function coversCulture(label: PlannedLabel, c: LabelCulture): boolean {
  const r = Math.sqrt(c.vol / Math.PI) * PX;
  const rect = labelRect(label);
  const cx = c.center[0] * PX;
  const cy = c.center[1] * PX;
  return rect.x < cx + r && cx - r < rect.x + rect.w && rect.y < cy + r && cy - r < rect.y + rect.h;
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

  it('marks a strain new only when the caller says it was just found', () => {
    const plan = planDishLabels(input({
      cultures: [
        culture({ id: 2, center: [30, 30] }),
        culture({ id: 3, strainKey: 'needle_swarm', name: 'Needle Swarm', isNew: true, center: [120, 120] }),
      ],
    }));
    expect(plan.find((label) => label.cultureId === 2)?.kind).toBe('strain');
    const fresh = plan.find((label) => label.cultureId === 3)!;
    expect(fresh.kind).toBe('new');
    expect(fresh.text).toBe('New · Needle Swarm');
  });

  it('pings the culture under a tap (or a just-planted egg) even below the size floor', () => {
    const plan = planDishLabels(input({
      pingId: 2,
      cultures: [
        culture({ id: 2, center: [20, 20], vol: 6 }),
        culture({ id: 3, center: [140, 140], vol: 400 }),
      ],
    }));
    const ping = plan.find((label) => label.kind === 'ping')!;
    expect(ping.cultureId).toBe(2);
    expect(ping.text).toBe('Swarmlet');
    // The ping replaces the strain's own tag: never two "Swarmlet" tags.
    expect(plan.filter((label) => label.text === 'Swarmlet')).toHaveLength(1);
  });

  it('caps strain tags: fewer on compact phones', () => {
    const many = Array.from({ length: 12 }, (_, index) => culture({
      id: index + 2,
      strainKey: `strain-${index}`,
      name: `Strain ${index}`,
      center: [10 + (index % 4) * 40, 15 + Math.floor(index / 4) * 50],
      vol: 40,
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
        culture({ id: 5, strainKey: 'sniper', name: 'Sniper', center: [80, 80], vol: 80 }),
        culture({ id: 6, strainKey: 'mirror', name: 'Mirror', center: [80, 80], vol: 70 }),
      ],
    }));
    expect(plan[0]).toMatchObject({ text: 'Bloom Mass', placement: 'above' });
    expect(plan.map((label) => label.text)).not.toContain('Mirror');
  });

  it('falls back to a strain\'s next-largest culture when its largest has no room', () => {
    const plan = planDishLabels(input({
      cultures: [
        culture({ id: 2, strainKey: 'bloom_mass', name: 'Bloom Mass', isGoal: true, center: [80, 80], vol: 100 }),
        culture({ id: 3, strainKey: 'bruiser', name: 'Bruiser', center: [80, 80], vol: 90 }),
        culture({ id: 4, strainKey: 'mirror', name: 'Mirror', center: [80, 80], vol: 85 }),
        culture({ id: 5, strainKey: 'sniper', name: 'Sniper', center: [80, 80], vol: 80 }),
        culture({ id: 6, strainKey: 'swarmlet', name: 'Swarmlet', center: [80, 80], vol: 70 }),
        culture({ id: 7, strainKey: 'swarmlet', name: 'Swarmlet', center: [30, 140], vol: 40 }),
      ],
    }));
    const swarmlet = plan.find((label) => label.text === 'Swarmlet');
    expect(swarmlet?.cultureId).toBe(7);
  });

  it('keeps tags off culture bodies when a clear side is free', () => {
    const cultures = [
      culture({ id: 2, strainKey: 'swarmlet', name: 'Swarmlet', center: [80, 90], vol: 300 }),
      culture({ id: 3, strainKey: 'bruiser', name: 'Bruiser', center: [80, 64], vol: 200 }),
    ];
    const plan = planDishLabels(input({ cultures }));
    for (const label of plan) {
      for (const c of cultures) expect(coversCulture(label, c), `${label.text} over ${c.name}`).toBe(false);
    }
  });

  it('holds a tag\'s previous side so busy dishes do not flicker', () => {
    const cultures = [culture({ id: 2, center: [80, 80], vol: 100 })];
    const plan = planDishLabels(input({ cultures, previous: new Map([['strain-swarmlet', 'below']]) }));
    expect(plan[0]!.placement).toBe('below');
  });

  it('keeps tags inside the dish at the edges', () => {
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
    expect(plan.find((label) => label.cultureId === 2)?.placement.startsWith('below')).toBe(true);
    expect(plan.find((label) => label.cultureId === 3)?.placement.startsWith('above')).toBe(true);
  });

  it('puts callouts beside the event, never on top of the culture it names', () => {
    const bloom = culture({ id: 5, strainKey: 'bloom_mass', name: 'Bloom Mass', isGoal: true, center: [80, 80], vol: 250 });
    const plan = planDishLabels(input({
      cultures: [bloom],
      events: [event({ id: 9, kind: 'discovery', label: 'NEW STRAIN: Bloom Mass', pos: [80, 80], radius: 14 })],
    }));
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ kind: 'event', text: 'New strain: Bloom Mass' });
    expect(coversCulture(plan[0]!, bloom)).toBe(false);
  });

  it('ranks the goal\'s own reaction first, folds duplicates and stacks same-spot callouts', () => {
    const plan = planDishLabels(input({
      events: [
        event({ id: 7, kind: 'mutation', label: 'VISIBLE MUTATION', pos: [80, 80], ageMs: 50 }),
        event({ id: 8, kind: 'mutation', label: 'VISIBLE MUTATION', pos: [40, 40], ageMs: 60 }),
        event({ id: 9, kind: 'stabilize', label: 'Reaction: Nutrient Conduit discovered.', pos: [80, 80], ageMs: 400, isGoal: true }),
        event({ id: 10, kind: 'critical', label: 'Flare reaction: Bitter Bloom discovered. FLASH', pos: [80, 80], ageMs: 0 }),
        event({ id: 11, kind: 'stabilize', label: 'AGAR BLOOM', pos: [40, 40], ageMs: DISH_LABEL_TUNING.eventMs + 1 }),
      ],
    }));
    const events = plan.filter((label) => label.kind === 'event');
    expect(events.map((label) => label.text)).toEqual(['Reaction: Nutrient Conduit', 'Mutation']);
    expect(events[0]!.placement).not.toBe(events[1]!.placement);
  });
});

describe('humanEventLabel', () => {
  it('turns marker labels into short sentence-case callouts', () => {
    expect(humanEventLabel('PREDATOR OUTBREAK')).toBe('Predator outbreak');
    expect(humanEventLabel('VISIBLE MUTATION')).toBe('Mutation');
    expect(humanEventLabel('ROGUE CHEMICAL')).toBe('Rogue chemical');
    expect(humanEventLabel('NEW STRAIN: Bloom Mass')).toBe('New strain: Bloom Mass');
    expect(humanEventLabel('Flare reaction: Bitter Bloom discovered.')).toBe('Reaction: Bitter Bloom');
    expect(humanEventLabel('Reaction: Brine Channel discovered.')).toBe('Reaction: Brine Channel');
    expect(humanEventLabel('FOLDING FAULT: Folding Fault discovered.')).toBe('Folding fault');
    expect(humanEventLabel('FOLDING FAULT: Velvet Prison discovered.')).toBe('Folding fault: Velvet Prison');
    expect(humanEventLabel('WATER DILUTED ACID')).toBe('Water diluted acid');
    expect(humanEventLabel('AGAR BLOOM')).toBe('Fertile patch');
    expect(humanEventLabel('BLOOM REACTION')).toBe('Growth burst');
  });

  it('suppresses the duplicate flash and spark markers', () => {
    expect(humanEventLabel('PREDATOR OUTBREAK FLASH')).toBeNull();
    expect(humanEventLabel('Foam reaction: Foam Lightning discovered. SPARK')).toBeNull();
  });
});
