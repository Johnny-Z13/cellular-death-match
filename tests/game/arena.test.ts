import { describe, it, expect } from 'vitest';
import { createArena, type Arena } from '../../src/game/arena';
import { getCell, setCell, updateBoundaryAround } from '../../src/sim/grid';
import { removePixel } from '../../src/sim/cell';

// Drain every pixel a cell owns, simulating its death mid-epoch.
function killCell(arena: Arena, id: number): void {
  const { grid } = arena.state;
  const cell = arena.state.cells.get(id)!;
  for (let x = 0; x < grid.LX; x++) {
    for (let y = 0; y < grid.LY; y++) {
      if (getCell(grid, x, y) !== id) continue;
      setCell(grid, x, y, 0);
      removePixel(cell, x, y, grid.LX, grid.LY, grid.wrap);
      updateBoundaryAround(grid, x, y);
    }
  }
}

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

  it('can start an onboarding dish without the control sample', () => {
    const arena = createArena({
      LX: 50,
      LY: 50,
      seed: 1,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 85, speed: 16, engulfMultiplier: 3 }],
      wrap: true,
      mode: 'ecosystem',
      includeControlSample: false,
    });

    expect(arena.state.cells.has(1)).toBe(false);
    expect(arena.state.cells.size).toBe(1);
    expect([...arena.archetypes.keys()]).toEqual([2]);
    expect(arena.getEcology().livingEnemies).toBe(1);
    expect(arena.getStatus()).toBe('running');
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

  it('marks an objective complete but keeps running so the player can keep cultivating', () => {
    const arena = createArena({
      LX: 60,
      LY: 60,
      seed: 7,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 90, speed: 12, engulfMultiplier: 4 },
        { archetype: 'swarmlet' as const, targetVol: 90, speed: 12, engulfMultiplier: 4 },
        { archetype: 'swarmlet' as const, targetVol: 90, speed: 12, engulfMultiplier: 4 },
        { archetype: 'swarmlet' as const, targetVol: 90, speed: 12, engulfMultiplier: 4 },
      ],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
      objective: {
        kind: 'breed_archetype',
        name: 'Breed Swarmlets',
        description: 'Raise swarmlets.',
        target: '4 living Swarmlets',
        archetype: 'swarmlet',
        targetCount: 4,
      },
    });
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    const progress = arena.getObjectiveProgress();
    // Objective is met well before the deadline, but the epoch keeps running —
    // the player is not yanked out of a flourishing dish.
    expect(progress.complete).toBe(true);
    expect(arena.getStatus()).toBe('running');
    // They bank the win whenever they choose.
    expect(arena.endEpochNow()).toBe('won');
  });

  it('hatches a chosen discovered breed so the dish cell carries its breed identity', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 31,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 80, speed: 8, engulfMultiplier: 4 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const before = new Set(arena.archetypes.keys());
    // Drop a Vitric Anchor egg (a hybrid). The spawned cell must carry the
    // breedId so the renderer tints it with the breed's identity, not the
    // base archetype's palette.
    expect(arena.applyTool('egg', [40, 40], { eggBreedId: 'vitric_anchor' })).toBe(true);
    const newId = [...arena.archetypes.keys()].find((id) => !before.has(id));
    expect(newId).toBeDefined();
    expect(arena.archetypes.get(newId!)?.breedId).toBe('vitric_anchor');
  });

  it('paste draws a spaced trail of nutrient stamps without evicting catalysis effects', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 21,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 120, speed: 8, engulfMultiplier: 4 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });

    // First stamp starts the stroke; a too-close move is ignored; a far move stamps.
    expect(arena.applyTool('paste', [10, 10])).toBe(true);
    expect(arena.applyTool('paste', [11, 10])).toBe(false); // within stampSpacing
    expect(arena.applyTool('paste', [18, 10])).toBe(true);
    expect(arena.applyTool('paste', [26, 10])).toBe(true);

    const trailStamps = arena.getToolEffects().filter((e) => e.type === 'nutrient');
    expect(trailStamps.length).toBeGreaterThanOrEqual(3);

    // A new stroke starts fresh and pays its opening charge again.
    arena.endPasteStroke();
    expect(arena.applyTool('paste', [40, 40])).toBe(true);
  });

  it('sparks a catalytic reaction when a reagent is dropped onto a paste trail', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 41,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3, waterCharges: 2 },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 80, speed: 8, engulfMultiplier: 4 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    // Draw a paste (nutrient) trail, then drop Water on it → bloom reaction.
    arena.applyTool('paste', [40, 40]);
    arena.applyTool('paste', [46, 40]);
    const reactionsBefore = arena.getEcology().reactions;
    expect(arena.applyTool('water', [43, 40])).toBe(true);
    expect(arena.getEcology().reactions).toBeGreaterThan(reactionsBefore);
    // A bloom reaction effect should now exist among the tool effects.
    expect(arena.getToolEffects().some((e) => e.type === 'bloom')).toBe(true);
  });

  it('paste trail gently feeds a colony along the drawn line', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 22,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 60, speed: 8, engulfMultiplier: 4 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;
    const before = cell.targetVol;
    // Draw a trail across the colony's position.
    const cx = Math.round(cell.center[0]);
    const cy = Math.round(cell.center[1]);
    for (let i = 0; i < 4; i++) arena.applyTool('paste', [cx + i * 6, cy]);
    for (let i = 0; i < 30; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }
    expect(arena.state.cells.get(2)!.targetVol).toBeGreaterThan(before);
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

  it('makes nutrients produce an eager flocking vector for nearby lifeforms', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 71,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        nutrientCharges: 1,
      },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 120, speed: 8, engulfMultiplier: 4 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;
    const nutrientPos: [number, number] = [cell.center[0] + 6, cell.center[1]];
    expect(arena.applyTool('nutrient', nutrientPos)).toBe(true);
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    expect(cell.intent.vec[0]).toBeGreaterThan(0.8);
    expect(Math.abs(cell.intent.vec[1])).toBeLessThan(0.25);
    expect(cell.intent.speed).toBeGreaterThan(8);
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
    expect(cell.intent.speed).toBeGreaterThan(16);
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

    for (let i = 0; i < 60 * 13; i++) {
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
      epochTicks: 60 * 60,
    });

    // Crisis fires after the calm opening window (HAZARD_GRACE_TICKS) at the
    // crisis interval (30s); run past that.
    for (let i = 0; i < 60 * 31; i++) {
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
    // The objective now marks the experiment complete rather than ending the
    // epoch instantly — the player banks it via End or rides out the deadline.
    for (let i = 0; i < 60 * 25 && !arena.getObjectiveProgress().complete; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }
    expect(arena.getObjectiveProgress().summary).toContain('reaction');
    expect(arena.getObjectiveProgress().complete).toBe(true);
    // Still running (not yet at the deadline); banking via End wins it.
    expect(arena.getStatus()).toBe('running');
    expect(arena.endEpochNow()).toBe('won');
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
    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_nutrient_conduit');
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
    expect(arena.getEcology().discoveries.noteIds).toContain('water_dilutes');
  });

  it('records water dilution as a one-time discovery even when repeated', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 212,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 120, speed: 8, engulfMultiplier: 4 }],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('acid', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);
    expect(arena.applyTool('acid', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);

    const discoveries = arena.getEcology().discoveries;
    expect(discoveries.noteIds.filter((id) => id === 'water_dilutes')).toHaveLength(1);
    expect(discoveries.latest.filter((message) => message.includes('water can soften dangerous fields'))).toHaveLength(1);
  });

  it('discovers foam inversion when water destabilizes acid around gelatinous tissue', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 212,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'bruiser' as const, targetVol: 220, speed: 8, engulfMultiplier: 6, traits: ['gelatinous'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('acid', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);

    expect(arena.getToolEffects().some((effect) => effect.type === 'foam')).toBe(true);
    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_acid_water_foam');
    expect(arena.getEcology().signals.some((signal) => signal.includes('Foam Inversion'))).toBe(true);
    expect(arena.getDishEvents().some((event) => (
      event.kind === 'caution' && event.label.includes('FOAM')
    ))).toBe(true);
  });

  it('discovers a rule cascade when salt hits unstable foam', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 213,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'bruiser' as const, targetVol: 220, speed: 8, engulfMultiplier: 6, traits: ['gelatinous'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('acid', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);
    expect(arena.applyTool('salt', cell.center)).toBe(true);

    expect(arena.getToolEffects().some((effect) => effect.type === 'fold_fault')).toBe(true);
    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_foam_salt_rule30');
    expect(arena.getEcology().signals.some((signal) => signal.includes('Rule-30 Cascade'))).toBe(true);
    expect(arena.getDishEvents().some((event) => (
      event.kind === 'fold' && event.label.includes('Rule-30 Cascade')
    ))).toBe(true);
  });

  it('discovers folded anchor when Rule-30 cascade folds gelatinous feeders', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 213,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'bruiser' as const, targetVol: 220, speed: 8, engulfMultiplier: 6, traits: ['gelatinous'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('acid', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);
    expect(arena.applyTool('salt', cell.center)).toBe(true);

    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_foam_salt_rule30');
    expect(arena.getEcology().discoveries.breedIds).toContain('folded_anchor');
    expect(Array.from(arena.archetypes.values()).some((spawn) => spawn.breedId === 'folded_anchor')).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.label.includes('Folded Anchor') && event.kind === 'caution' && event.color === 'amber',
    )).toBe(true);
  });

  it('discovers an agitated chain when shaking an overfed budding culture', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 214,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        nutrientCharges: 2,
        waterCharges: 2,
        agitationCharges: 1,
      },
      enemies: [
        { archetype: 'splitter' as const, targetVol: 220, speed: 8, engulfMultiplier: 5, traits: ['budding'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('nutrient', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);
    expect(arena.getToolEffects().some((effect) => effect.type === 'bloom')).toBe(true);
    expect(arena.agitate()).toBe(true);
    expect(arena.applyTool('nutrient', cell.center)).toBe(true);

    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_agitated_chain');
    expect(arena.getEcology().signals.some((signal) => signal.includes('Agitated Chain'))).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'caution' && event.label.includes('Agitated Chain'),
    )).toBe(true);
  });

  it('discovers bitter bloom when toxin spoils nutrient around budding starter cultures', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 215,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        nutrientCharges: 1,
        toxinCharges: 1,
      },
      enemies: [
        { archetype: 'splitter' as const, targetVol: 220, speed: 8, engulfMultiplier: 5, traits: ['budding'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('nutrient', cell.center)).toBe(true);
    expect(arena.applyTool('toxin', cell.center)).toBe(true);

    expect(arena.getToolEffects().some((effect) => effect.type === 'lysis')).toBe(true);
    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_bitter_bloom');
    expect(arena.getEcology().signals.some((signal) => signal.includes('Bitter Bloom'))).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'caution' && event.label.includes('Bitter Bloom'),
    )).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'caution' && event.label.includes('SPARK') && event.radius < 20,
    )).toBe(true);
  });

  it('flashes pressure bloom when toxin overloads a fed resistant starter culture', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 219,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        nutrientCharges: 1,
        toxinCharges: 1,
      },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 160, speed: 12, engulfMultiplier: 4, traits: ['toxin_resistant'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('nutrient', cell.center)).toBe(true);
    expect(arena.applyTool('toxin', cell.center)).toBe(true);

    expect(arena.getToolEffects().some((effect) => effect.type === 'flare')).toBe(true);
    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_pressure_bloom');
    expect(arena.getEcology().signals.some((signal) => signal.includes('Pressure Bloom'))).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'critical' && event.label.includes('Pressure Bloom'),
    )).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'critical' && event.label.includes('FLASH'),
    )).toBe(true);
  });

  it('flashes incubator shock when an egg hatches inside starter reagent pressure', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 221,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        eggCharges: 1,
        nutrientCharges: 1,
        toxinCharges: 1,
      },
      enemies: [],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });

    expect(arena.applyTool('nutrient', [34, 34])).toBe(true);
    expect(arena.applyTool('toxin', [34, 34])).toBe(true);
    expect(arena.applyTool('egg', [34, 34], { eggArchetype: 'swarmlet' })).toBe(true);

    expect(arena.getToolEffects().some((effect) => effect.type === 'flare')).toBe(true);
    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_incubator_shock');
    expect(arena.getEcology().signals.some((signal) => signal.includes('Incubator Shock'))).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'critical' && event.label.includes('Incubator Shock'),
    )).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'critical' && event.label.includes('FLASH'),
    )).toBe(true);
  });

  it('discovers toxin mist when water spreads toxin around quick starter cultures', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 216,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        waterCharges: 1,
        toxinCharges: 1,
      },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 160, speed: 12, engulfMultiplier: 4 },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('toxin', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);

    expect(arena.getToolEffects().some((effect) => effect.type === 'foam')).toBe(true);
    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_toxin_water_mist');
    expect(arena.getEcology().signals.some((signal) => signal.includes('Toxin Mist'))).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'caution' && event.label.includes('Toxin Mist'),
    )).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'caution' && event.label.includes('SPARK'),
    )).toBe(true);
  });

  it('flashes a critical mist lattice discharge when salt hits toxin mist', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 216,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        waterCharges: 1,
        toxinCharges: 1,
        saltCharges: 1,
      },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 160, speed: 12, engulfMultiplier: 4 },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('toxin', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);
    expect(arena.getToolEffects().some((effect) => effect.type === 'foam')).toBe(true);
    expect(arena.applyTool('salt', cell.center)).toBe(true);

    expect(arena.getToolEffects().some((effect) => effect.type === 'flare')).toBe(true);
    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_mist_salt_discharge');
    expect(arena.getEcology().signals.some((signal) => signal.includes('Mist Lattice Discharge'))).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'critical' && event.label.includes('Mist Lattice Discharge'),
    )).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'critical' && event.label.includes('FLASH'),
    )).toBe(true);
  });

  it('flashes foam lightning when water re-enters toxin mist', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 216,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        waterCharges: 2,
        toxinCharges: 1,
      },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 160, speed: 12, engulfMultiplier: 4 },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('toxin', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);
    expect(arena.getToolEffects().some((effect) => effect.type === 'foam')).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);

    expect(arena.getToolEffects().some((effect) => effect.type === 'flare')).toBe(true);
    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_foam_lightning');
    expect(arena.getEcology().signals.some((signal) => signal.includes('Foam Lightning'))).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'critical' && event.label.includes('Foam Lightning'),
    )).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'critical' && event.label.includes('FLASH'),
    )).toBe(true);
  });

  it('spills chromatic foam when acid, water, and nutrient meet fragile growth', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 226,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        nutrientCharges: 1,
        waterCharges: 1,
        acidCharges: 1,
      },
      enemies: [
        { archetype: 'splitter' as const, targetVol: 180, speed: 8, engulfMultiplier: 5, traits: ['fragile'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('acid', cell.center)).toBe(true);
    expect(arena.applyTool('nutrient', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);

    expect(arena.getToolEffects().some((effect) => effect.type === 'foam')).toBe(true);
    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_chromatic_spill');
    expect(arena.getEcology().signals.some((signal) => signal.includes('Chromatic Spill'))).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'caution' && event.label.includes('Chromatic Spill'),
    )).toBe(true);
  });

  it('blooms a nutrient conduit when feeding a crystal lattice', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 227,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        nutrientCharges: 1,
        waterCharges: 1,
        saltCharges: 1,
      },
      enemies: [
        { archetype: 'mirror' as const, targetVol: 180, speed: 8, engulfMultiplier: 5, traits: ['budding', 'gelatinous'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('salt', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);
    expect(arena.getToolEffects().some((effect) => effect.type === 'crystal')).toBe(true);
    expect(arena.applyTool('nutrient', cell.center)).toBe(true);

    expect(arena.getToolEffects().some((effect) => effect.type === 'conduit')).toBe(true);
    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_lattice_bloom');
    expect(arena.getEcology().signals.some((signal) => signal.includes('Lattice Bloom'))).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'caution' && event.label.includes('Lattice Bloom'),
    )).toBe(true);
  });

  it('throws a spore comet when an agitated hatch enters reactive foam', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 228,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        eggCharges: 1,
        waterCharges: 1,
        toxinCharges: 1,
        agitationCharges: 1,
      },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 150, speed: 12, engulfMultiplier: 4, traits: ['budding'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('toxin', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);
    expect(arena.getToolEffects().some((effect) => effect.type === 'foam')).toBe(true);
    expect(arena.agitate()).toBe(true);
    expect(arena.applyTool('egg', cell.center, { eggArchetype: 'swarmlet' })).toBe(true);

    expect(arena.getToolEffects().some((effect) => effect.type === 'flare')).toBe(true);
    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_spore_comet');
    expect(arena.getEcology().signals.some((signal) => signal.includes('Spore Comet'))).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'critical' && event.label.includes('Spore Comet'),
    )).toBe(true);
  });

  it('cross-breeds a hybrid when two discovered breeds meet in a nutrient field', () => {
    const arena = createArena({
      LX: 90,
      LY: 90,
      seed: 314,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        nutrientCharges: 6,
      },
      // A sniper beside two swarmlets discovers Needle Swarm; a swarmlet beside a
      // splitter under nutrient discovers Bloom Mass. Both parents of Quill Bloom.
      enemies: [
        { archetype: 'sniper' as const, targetVol: 160, speed: 12, engulfMultiplier: 1 },
        { archetype: 'swarmlet' as const, targetVol: 150, speed: 12, engulfMultiplier: 4 },
        { archetype: 'swarmlet' as const, targetVol: 150, speed: 12, engulfMultiplier: 4, traits: ['budding'] },
        { archetype: 'splitter' as const, targetVol: 300, speed: 8, engulfMultiplier: 6, traits: ['budding'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 30,
    });

    const swarmlet = arena.state.cells.get(3)!;
    const splitter = arena.state.cells.get(5)!;
    // Pin the budding swarmlet onto the splitter so the bloom-mass pairing fires
    // inside a nutrient field, then feed both pairing sites.
    swarmlet.center = [...splitter.center] as [number, number];

    // Drive a couple of ticks so base-breed discoveries register and their cells
    // appear. Re-pin and re-feed each tick because the sim drifts centers and
    // nutrient fields decay as cells move.
    for (let i = 0; i < 3; i++) {
      swarmlet.center = [...splitter.center] as [number, number];
      arena.applyTool('nutrient', splitter.center);
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }
    const discovered = arena.getEcology().discoveries.breedIds;
    expect(discovered).toContain('needle_swarm');
    expect(discovered).toContain('bloom_mass');

    // With both parents discovered, place fresh parent-breed cells adjacent in a
    // clear part of the dish and feed them so the hybrid can form.
    const meetingPoint: [number, number] = [20, 20];
    const needleId = arena.spawnEnemy({
      spawn: { archetype: 'sniper', breedId: 'needle_swarm', targetVol: 140, speed: 14, engulfMultiplier: 1 },
      pos: [meetingPoint[0] - 8, meetingPoint[1]],
    });
    const bloomId = arena.spawnEnemy({
      spawn: { archetype: 'splitter', breedId: 'bloom_mass', targetVol: 320, speed: 8, engulfMultiplier: 6, traits: ['budding'] },
      pos: [meetingPoint[0] + 8, meetingPoint[1]],
    });
    const needleCell = arena.state.cells.get(needleId)!;
    const bloomCell = arena.state.cells.get(bloomId)!;
    expect(needleCell.vol).toBeGreaterThan(0);
    expect(bloomCell.vol).toBeGreaterThan(0);

    for (let i = 0; i < 2; i++) {
      needleCell.center = [...meetingPoint] as [number, number];
      bloomCell.center = [...meetingPoint] as [number, number];
      arena.applyTool('nutrient', meetingPoint);
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
      if (arena.getEcology().discoveries.breedIds.includes('quill_bloom')) break;
    }

    expect(arena.getEcology().discoveries.breedIds).toContain('quill_bloom');
    expect(Array.from(arena.archetypes.values()).some((spawn) => spawn.breedId === 'quill_bloom')).toBe(true);
  });

  it('spawns splitter offspring at the death site, not the dish origin', () => {
    const arena = createArena({
      LX: 90,
      LY: 90,
      seed: 410,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'splitter' as const, targetVol: 300, speed: 8, engulfMultiplier: 6 },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const splitter = arena.state.cells.get(2)!;
    const deathPos = [...splitter.center] as [number, number];
    expect(Math.hypot(deathPos[0], deathPos[1])).toBeGreaterThan(20);

    killCell(arena, 2);
    expect(splitter.vol).toBe(0);
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });

    const offspring = [...arena.archetypes.entries()]
      .filter(([id, spawn]) => id > 2 && spawn.archetype === 'swarmlet')
      .map(([id]) => arena.state.cells.get(id)!);
    expect(offspring.length).toBe(2);
    for (const child of offspring) {
      const fromDeathSite = Math.hypot(child.center[0] - deathPos[0], child.center[1] - deathPos[1]);
      const fromOrigin = Math.hypot(child.center[0], child.center[1]);
      expect(fromDeathSite).toBeLessThanOrEqual(8);
      expect(fromOrigin).toBeGreaterThan(20);
    }
  });

  it('stops targeting the control sample once it is dead', () => {
    const arena = createArena({
      LX: 90,
      LY: 90,
      seed: 411,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'bruiser' as const, targetVol: 200, speed: 8, engulfMultiplier: 6 },
        { archetype: 'swarmlet' as const, targetVol: 140, speed: 12, engulfMultiplier: 4 },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const player = arena.state.cells.get(1)!;
    const bruiser = arena.state.cells.get(2)!;
    const swarmlet = arena.state.cells.get(3)!;

    killCell(arena, 1);
    expect(player.vol).toBe(0);
    // Bruiser sits right next to the corpse; living prey is far to the +x side.
    player.center = [30, 30];
    bruiser.center = [34, 30];
    swarmlet.center = [70, 30];
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });

    // Intent must point at the living swarmlet (+x), not back at the corpse (-x).
    expect(bruiser.intent.vec[0]).toBeGreaterThan(0.9);
  });

  it('forms a velvet prison when salt and toxin trap gelatinous anchors', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 229,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        saltCharges: 1,
        toxinCharges: 1,
      },
      enemies: [
        { archetype: 'boss' as const, targetVol: 260, speed: 5, engulfMultiplier: 7, traits: ['gelatinous'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('salt', cell.center)).toBe(true);
    expect(arena.applyTool('toxin', cell.center)).toBe(true);

    expect(arena.getToolEffects().some((effect) => effect.type === 'lysis')).toBe(true);
    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_velvet_prison');
    expect(arena.getEcology().signals.some((signal) => signal.includes('Velvet Prison'))).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'critical' && event.label.includes('Velvet Prison'),
    )).toBe(true);
  });

  it('discovers static lattice when foam lightning patterns quick starter cultures', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 216,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        waterCharges: 2,
        toxinCharges: 1,
      },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 160, speed: 12, engulfMultiplier: 4 },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('toxin', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);
    expect(arena.getToolEffects().some((effect) => effect.type === 'foam')).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);

    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_foam_lightning');
    expect(arena.getEcology().discoveries.breedIds).toContain('static_lattice');
    expect(Array.from(arena.archetypes.values()).some((spawn) => spawn.breedId === 'static_lattice')).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.label.includes('Static Lattice') && event.kind === 'caution' && event.color === 'amber',
    )).toBe(true);
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
    expect(arena.getDishEvents().filter((event) => (
      event.kind === 'critical' && event.label.includes('CATALYTIC FLARE')
    ))).toHaveLength(2);
  });

  it('records catalyst discovery messages only once per recipe', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 222,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        acidCharges: 2,
        toxinCharges: 2,
      },
      enemies: [
        { archetype: 'sniper' as const, targetVol: 160, speed: 10, engulfMultiplier: 1, traits: ['fragile'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('acid', cell.center)).toBe(true);
    expect(arena.applyTool('toxin', cell.center)).toBe(true);
    expect(arena.applyTool('acid', [cell.center[0] + 2, cell.center[1]])).toBe(true);
    expect(arena.applyTool('toxin', [cell.center[0] + 2, cell.center[1]])).toBe(true);

    const flareDiscoveries = arena.getEcology().discoveries.latest.filter((message) =>
      message.includes('CATALYTIC FLARE: Acid-Toxin Flare discovered.'),
    );
    expect(flareDiscoveries).toHaveLength(1);
    expect(arena.getEcology().reactions).toBeGreaterThanOrEqual(2);
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

  it('discovers static lattice when crystal shock freezes gelatinous tissue', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 223,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'mirror' as const, targetVol: 260, speed: 8, engulfMultiplier: 5, traits: ['gelatinous'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('salt', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });

    expect(arena.getToolEffects().some((effect) => effect.type === 'crystal')).toBe(true);
    expect(arena.getEcology().discoveries.breedIds).toContain('static_lattice');
    expect(Array.from(arena.archetypes.values()).some((spawn) => spawn.breedId === 'static_lattice')).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.label.includes('Static Lattice') && event.kind === 'caution' && event.color === 'amber',
    )).toBe(true);
  });

  it('discovers a prism flare when toxin fractures a crystal field', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 224,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'mirror' as const, targetVol: 260, speed: 8, engulfMultiplier: 5, traits: ['gelatinous'] },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('salt', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);
    expect(arena.getToolEffects().some((effect) => effect.type === 'crystal')).toBe(true);
    expect(arena.applyTool('toxin', cell.center)).toBe(true);

    expect(arena.getToolEffects().some((effect) => effect.type === 'flare')).toBe(true);
    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_crystal_toxin_prism');
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'critical' && event.label.includes('Prism Flare'),
    )).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'critical' && event.label.includes('FLASH'),
    )).toBe(true);
  });

  it('flashes brine when acid hits salty pressure near gelatinous life', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 225,
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
    expect(arena.getToolEffects().some((effect) => effect.type === 'brine' || effect.type === 'crystal')).toBe(true);
    expect(arena.applyTool('acid', cell.center)).toBe(true);

    expect(arena.getToolEffects().some((effect) => effect.type === 'flare')).toBe(true);
    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_brine_flash');
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'critical' && event.label.includes('Brine Flash'),
    )).toBe(true);
    expect(arena.getDishEvents().some((event) =>
      event.kind === 'critical' && event.label.includes('FLASH'),
    )).toBe(true);
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
    expect(arena.getDishEvents().some((event) =>
      event.label.includes('Needle Swarm') && event.kind === 'critical' && event.color === 'red' && event.radius > 20,
    )).toBe(true);
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
    expect(arena.getDishEvents().some((event) =>
      event.label.includes('Bloom Mass') && event.kind === 'discovery' && event.color === 'cyan',
    )).toBe(true);
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

    // The breed objective is now complete, but the epoch stays running so the
    // player can keep cultivating; they bank the win via End (or the deadline).
    expect(arena.getObjectiveProgress().status).toBe('satisfied');
    expect(arena.getObjectiveProgress().complete).toBe(true);
    expect(arena.getStatus()).toBe('running');
    expect(arena.endEpochNow()).toBe('won');
  });

  it('latches a created-breed objective as complete even if the breed later dies off', () => {
    const arena = createArena({
      LX: 90,
      LY: 90,
      seed: 261,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3, nutrientCharges: 1 },
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
        breedId: 'bloom_mass',
      },
    });
    arena.state.cells.get(2)!.center = [42, 44];
    arena.state.cells.get(3)!.center = [50, 44];
    expect(arena.applyTool('nutrient', [46, 44])).toBe(true);
    for (let i = 0; i < 100; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }
    expect(arena.getObjectiveProgress().complete).toBe(true);
    // Wipe every culture: a creation objective stays complete (it happened).
    for (const [, cell] of arena.state.cells) cell.vol = 0;
    expect(arena.getObjectiveProgress().complete).toBe(true);
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

  it('discovers glass antibody from salt crystal shock through a resistant feeder', () => {
    const arena = createArena({
      LX: 90,
      LY: 90,
      seed: 232,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        {
          archetype: 'bruiser' as const,
          targetVol: 260,
          speed: 8,
          engulfMultiplier: 6,
          traits: ['gelatinous', 'toxin_resistant', 'fragile'],
        },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
    });
    const cell = arena.state.cells.get(2)!;

    expect(arena.applyTool('salt', cell.center)).toBe(true);
    expect(arena.applyTool('water', cell.center)).toBe(true);
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });

    expect(arena.getToolEffects().some((effect) => effect.type === 'crystal')).toBe(true);
    expect(arena.getEcology().discoveries.breedIds).toContain('glass_antibody');
    expect(Array.from(arena.archetypes.values()).some((spawn) => spawn.breedId === 'glass_antibody')).toBe(true);
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

  it('discovers folded anchor when a folding fault stabilizes inside anchor tissue', () => {
    const arena = createArena({
      LX: 90,
      LY: 90,
      seed: 242,
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
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });

    expect(arena.getToolEffects().some((effect) => effect.type === 'fold_fault')).toBe(true);
    expect(arena.getEcology().discoveries.breedIds).toContain('folded_anchor');
    expect(Array.from(arena.archetypes.values()).some((spawn) => spawn.breedId === 'folded_anchor')).toBe(true);
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
      epochTicks: 60 * 60,
    });
    // Accidents wait out the calm opening window, then fire on the accident
    // interval (22s); the first lands at ~44s.
    for (let i = 0; i < 60 * 45; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }
    expect(arena.getEcology().accidents).toBe(1);
    expect(arena.getToolEffects().some((effect) =>
      effect.type === 'water' || effect.type === 'salt' || effect.type === 'acid',
    )).toBe(true);
  });

  it('latches equilibrium as visible state and pauses pressure without ending the epoch', () => {
    const arena = createArena({
      LX: 140,
      LY: 140,
      seed: 51,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
      },
      enemies: [
        { archetype: 'swarmlet' as const, breedId: 'bloom_mass', targetVol: 520, speed: 0, engulfMultiplier: 1 },
        { archetype: 'swarmlet' as const, breedId: 'bloom_mass', targetVol: 520, speed: 0, engulfMultiplier: 1 },
        { archetype: 'swarmlet' as const, breedId: 'needle_swarm', targetVol: 520, speed: 0, engulfMultiplier: 1 },
        { archetype: 'swarmlet' as const, breedId: 'needle_swarm', targetVol: 520, speed: 0, engulfMultiplier: 1 },
        { archetype: 'swarmlet' as const, breedId: 'glass_antibody', targetVol: 520, speed: 0, engulfMultiplier: 1 },
      ],
      wrap: true,
      mode: 'ecosystem',
      includeControlSample: false,
      epochTicks: 60 * 80,
      worldEventIntensity: 0,
    });

    for (let i = 0; i < 60 * 20; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }

    const equilibrium = arena.getEquilibrium();
    expect(equilibrium.achieved).toBe(true);
    expect(equilibrium.progress).toBe(1);
    expect(equilibrium.biomeName).toBeTruthy();
    expect(arena.getStatus()).toBe('running');

    const pressureAtEquilibrium = arena.getEcology();
    for (let i = 0; i < 60 * 25; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }

    const ecology = arena.getEcology();
    expect(ecology.outbreaks).toBe(pressureAtEquilibrium.outbreaks);
    expect(ecology.accidents).toBe(pressureAtEquilibrium.accidents);
    expect(ecology.crisis).toBe('none');
    expect(arena.getStatus()).toBe('running');
  });

  it('can turn dish fertility world events fully off', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 31,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
      },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 100, speed: 12, engulfMultiplier: 4 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 30,
      worldEventIntensity: 0,
    });

    for (let i = 0; i < 60 * 20; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }

    expect(arena.getEcology().worldEvents).toBe(0);
  });

  it('can dial dish fertility up into regular organic events', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 32,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
      },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 100, speed: 12, engulfMultiplier: 4 }],
      wrap: true,
      mode: 'ecosystem',
      epochTicks: 60 * 30,
      worldEventIntensity: 1,
    });

    for (let i = 0; i < 60 * 20; i++) {
      arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    }

    expect(arena.getEcology().worldEvents).toBeGreaterThanOrEqual(1);
    expect(
      arena.getToolEffects().some((effect) => effect.type === 'nutrient')
      || arena.getEcology().births > 0,
    ).toBe(true);
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
      epochTicks: 60 * 40,
    });
    const beforeLiving = arena.getEcology().livingEnemies;
    expect(arena.getEcology().outbreaks).toBe(0);
    // Outbreaks hold off through the calm opening window, then fire on the
    // outbreak interval (14s); the first lands at ~28s.
    for (let i = 0; i < 60 * 29; i++) {
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
      epochTicks: 60 * 40,
    });
    for (let i = 0; i < 60 * 29; i++) {
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
    for (let i = 0; i < 60 * 13; i++) {
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

    for (let i = 0; i < 60 * 13; i++) {
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

  it('counts sustained balance for balance_keeper objectives', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 811,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [
        { archetype: 'swarmlet' as const, targetVol: 120, speed: 10, engulfMultiplier: 4 },
        { archetype: 'splitter' as const, targetVol: 120, speed: 8, engulfMultiplier: 5 },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
      objective: {
        kind: 'balance_keeper',
        name: 'Balance Keeper',
        description: 'Keep cultures balanced.',
        target: 'No breed > 60% for 2 ticks',
        maxDominance: 0.6,
        sustainTicks: 2,
      },
    });

    expect(arena.getObjectiveProgress().complete).toBe(false);
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    expect(arena.getObjectiveProgress().complete).toBe(false);
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    expect(arena.getObjectiveProgress().complete).toBe(true);
  });

  it('tracks extinction lows and recovery for extinction_reversal objectives', () => {
    const arena = createArena({
      LX: 90,
      LY: 90,
      seed: 812,
      player: { targetVol: 100, speed: 10, engulfMultiplier: 5, bulletSize: 3 },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 90, speed: 10, engulfMultiplier: 4 }],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
      objective: {
        kind: 'extinction_reversal',
        name: 'Extinction Reversal',
        description: 'Recover from one culture.',
        target: 'Recover to 4+ cultures',
        targetCount: 4,
      },
    });

    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    expect(arena.getObjectiveProgress().complete).toBe(false);

    arena.spawnEnemy({ spawn: { archetype: 'swarmlet', targetVol: 90, speed: 10, engulfMultiplier: 4 }, pos: [20, 20] });
    arena.spawnEnemy({ spawn: { archetype: 'splitter', targetVol: 90, speed: 8, engulfMultiplier: 4 }, pos: [35, 20] });
    arena.spawnEnemy({ spawn: { archetype: 'bruiser', targetVol: 90, speed: 7, engulfMultiplier: 5 }, pos: [50, 20] });
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });

    expect(arena.getObjectiveProgress().complete).toBe(true);
  });

  it('lets acid-led reactions satisfy acid_sculptor objectives', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 813,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        toxinCharges: 1,
        acidCharges: 1,
      },
      enemies: [{ archetype: 'swarmlet' as const, targetVol: 120, speed: 10, engulfMultiplier: 4 }],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
      objective: {
        kind: 'acid_sculptor',
        name: 'Acid Sculptor',
        description: 'Use acid to trigger a reaction.',
        target: '1 acid reaction',
      },
    });

    expect(arena.applyTool('toxin', [40, 40])).toBe(true);
    expect(arena.applyTool('acid', [40, 40])).toBe(true);

    expect(arena.getEcology().reactions).toBeGreaterThanOrEqual(1);
    expect(arena.getObjectiveProgress().complete).toBe(true);
  });

  it('does not satisfy acid_sculptor when acid is near a non-acid selected reaction', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 815,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        saltCharges: 1,
        acidCharges: 1,
        waterCharges: 1,
      },
      enemies: [{
        archetype: 'bruiser' as const,
        targetVol: 120,
        speed: 8,
        engulfMultiplier: 5,
        traits: ['gelatinous'],
      }],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
      objective: {
        kind: 'acid_sculptor',
        name: 'Acid Sculptor',
        description: 'Use acid to trigger a reaction.',
        target: '1 acid reaction',
      },
    });

    expect(arena.applyTool('salt', [40, 40])).toBe(true);
    expect(arena.applyTool('acid', [40, 40])).toBe(true);
    expect(arena.applyTool('water', [40, 40])).toBe(true);

    expect(arena.getEcology().reactions).toBeGreaterThanOrEqual(1);
    expect(arena.getEcology().discoveries.noteIds).toContain('recipe_salt_water_crystal');
    expect(arena.getObjectiveProgress().complete).toBe(false);
  });

  it('tracks current-epoch hybrid discoveries for cross_breed objectives', () => {
    const arena = createArena({
      LX: 90,
      LY: 90,
      seed: 814,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        nutrientCharges: 1,
      },
      enemies: [
        { archetype: 'sniper' as const, breedId: 'needle_swarm', targetVol: 100, speed: 10, engulfMultiplier: 4 },
        { archetype: 'splitter' as const, breedId: 'bloom_mass', targetVol: 120, speed: 8, engulfMultiplier: 5 },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
      knownBreedIds: new Set(['needle_swarm', 'bloom_mass']),
      objective: {
        kind: 'cross_breed',
        name: 'Cross-Breed',
        description: 'Create a hybrid.',
        target: '1 hybrid breed created',
      },
    });
    arena.state.cells.get(2)!.center = [42, 44];
    arena.state.cells.get(3)!.center = [50, 44];

    expect(arena.applyTool('nutrient', [46, 44])).toBe(true);
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });

    expect(arena.getEcology().discoveries.breedIds).toContain('quill_bloom');
    expect(arena.getObjectiveProgress().complete).toBe(true);
  });

  it('does not complete cross_breed by re-discovering a known hybrid', () => {
    const arena = createArena({
      LX: 90,
      LY: 90,
      seed: 816,
      player: {
        targetVol: 100,
        speed: 10,
        engulfMultiplier: 5,
        bulletSize: 3,
        nutrientCharges: 1,
      },
      enemies: [
        { archetype: 'sniper' as const, breedId: 'needle_swarm', targetVol: 100, speed: 10, engulfMultiplier: 4 },
        { archetype: 'splitter' as const, breedId: 'bloom_mass', targetVol: 120, speed: 8, engulfMultiplier: 5 },
      ],
      wrap: false,
      mode: 'ecosystem',
      epochTicks: 60 * 20,
      knownBreedIds: new Set(['needle_swarm', 'bloom_mass', 'quill_bloom']),
      objective: {
        kind: 'cross_breed',
        name: 'Cross-Breed',
        description: 'Create a new hybrid.',
        target: '1 new hybrid breed created',
      },
    });
    arena.state.cells.get(2)!.center = [42, 44];
    arena.state.cells.get(3)!.center = [50, 44];

    expect(arena.applyTool('nutrient', [46, 44])).toBe(true);
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });

    expect(arena.getEcology().discoveries.breedIds).toContain('quill_bloom');
    expect(arena.getObjectiveProgress().complete).toBe(false);
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
