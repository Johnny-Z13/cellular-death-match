import { describe, it, expect } from 'vitest';
import { createArena } from '../../src/game/arena';

describe('createArena — initial state', () => {
  it('starts with status "running"', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 150, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
    });
    expect(arena.getStatus()).toBe('running');
  });

  it('exposes state with two cells', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 150, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
    });
    expect(arena.state.cells.size).toBe(2);
  });
});

describe('arena.getStatus — win/loss', () => {
  it('reports "won" when all non-player cells have vol 0', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 150, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
    });
    // Force the bruiser to vol 0.
    const bruiser = arena.state.cells.get(2)!;
    bruiser.vol = 0;
    expect(arena.getStatus()).toBe('won');
  });

  it('reports "lost" when player has vol 0', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 150, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
    });
    const player = arena.state.cells.get(1)!;
    player.vol = 0;
    expect(arena.getStatus()).toBe('lost');
  });

  it('reports "lost" with priority over "won" when both are 0', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 150, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
    });
    arena.state.cells.get(1)!.vol = 0;
    arena.state.cells.get(2)!.vol = 0;
    expect(arena.getStatus()).toBe('lost');
  });
});

describe('arena ecosystem mode', () => {
  it('does not end when all non-player cells are gone before epoch timer', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 150, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 3,
    });
    arena.state.cells.get(2)!.vol = 0;
    expect(arena.getStatus()).toBe('running');
  });

  it('wins after the epoch timer completes', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 150, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 1,
      objective: {
        kind: 'preserve_grazers',
        name: 'Test Preserve',
        description: 'Preserve cultures.',
        target: '2 protected cultures at deadline',
        minCount: 2,
      },
    });
    arena.applyTool('egg', [10, 10]);
    arena.applyTool('egg', [20, 10]);
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    expect(arena.getStatus()).toBe('won');
    expect(arena.getEcology().progress).toBe(1);
  });

  it('fails a species-breeding objective at the deadline instead of idling forever', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: { targetVol: 300, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 80, speed: 8, engulfMultiplier: 4 },
        { archetype: 'swarmlet' as const, targetVol: 80, speed: 8, engulfMultiplier: 4 },
      ],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 2,
      objective: {
        kind: 'breed_archetype',
        name: 'Test Breed Snipers',
        description: 'Breed snipers.',
        target: '3 living Snipers',
        archetype: 'sniper',
        targetCount: 3,
      },
    });
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    expect(arena.getStatus()).toBe('running');
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    expect(arena.getStatus()).toBe('lost');
  });

  it('periodically resupplies depleted tools in ecosystem mode', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        eggCharges: 1,
        nutrientCharges: 1,
        toxinCharges: 1,
      },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 150, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
      objective: {
        kind: 'preserve_grazers',
        name: 'Test Preserve',
        description: 'Preserve cultures.',
        target: '1 protected culture at deadline',
        minCount: 1,
      },
    });
    expect(arena.applyTool('nutrient', [10, 10])).toBe(true);
    expect(arena.getToolStates().nutrient.charges).toBe(0);
    for (let i = 0; i < 60 * 11; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }
    expect(arena.getToolStates().nutrient.charges).toBe(1);
    expect(arena.getEcology().supplyDrops).toBe(1);
  });

  it('replenishes one egg early when eggs are empty and the dish is quiet', () => {
    const arena = createArena({
      LX: 60,
      LY: 60,
      seed: 2,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        eggCharges: 1,
        nutrientCharges: 1,
        toxinCharges: 1,
      },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 90, speed: 8, engulfMultiplier: 4 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    arena.state.cells.get(2)!.vol = 0;
    expect(arena.applyTool('egg', [10, 10])).toBe(true);
    expect(arena.getToolStates().egg.charges).toBe(0);
    expect(arena.getEcology().livingEnemies).toBe(1);

    for (let i = 0; i < 60 * 8; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }

    expect(arena.getToolStates().egg.charges).toBe(1);
    expect(arena.getEcology().supplyDrops).toBe(1);
  });

  it('does not replenish eggs early while multiple lifeforms are active', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 3,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        eggCharges: 1,
        nutrientCharges: 1,
        toxinCharges: 1,
      },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 90, speed: 8, engulfMultiplier: 4 },
        { archetype: 'bruiser' as const, targetVol: 150, speed: 6, engulfMultiplier: 6 },
      ],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    expect(arena.applyTool('egg', [10, 10])).toBe(true);
    expect(arena.getToolStates().egg.charges).toBe(0);
    for (const [id, cell] of arena.state.cells) {
      if (id === 1) continue;
      cell.vol = 260;
      cell.targetVol = 260;
    }

    for (let i = 0; i < 60 * 8; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }

    expect(arena.getEcology().livingEnemies).toBeGreaterThanOrEqual(2);
    expect(arena.getToolStates().egg.charges).toBe(0);
    expect(arena.getEcology().supplyDrops).toBe(0);
  });

  it('ends the epoch immediately as won when the current objective is satisfied', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 150, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
      objective: {
        kind: 'preserve_grazers',
        name: 'Test Preserve',
        description: 'Preserve one cell.',
        target: '1 protected culture at deadline',
        minCount: 1,
      },
    });

    expect(arena.getStatus()).toBe('running');
    expect(arena.endEpochNow()).toBe('won');
    expect(arena.getStatus()).toBe('won');
  });

  it('ends the epoch immediately as lost when the current objective is not satisfied', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 150, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
      objective: {
        kind: 'preserve_grazers',
        name: 'Test Preserve',
        description: 'Preserve one cell.',
        target: '1 protected culture at deadline',
        minCount: 1,
      },
    });
    arena.state.cells.get(2)!.vol = 0;

    expect(arena.endEpochNow()).toBe('lost');
    expect(arena.getStatus()).toBe('lost');
  });

  it('agitation spends a charge and mixes living cell movement for a short pulse', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 11,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 120, speed: 8, engulfMultiplier: 4 },
        { archetype: 'bruiser' as const, targetVol: 180, speed: 6, engulfMultiplier: 6 },
      ],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });

    expect(arena.getAgitationState()).toEqual({ charges: 2, maxCharges: 2, activeTicks: 0 });
    expect(arena.agitate()).toBe(true);
    expect(arena.getAgitationState().charges).toBe(1);
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });

    const movedCells = Array.from(arena.state.cells.values()).filter((cell) => (
      cell.vol > 0
      && Math.hypot(cell.intent.vec[0], cell.intent.vec[1]) > 0.9
      && cell.intent.speed >= 18
    ));
    expect(movedCells.length).toBeGreaterThanOrEqual(2);
    expect(arena.getAgitationState().activeTicks).toBe(89);
  });

  it('uses upgraded agitation charge capacity from player config', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 12,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3, agitationCharges: 3 },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 120, speed: 8, engulfMultiplier: 4 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });

    expect(arena.getAgitationState()).toEqual({ charges: 3, maxCharges: 3, activeTicks: 0 });
  });

  it('seeds an egg near the click when the clicked cell is occupied', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        eggCharges: 1,
      },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 150, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const livingBefore = arena.getEcology().livingEnemies;
    const playerCenter = arena.state.cells.get(1)!.center;
    expect(arena.applyTool('egg', playerCenter)).toBe(true);
    expect(arena.getToolStates().egg.charges).toBe(0);
    expect(arena.getEcology().livingEnemies).toBe(livingBefore + 1);
    const seeded = Array.from(arena.state.cells)
      .filter(([id, cell]) => id !== 1 && id !== 2 && cell.vol > 0);
    expect(seeded.length).toBe(1);
  });

  it('leaves a visible hatch pulse when an egg seeds a lifeform', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 20,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        eggCharges: 1,
      },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 90, speed: 12, engulfMultiplier: 4 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    expect(arena.applyTool('egg', [10, 10], { eggArchetype: 'splitter' })).toBe(true);
    expect(arena.getToolEffects().some((effect) => effect.type === 'hatch')).toBe(true);
  });

  it('uses the selected egg archetype when seeding lifeforms', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        eggCharges: 1,
      },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 150, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    expect(arena.applyTool('egg', [10, 10], { eggArchetype: 'sniper' })).toBe(true);
    const spawned = Array.from(arena.archetypes)
      .find(([id]) => id !== 2);
    expect(spawned?.[1].archetype).toBe('sniper');
  });

  it('makes nutrients strongly catalyze nearby lifeform growth', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 7,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        nutrientCharges: 1,
      },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 100, speed: 8, engulfMultiplier: 4 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;
    cell.targetVol = 100;
    const before = cell.targetVol;
    expect(arena.applyTool('nutrient', cell.center)).toBe(true);
    for (let i = 0; i < 30; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }
    expect(cell.targetVol - before).toBeGreaterThan(80);
  });

  it('makes toxins produce a strong flee vector for nearby lifeforms', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 8,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        toxinCharges: 1,
      },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 120, speed: 8, engulfMultiplier: 4 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;
    const toxinPos: [number, number] = [cell.center[0] + 6, cell.center[1]];
    expect(arena.applyTool('toxin', toxinPos)).toBe(true);
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    expect(cell.intent.vec[0]).toBeLessThan(-0.8);
    expect(Math.abs(cell.intent.vec[1])).toBeLessThan(0.25);
    expect(cell.intent.speed).toBeGreaterThan(9);
  });

  it('lets propagators prefer compatible swarmlets over closer predators', () => {
    const arena = createArena({
      LX: 100,
      LY: 100,
      seed: 13,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'splitter' as const, targetVol: 150, speed: 8, engulfMultiplier: 6 },
        { archetype: 'bruiser' as const, targetVol: 150, speed: 8, engulfMultiplier: 6 },
        { archetype: 'swarmlet' as const, targetVol: 120, speed: 8, engulfMultiplier: 4 },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const player = arena.state.cells.get(1)!;
    const splitter = arena.state.cells.get(2)!;
    const bruiser = arena.state.cells.get(3)!;
    const swarmlet = arena.state.cells.get(4)!;
    player.center = [94, 94];
    splitter.center = [50, 50];
    bruiser.center = [55, 50];
    swarmlet.center = [50, 70];
    splitter.vol = 150;
    bruiser.vol = 150;
    swarmlet.vol = 120;

    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });

    expect(splitter.intent.vec[1]).toBeGreaterThan(0.65);
    expect(Math.abs(splitter.intent.vec[0])).toBeLessThan(0.35);
  });

  it('names mutation traits and exposes ecology signals', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 14,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 120, speed: 8, engulfMultiplier: 4 }],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });

    for (let i = 0; i < 60 * 10; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }

    const spawn = arena.archetypes.get(2)!;
    expect(spawn.traits?.length).toBeGreaterThanOrEqual(1);
    expect(arena.getEcology().signals.some((signal) => signal.includes('mutation'))).toBe(true);
  });

  it('makes eggs inherit budding traits inside nutrient fields', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 15,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        eggCharges: 1,
        nutrientCharges: 1,
      },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 120, speed: 8, engulfMultiplier: 4 }],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });

    expect(arena.applyTool('nutrient', [30, 30])).toBe(true);
    expect(arena.applyTool('egg', [30, 30], { eggArchetype: 'splitter' })).toBe(true);

    const spawned = Array.from(arena.archetypes)
      .find(([id]) => id !== 2)?.[1];
    expect(spawned?.traits).toContain('budding');
    expect(arena.getEcology().signals.some((signal) => signal.includes('Nutrient egg'))).toBe(true);
  });

  it('makes eggs inherit toxin resistance inside toxin fields', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 16,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        eggCharges: 1,
        toxinCharges: 1,
      },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 120, speed: 8, engulfMultiplier: 4 }],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });

    expect(arena.applyTool('toxin', [32, 32])).toBe(true);
    expect(arena.applyTool('egg', [32, 32], { eggArchetype: 'bruiser' })).toBe(true);

    const spawned = Array.from(arena.archetypes)
      .find(([id]) => id !== 2)?.[1];
    expect(spawned?.traits).toContain('toxin_resistant');
    expect(arena.getEcology().signals.some((signal) => signal.includes('Toxin egg'))).toBe(true);
  });

  it('spreads active tool fields when agitation is used', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 17,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        nutrientCharges: 1,
      },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 120, speed: 8, engulfMultiplier: 4 }],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });

    expect(arena.applyTool('nutrient', [20, 20])).toBe(true);
    expect(arena.getToolEffects()[0]?.radius).toBe(20);
    expect(arena.agitate()).toBe(true);

    expect(arena.getToolEffects()[0]?.radius).toBeGreaterThan(20);
    expect(arena.getEcology().signals.some((signal) => signal.includes('Agitation spread nutrient'))).toBe(true);
  });

  it('starts crisis events during long ecosystem epochs', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 18,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 120, speed: 8, engulfMultiplier: 4 }],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 30,
    });

    for (let i = 0; i < 60 * 18; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }

    expect(arena.getEcology().crisis).not.toBe('none');
    expect(arena.getEcology().signals.some((signal) => signal.includes('Crisis'))).toBe(true);
  });

  it('does not apply tool pressure across dish edges when wrapping is disabled', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 9,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        toxinCharges: 1,
      },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 120, speed: 8, engulfMultiplier: 4 }],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;
    cell.center = [78, 40];
    cell.targetVol = 120;

    expect(arena.applyTool('toxin', [1, 40])).toBe(true);

    expect(cell.targetVol).toBe(120);
  });

  it('lets a controlled reagent reaction satisfy the catalysis objective before the deadline', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 5,
      player: {
        targetVol: 320,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        eggCharges: 0,
        nutrientCharges: 1,
        toxinCharges: 0,
        waterCharges: 1,
      },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 95, speed: 8, engulfMultiplier: 3 },
        { archetype: 'swarmlet' as const, targetVol: 95, speed: 8, engulfMultiplier: 3 },
      ],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 55,
      objective: {
        kind: 'controlled_reaction',
        name: 'Test Catalysis',
        description: 'Trigger a reaction.',
        target: '1 reaction',
        targetCount: 1,
        minCoverage: 0.01,
      },
    });
    const target = arena.state.cells.get(2)!;
    expect(arena.applyTool('nutrient', target.center)).toBe(true);
    expect(arena.applyTool('water', target.center)).toBe(true);
    for (let i = 0; i < 60 * 25 && arena.getStatus() === 'running'; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }
    expect(arena.getObjectiveProgress().summary).toContain('reaction');
    expect(arena.getStatus()).toBe('won');
  });

  it('loads extra reagent tools so the player has activity after eggs run low', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
      },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 120, speed: 12, engulfMultiplier: 4 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const tools = arena.getToolStates() as Record<string, { charges: number; maxCharges: number }>;
    expect(tools.water).toEqual({ charges: 6, maxCharges: 6 });
    expect(tools.salt).toEqual({ charges: 4, maxCharges: 4 });
    expect(tools.acid).toEqual({ charges: 3, maxCharges: 3 });
  });

  it('makes salt desiccate nearby organisms and damp their movement', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 12,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
      },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 140, speed: 12, engulfMultiplier: 4 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;
    const beforeTarget = cell.targetVol;
    expect(arena.applyTool('salt' as never, cell.center)).toBe(true);
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    expect(cell.targetVol).toBeLessThan(beforeTarget);
    expect(cell.intent.speed).toBeLessThan(8);
  });

  it('makes acid burn pixels immediately for decisive mad-science interventions', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 13,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
      },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 450, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;
    const beforeVol = cell.vol;
    expect(arena.applyTool('acid' as never, cell.center)).toBe(true);
    expect(cell.vol).toBeLessThan(beforeVol);
  });

  it('creates a named reaction field when water floods nutrient medium', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 14,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
      },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 100, speed: 12, engulfMultiplier: 4 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;
    expect(arena.applyTool('nutrient', cell.center)).toBe(true);
    expect(arena.applyTool('water' as never, cell.center)).toBe(true);
    expect(arena.getToolEffects().some((effect) => effect.type === 'bloom')).toBe(true);
  });

  it('lets water extend nutrient fields into a conduit', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 210,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 120, speed: 8, engulfMultiplier: 4, traits: ['budding'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('nutrient', cell.center)).toBe(true);
    expect(arena.applyTool('water', [cell.center[0] + 4, cell.center[1]])).toBe(true);

    const conduit = arena.getToolEffects().find((effect) => effect.type === 'conduit');
    expect(conduit).toBeDefined();
    expect(arena.getEcology().signals.some((signal) => signal.includes('water carried nutrient'))).toBe(true);
  });

  it('lets water soften acid pressure when used after a flare', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 211,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 120, speed: 8, engulfMultiplier: 4 }],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('acid', cell.center)).toBe(true);
    const acidBefore = arena.getToolEffects().find((effect) => effect.type === 'acid')!;
    expect(arena.applyTool('water', cell.center)).toBe(true);
    const acidAfter = arena.getToolEffects().find((effect) => effect.type === 'acid')!;

    expect(acidAfter.radius).toBeGreaterThan(acidBefore.radius);
    expect(acidAfter.ttl).toBeLessThanOrEqual(acidBefore.ttl);
    expect(arena.getEcology().signals.some((signal) => signal.includes('water diluted'))).toBe(true);
  });

  it('creates a critical acid toxin flare near fragile life', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 220,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'sniper' as const, targetVol: 140, speed: 10, engulfMultiplier: 1, traits: ['fragile'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('acid', cell.center)).toBe(true);
    expect(arena.applyTool('toxin', cell.center)).toBe(true);

    expect(arena.getToolEffects().some((effect) => effect.type === 'flare')).toBe(true);
    expect(arena.getEcology().signals.some((signal) => signal.includes('CATALYTIC FLARE'))).toBe(true);
    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_acid_toxin_flare');
  });

  it('creates a crystal reaction from salt and water near gelatinous life', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 221,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'bruiser' as const, targetVol: 260, speed: 8, engulfMultiplier: 6, traits: ['gelatinous'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('salt', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);

    expect(arena.getToolEffects().some((effect) => effect.type === 'crystal')).toBe(true);
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    expect(cell.intent.speed).toBeLessThanOrEqual(2.6);
  });

  it('discovers needle swarm from sniper pressure and swarmlet crowding', () => {
    const arena = createArena({
      LX: 90,
      LY: 90,
      seed: 230,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'sniper' as const, targetVol: 140, speed: 10, engulfMultiplier: 1 },
        { archetype: 'swarmlet' as const, targetVol: 90, speed: 14, engulfMultiplier: 4 },
        { archetype: 'swarmlet' as const, targetVol: 90, speed: 14, engulfMultiplier: 4 },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });

    for (let i = 0; i < 90; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }

    expect(arena.getEcology().discoveries.breedIds).toContain('needle_swarm');
    expect(Array.from(arena.archetypes.values()).some((spawn) => spawn.breedId === 'needle_swarm')).toBe(true);
  });

  it('discovers Bloom Mass from close Swarmlet and Splitter cultures in nutrient medium', () => {
    const arena = createArena({
      LX: 90,
      LY: 90,
      seed: 260,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        nutrientCharges: 1,
      },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 120, speed: 12, engulfMultiplier: 4 },
        { archetype: 'splitter' as const, targetVol: 260, speed: 8, engulfMultiplier: 6 },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const swarmlet = arena.state.cells.get(2)!;
    const splitter = arena.state.cells.get(3)!;
    swarmlet.center = [42, 44];
    splitter.center = [50, 44];

    expect(arena.applyTool('nutrient', [46, 44])).toBe(true);
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });

    expect(arena.getEcology().discoveries.breedIds).toContain('bloom_mass');
    expect(arena.getEcology().discoveries.latest[0]).toContain('NEW LIFEFORM CREATED: Bloom Mass');
  });

  it('completes the first discovery objective after showcasing the new lifeform', () => {
    const arena = createArena({
      LX: 90,
      LY: 90,
      seed: 261,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        nutrientCharges: 1,
      },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 120, speed: 12, engulfMultiplier: 4 },
        { archetype: 'splitter' as const, targetVol: 260, speed: 8, engulfMultiplier: 6 },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
      objective: {
        kind: 'discover_breed',
        name: 'Create a New Lifeform',
        description: 'Create Bloom Mass.',
        target: 'Bloom Mass created',
        hint: 'Plant Swarmlet and Splitter close together, then feed the area with Nutrient.',
        breedId: 'bloom_mass',
      },
    });
    arena.state.cells.get(2)!.center = [42, 44];
    arena.state.cells.get(3)!.center = [50, 44];

    expect(arena.applyTool('nutrient', [46, 44])).toBe(true);
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    expect(arena.getObjectiveProgress().status).toBe('running');

    for (let i = 0; i < 90; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }

    expect(arena.getObjectiveProgress().status).toBe('satisfied');
    expect(arena.getStatus()).toBe('won');
  });

  it('discovers glass antibody from acid toxin flare survivors', () => {
    const arena = createArena({
      LX: 90,
      LY: 90,
      seed: 231,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        {
          archetype: 'swarmlet' as const,
          targetVol: 150,
          speed: 10,
          engulfMultiplier: 4,
          traits: ['toxin_resistant', 'fragile'],
        },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('acid', cell.center)).toBe(true);
    expect(arena.applyTool('toxin', cell.center)).toBe(true);
    for (let i = 0; i < 20; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }

    expect(arena.getEcology().discoveries.breedIds).toContain('glass_antibody');
  });

  it('spawns a folding fault when agitation amplifies overlapping reactions', () => {
    const arena = createArena({
      LX: 90,
      LY: 90,
      seed: 240,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        nutrientCharges: 1,
        waterCharges: 1,
        agitationCharges: 1,
      },
      enemies: [
        { archetype: 'boss' as const, targetVol: 900, speed: 6, engulfMultiplier: 6, traits: ['gelatinous'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('nutrient', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);
    expect(arena.agitate()).toBe(true);

    expect(arena.getToolEffects().some((effect) => effect.type === 'fold_fault')).toBe(true);
    expect(arena.getEcology().signals.some((signal) => signal.includes('FOLDING FAULT'))).toBe(true);
  });

  it('folding fault grows asymmetric local structure over time', () => {
    const arena = createArena({
      LX: 90,
      LY: 90,
      seed: 241,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        nutrientCharges: 1,
        waterCharges: 1,
        agitationCharges: 1,
      },
      enemies: [
        { archetype: 'bruiser' as const, targetVol: 420, speed: 8, engulfMultiplier: 6, traits: ['gelatinous'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('nutrient', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);
    expect(arena.agitate()).toBe(true);
    const before = cell.targetVol;
    for (let i = 0; i < 90; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }

    expect(cell.targetVol).not.toBe(before);
    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_folding_fault');
  });

  it('periodically drops random reagent accidents in ecosystem mode', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 15,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
      },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 100, speed: 12, engulfMultiplier: 4 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    for (let i = 0; i < 60 * 13; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }
    expect(arena.getEcology().accidents).toBe(1);
    expect(arena.getToolEffects().some((effect) =>
      effect.type === 'water' || effect.type === 'salt' || effect.type === 'acid',
    )).toBe(true);
  });

  it('periodically triggers predator outbreaks from oversized cultures', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 17,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
      },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 520, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 30,
    });
    const beforeLiving = arena.getEcology().livingEnemies;
    expect(arena.getEcology().outbreaks).toBe(0);
    for (let i = 0; i < 60 * 7; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }
    expect(arena.getEcology().outbreaks).toBe(1);
    expect(arena.getEcology().livingEnemies).toBeGreaterThan(beforeLiving);
    expect(arena.getToolEffects().some((effect) => effect.type === 'lysis')).toBe(true);
  });

  it('arms outbreak-spawned hunters with aggressive swarmlet stats', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 18,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
      },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 620, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 30,
    });
    for (let i = 0; i < 60 * 7; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }
    const hunters = Array.from(arena.archetypes)
      .filter(([id]) => id > 2)
      .map(([, spawn]) => spawn);
    const outbreakHunters = hunters.filter((spawn) =>
      spawn.archetype === 'swarmlet' && spawn.speed >= 15 && spawn.engulfMultiplier >= 7,
    );
    expect(outbreakHunters.length).toBeGreaterThanOrEqual(2);
  });

  it('makes mutation cycles assign visible traits and pulse the dish', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 19,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
      },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 130, speed: 12, engulfMultiplier: 4, instability: 3 },
        { archetype: 'splitter' as const, targetVol: 260, speed: 8, engulfMultiplier: 6, instability: 2.8 },
      ],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 30,
    });
    for (let i = 0; i < 60 * 10; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }
    const livingTraits = Array.from(arena.archetypes)
      .filter(([id]) => arena.state.cells.get(id)?.vol ?? 0 > 0)
      .flatMap(([, spawn]) => spawn.traits ?? []);
    expect(livingTraits.length).toBeGreaterThan(0);
    expect(arena.getEcology().mutations).toBeGreaterThan(0);
    expect(arena.getToolEffects().some((effect) => effect.type === 'mutation')).toBe(true);
  });

  it('emits a dish event marker for visible mutations', () => {
    const arena = createArena({
      LX: 90,
      LY: 90,
      seed: 250,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 150, speed: 10, engulfMultiplier: 4, instability: 4 },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });

    for (let i = 0; i < 60 * 10; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }

    expect(arena.getDishEvents().some((event) =>
      event.kind === 'mutation'
      && event.ttl > 0
      && event.maxTtl > event.ttl
      && event.pos.length === 2,
    )).toBe(true);
  });

  it('emits color-coded dish event markers for catalytic reactions', () => {
    const arena = createArena({
      LX: 90,
      LY: 90,
      seed: 251,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 150, speed: 10, engulfMultiplier: 4, traits: ['fragile'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('acid', cell.center)).toBe(true);
    expect(arena.applyTool('toxin', cell.center)).toBe(true);

    expect(arena.getDishEvents().some((event) =>
      event.kind === 'critical'
      && event.color === 'red'
      && event.label.includes('CATALYTIC'),
    )).toBe(true);
  });

  it('does not auto-complete catalysis objectives just because the dish starts sparse', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 16,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
      },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 100, speed: 12, engulfMultiplier: 4 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 2,
      objective: {
        kind: 'controlled_reaction',
        name: 'Test Catalysis',
        description: 'Trigger a reaction.',
        target: '1 reaction',
        targetCount: 1,
        minCoverage: 0.01,
      },
    });
    expect(arena.getStatus()).toBe('running');
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    expect(arena.getStatus()).toBe('running');
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    expect(arena.getStatus()).toBe('lost');
  });
});

