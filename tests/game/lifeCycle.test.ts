import { describe, expect, it } from 'vitest';
import { createArena, type Arena } from '../../src/game/arena';
import { applyAppetite, applyMetabolism, createLifeCycleState } from '../../src/game/lifeCycle';
import { ECOSYSTEM_LIMITS, LIFE_CYCLE_PROFILES, type LifeCycleProfileId } from '../../src/content/ecologyTuning';

const profile = LIFE_CYCLE_PROFILES.culture;
const tickInput = { moveVec: [0, 0] as [number, number], shouldFire: false, shouldEngulf: false };

function dish(enemies: Parameters<typeof createArena>[0]['enemies'], lifeCycle: LifeCycleProfileId = 'culture'): Arena {
  return createArena({
    LX: 100,
    LY: 100,
    seed: 31,
    player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
    enemies,
    wrap: false,
    mode: 'ecosystem',
    fightIndex: 6,
    worldEventIntensity: 0,
    lifeCycle,
  });
}

const BRUISER = { archetype: 'bruiser' as const, targetVol: 200, speed: 8, engulfMultiplier: 6.5 };
const SWARMLET = { archetype: 'swarmlet' as const, targetVol: 120, speed: 12, engulfMultiplier: 4 };

describe('culture life cycle', () => {
  it('lets hunters engulf until they divide, and keeps fed grazers from hunting', () => {
    const arena = dish([BRUISER, SWARMLET]);
    const life = createLifeCycleState();
    const hunter = arena.state.cells.get(2)!;
    const grazer = arena.state.cells.get(3)!;
    for (const cell of [hunter, grazer]) {
      cell.intent.engulfMultiplier = 6;
      cell.intent.speed = 10;
    }

    applyAppetite(arena.state, arena.archetypes, profile, life, 100);

    expect(hunter.intent.engulfMultiplier).toBeGreaterThan(1);
    expect(grazer.intent.engulfMultiplier).toBe(1);
    expect(grazer.intent.speed).toBeCloseTo(10 * profile.satedSpeed);
  });

  it('rests a hunter while it digests', () => {
    const arena = dish([BRUISER]);
    const life = createLifeCycleState();
    const hunter = arena.state.cells.get(2)!;
    hunter.intent.engulfMultiplier = 6;
    life.digestUntil.set(2, 200);

    applyAppetite(arena.state, arena.archetypes, profile, life, 150);

    expect(hunter.intent.engulfMultiplier).toBe(1);
  });

  it('feeds grazers from the agar while hunters only burn', () => {
    const arena = dish([BRUISER, SWARMLET]);
    const life = createLifeCycleState();

    applyMetabolism(arena.state, arena.archetypes, profile, life);

    expect(arena.state.cells.get(3)!.targetVol).toBeGreaterThan(SWARMLET.targetVol);
    expect(arena.state.cells.get(2)!.targetVol).toBeLessThan(BRUISER.targetVol);
  });

  it('lets a hatchling live on its yolk, then burn like any hunter', () => {
    const arena = dish([BRUISER]);
    const life = createLifeCycleState();
    life.yolkUntil.set(2, 100);

    applyMetabolism(arena.state, arena.archetypes, profile, life, 50);
    expect(arena.state.cells.get(2)!.targetVol).toBe(BRUISER.targetVol);

    applyMetabolism(arena.state, arena.archetypes, profile, life, 100);
    expect(arena.state.cells.get(2)!.targetVol).toBeLessThan(BRUISER.targetVol);
    expect(life.yolkUntil.has(2)).toBe(false);
  });

  it('keeps a Bruiser planted from an Egg alive past the old 20-second starvation', () => {
    // A dish with nothing to eat, not even the control sample.
    const arena = createArena({
      LX: 100, LY: 100, seed: 31, wrap: false, mode: 'ecosystem', fightIndex: 6,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [], worldEventIntensity: 0, lifeCycle: 'culture', includeControlSample: false,
    });
    expect(arena.applyTool('egg', [80, 20], { eggArchetype: 'bruiser' })).toBe(true);
    const [id, spawn] = [...arena.archetypes.entries()].find(([, s]) => s.archetype === 'bruiser')!;
    for (let i = 0; i < 60 * 22; i++) arena.tick(tickInput);
    // Without the yolk it would be starving (target held at zero) by now.
    expect(arena.state.cells.get(id)!.targetVol).toBeGreaterThan(spawn.targetVol * 0.5);
  });

  it('refuses an egg once the dish holds as many cultures as it can', () => {
    const full = Array.from({ length: ECOSYSTEM_LIMITS.maxPopulation }, () => ({ ...SWARMLET, targetVol: 40 }));
    const arena = createArena({
      LX: 100, LY: 100, seed: 31, wrap: false, mode: 'ecosystem', fightIndex: 6,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: full, worldEventIntensity: 0, lifeCycle: 'culture', includeControlSample: false,
    });
    expect(arena.applyTool('egg', [50, 50], { eggArchetype: 'swarmlet' })).toBe(false);
    expect([...arena.archetypes.keys()]).toHaveLength(ECOSYSTEM_LIMITS.maxPopulation);
  });

  it('dissolves a starved culture', () => {
    const arena = dish([SWARMLET]);
    const life = createLifeCycleState();
    arena.state.cells.get(2)!.targetVol = SWARMLET.targetVol * profile.starveBelow * 0.5;

    applyMetabolism(arena.state, arena.archetypes, profile, life);
    applyMetabolism(arena.state, arena.archetypes, profile, life);

    expect(life.starving.has(2)).toBe(true);
    expect(arena.state.cells.get(2)!.targetVol).toBe(0);
  });

  it('divides a culture that has doubled into two of the same strain', () => {
    const arena = dish([SWARMLET]);
    arena.state.cells.get(2)!.targetVol = SWARMLET.targetVol * (profile.divideAt + 0.1);
    for (let t = 0; t < 60 * 8; t++) arena.tick(tickInput);

    const swarmlets = [...arena.archetypes].filter(([id, spawn]) => spawn.archetype === 'swarmlet' && arena.state.cells.get(id)!.vol > 0);
    expect(swarmlets.length).toBeGreaterThanOrEqual(2);
  });

  it('never divides cultures in the death-match profile', () => {
    const arena = dish([SWARMLET], 'arena');
    arena.state.cells.get(2)!.targetVol = SWARMLET.targetVol * (profile.divideAt + 0.1);
    for (let t = 0; t < 60 * 8; t++) arena.tick(tickInput);

    // The arena's own reseeding may add cultures, but nothing halves this one.
    expect(arena.state.cells.get(2)!.targetVol).toBeGreaterThanOrEqual(SWARMLET.targetVol * profile.divideAt);
  });

  it('spares kin: a lone strain has nothing to chase', () => {
    for (const [lifeCycle, chases] of [['culture', false], ['arena', true]] as const) {
      const arena = dish([SWARMLET, SWARMLET], lifeCycle);
      arena.state.cells.get(1)!.center = [90, 10];
      arena.state.cells.get(2)!.center = [20, 50];
      arena.state.cells.get(3)!.center = [70, 50];
      arena.tick(tickInput);

      const [vx, vy] = arena.state.cells.get(2)!.intent.vec;
      expect(Math.hypot(vx, vy) > 0).toBe(chases);
    }
  });
});
