import { describe, expect, it } from 'vitest';
import { createArena } from '../../src/game/arena';

function dish() {
  return createArena({
    LX: 96,
    LY: 96,
    seed: 7,
    player: {
      targetVol: 420,
      speed: 8,
      engulfMultiplier: 4.8,
      bulletSize: 3,
      eggCharges: 4,
      nutrientCharges: 2,
      toxinCharges: 2,
    },
    enemies: [{ archetype: 'swarmlet' as const, targetVol: 90, speed: 8, engulfMultiplier: 4 }],
    wrap: false,
    mode: 'ecosystem',
    epochTicks: 60 * 20,
  });
}

describe('the player\'s own cultures', () => {
  it('counts a culture planted from an Egg as the player\'s, and no wild resident', () => {
    const arena = dish();
    const wild = new Set(arena.archetypes.keys());
    expect(arena.getOwnCultureIds().size).toBe(0);

    expect(arena.applyTool('egg', [20, 20], { eggArchetype: 'splitter' })).toBe(true);
    const own = arena.getOwnCultureIds();
    expect(own.size).toBe(1);
    const [planted] = [...own];
    expect(wild.has(planted!)).toBe(false);
    expect(arena.archetypes.get(planted!)?.archetype).toBe('splitter');
    for (const id of wild) expect(own.has(id)).toBe(false);
  });
});
