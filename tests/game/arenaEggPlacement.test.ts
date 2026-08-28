import { describe, expect, it } from 'vitest';
import { createArena } from '../../src/game/arena';

describe('egg placement feedback', () => {
  it('reports the live position of the most recently seeded egg cell', () => {
    const arena = createArena({
      LX: 80,
      LY: 80,
      seed: 91,
      player: {
        targetVol: 420,
        speed: 8,
        engulfMultiplier: 4.8,
        bulletSize: 3,
        eggCharges: 1,
      },
      enemies: [],
      wrap: false,
      mode: 'ecosystem',
      includeControlSample: true,
    });

    expect(arena.applyTool('egg', [40, 40], { eggArchetype: 'swarmlet' })).toBe(true);
    const actual = arena.getLastEggCellPos();
    expect(actual).toEqual(arena.state.cells.get(2)?.center);

    actual![0] = -1;
    expect(arena.getLastEggCellPos()).toEqual(arena.state.cells.get(2)?.center);
  });
});
