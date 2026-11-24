import { describe, expect, it } from 'vitest';
import { createArena, type CreateArenaOpts } from '../../src/game/arena';
import { addBullet } from '../../src/sim/bullets';

const IDLE = { moveVec: [0, 0] as [number, number], shouldFire: false, shouldEngulf: false };

function dish(opts: Partial<CreateArenaOpts> = {}) {
  return createArena({
    LX: 60,
    LY: 60,
    seed: 11,
    player: { targetVol: 100, speed: 8, engulfMultiplier: 4.8, bulletSize: 3, eggCharges: 4 },
    enemies: [{ archetype: 'bruiser' as const, targetVol: 260, speed: 8, engulfMultiplier: 6 }],
    wrap: false,
    mode: 'ecosystem',
    ...opts,
  });
}

describe('bullets and the dish wall', () => {
  it('a bullet that reaches the wall of the dish is gone, not back on the other side', () => {
    const arena = dish();
    addBullet(arena.state, { pos: [57, 2], v: [2, 0], ownerId: 99, size: 1 });
    for (let i = 0; i < 4; i++) arena.tick(IDLE);
    expect(arena.state.bullets.some((bullet) => bullet.ownerId === 99)).toBe(false);
  });

  it('a wrapping dish still wraps its bullets', () => {
    const arena = dish({ wrap: true });
    addBullet(arena.state, { pos: [57, 2], v: [2, 0], ownerId: 99, size: 1 });
    for (let i = 0; i < 4; i++) arena.tick(IDLE);
    expect(arena.state.bullets.find((bullet) => bullet.ownerId === 99)?.wraps).toBe(1);
  });
});

describe('drainBulletImpacts', () => {
  it('keeps every impact across ticks until drained, however many ticks a frame runs', () => {
    const arena = dish();
    for (let i = 0; i < 60; i++) arena.tick(IDLE);
    arena.drainBulletImpacts();
    const id = [...arena.archetypes.keys()][0]!;
    const [x, y] = arena.state.cells.get(id)!.center;
    addBullet(arena.state, { pos: [x, y], v: [0.1, 0], ownerId: 99, size: 3 });
    for (let i = 0; i < 5; i++) arena.tick(IDLE);
    const impacts = arena.drainBulletImpacts().filter((impact) => impact.ownerId === 99);
    expect(impacts).toMatchObject([{ victimId: id, shielded: false }]);
    expect(arena.drainBulletImpacts()).toEqual([]);
  });
});
