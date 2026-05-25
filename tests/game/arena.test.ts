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
        kind: 'preserve',
        name: 'Test Preserve',
        description: 'Preserve one cell.',
        target: '1 blue lifeform at deadline',
      },
    });
    arena.applyTool('egg', [10, 10]);
    arena.applyTool('egg', [20, 10]);
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    expect(arena.getStatus()).toBe('won');
    expect(arena.getEcology().progress).toBe(1);
  });

  it('fails a cull objective at the deadline instead of idling forever', () => {
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
        kind: 'cull_red',
        name: 'Test Cull',
        description: 'Cull red.',
        target: 'red <= 180, blue >= 2',
      },
    });
    arena.state.cells.get(1)!.vol = 300;
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
        kind: 'preserve',
        name: 'Test Preserve',
        description: 'Preserve blue.',
        target: '1 blue lifeform at deadline',
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

  it('lets focused toxin pressure satisfy the cull objective before the deadline', () => {
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
        nutrientCharges: 0,
        toxinCharges: 4,
      },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 95, speed: 8, engulfMultiplier: 3 },
        { archetype: 'swarmlet' as const, targetVol: 95, speed: 8, engulfMultiplier: 3 },
      ],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 55,
      objective: {
        kind: 'cull_red',
        name: 'Test Cull',
        description: 'Cull red.',
        target: 'red <= 180, blue >= 2',
      },
    });
    const red = arena.state.cells.get(1)!;
    red.vol = 320;
    red.targetVol = 320;
    for (let i = 0; i < 4; i++) {
      expect(arena.applyTool('toxin', red.center)).toBe(true);
    }
    for (let i = 0; i < 60 * 25 && arena.getStatus() === 'running'; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }
    expect(arena.getObjectiveProgress().summary).toContain('red');
    expect(arena.getStatus()).toBe('won');
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