describe('arena.tick — applies input', () => {
  it('writes the input intent onto the player cell', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 150, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
    });
    arena.tick({
      moveVec: [1, 0],
      shouldFire: false,
      shouldEngulf: false,
    });
    const player = arena.state.cells.get(1)!;
    expect(player.intent.vec).toEqual([1, 0]);
  });

  it('sets engulfMultiplier > 1 when shouldEngulf is true', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 150, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
    });
    arena.tick({
      moveVec: [0, 0],
      shouldFire: false,
      shouldEngulf: true,
    });
    const player = arena.state.cells.get(1)!;
    expect(player.intent.engulfMultiplier).toBeGreaterThan(1);
  });

  it('decays player targetVol while engulfing', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 150, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
    });
    const before = arena.state.cells.get(1)!.targetVol;
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: true });
    const after = arena.state.cells.get(1)!.targetVol;
    expect(after).toBeLessThan(before);
  });

  it('does not decay targetVol when not engulfing', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 150, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
    });
    const before = arena.state.cells.get(1)!.targetVol;
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    const after = arena.state.cells.get(1)!.targetVol;
    expect(after).toBe(before);
  });

  it('does nothing once status leaves running', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'bruiser' as const, targetVol: 150, speed: 8, engulfMultiplier: 6.5 }],
      wrap: true,
    });
    arena.state.cells.get(2)!.vol = 0;        // forces "won"
    expect(arena.getStatus()).toBe('won');
    const cellsBefore = Array.from(arena.state.grid.cells);
    arena.tick({ moveVec: [1, 1], shouldFire: false, shouldEngulf: false });
    const cellsAfter = Array.from(arena.state.grid.cells);
    expect(cellsAfter).toEqual(cellsBefore);    // grid didn't change
  });
});
