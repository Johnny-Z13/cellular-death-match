import { type Bullet, type CellId, type SimState } from './types';
import { getCell, idx, setCell, updateBoundaryAround } from './grid';
import { removePixel } from './cell';

export interface AddBulletOpts {
  pos: [number, number];
  v: [number, number];
  ownerId: CellId;
  size: number;
}

export function addBullet(state: SimState, opts: AddBulletOpts): void {
  const bullet: Bullet = {
    pos: [opts.pos[0], opts.pos[1]],
    v: [opts.v[0], opts.v[1]],
    ownerId: opts.ownerId,
    size: opts.size,
    age: 0,
    wraps: 0,
  };
  state.bullets.push(bullet);
  state.events.push({
    type: 'bulletFired',
    ownerId: opts.ownerId,
    pos: [opts.pos[0], opts.pos[1]],
    v: [opts.v[0], opts.v[1]],
  });
}

// Returns the integer grid pixel coordinates this bullet currently overlaps.
// A size-N bullet covers an N×N square centered on `pos`.
function bulletPxs(b: Bullet, LX: number, LY: number): [number, number][] {
  const out: [number, number][] = [];
  const half = (b.size - 1) / 2;
  const xLo = Math.max(Math.round(b.pos[0] - half), 0);
  const xHi = Math.min(Math.round(b.pos[0] + half) + 1, LX);
  const yLo = Math.max(Math.round(b.pos[1] - half), 0);
  const yHi = Math.min(Math.round(b.pos[1] + half) + 1, LY);
  for (let x = xLo; x < xHi; x++) {
    for (let y = yLo; y < yHi; y++) {
      out.push([x, y]);
    }
  }
  return out;
}

// The "firing grace period": a bullet doesn't damage its owner until it has
// traveled the radius of the field. Matches Python: norm([LX, LY]) / 3.
function gracePeriod(LX: number, LY: number): number {
  return Math.sqrt(LX * LX + LY * LY) / 3;
}

// The strongest agar gel (Membrane) a bullet meets this tick: its footprint
// now, and every pixel its centre passes through on the way to the next tick.
function gelOnPath(wall: Uint8Array, state: SimState, b: Bullet): number {
  const { grid } = state;
  const { LX, LY } = grid;
  let gel = 0;
  for (const [x, y] of bulletPxs(b, LX, LY)) gel = Math.max(gel, wall[idx(grid, x, y)] ?? 0);
  const steps = Math.ceil(Math.hypot(b.v[0], b.v[1]) * 2);
  for (let i = 1; i <= steps; i++) {
    const x = Math.round(b.pos[0] + (b.v[0] * i) / steps);
    const y = Math.round(b.pos[1] + (b.v[1] * i) / steps);
    if (x < 0 || x >= LX || y < 0 || y >= LY) break;
    gel = Math.max(gel, wall[idx(grid, x, y)] ?? 0);
  }
  return gel;
}

export function stepBullets(state: SimState): void {
  const { grid, bullets, cells, wrapBullets, wall } = state;
  const { LX, LY } = grid;
  const grace = gracePeriod(LX, LY);
  const blocked = new Set<Bullet>();

  // 1. Process collisions and advance each bullet.
  for (const b of bullets) {
    // A Membrane shields what is behind it: gel absorbs the bullet, and a
    // dissolving wall lets bullets through as often as it lets cultures.
    const gel = wall ? gelOnPath(wall, state, b) : 0;
    if (gel > 0 && state.rng.randInt(255) < gel) {
      blocked.add(b);
      state.events.push({ type: 'bulletBlocked', ownerId: b.ownerId, pos: [b.pos[0], b.pos[1]] });
      continue;
    }
    for (const [x, y] of bulletPxs(b, LX, LY)) {
      const id = getCell(grid, x, y) as CellId;
      if (id === 0) continue;
      // A hatchling on its yolk: the bullet passes through.
      if (state.shielded?.has(id)) continue;
      // Hit if not owner, OR owner but past grace period.
      if (id !== b.ownerId || b.age >= grace) {
        const victim = cells.get(id);
        if (victim) {
          // Use the canonical pixel-removal helper so center & vol stay in sync.
          // (Don't reimplement the circular-mean math here — that's cell.ts's job.)
          removePixel(victim, x, y, LX, LY, grid.wrap);
          victim.targetVol -= state.bulletDrain; // metabolism decay on damage; Python: target_cell_vols[id] -= 1
        }
        setCell(grid, x, y, 0);
        updateBoundaryAround(grid, x, y);
        state.events.push({
          type: 'bulletHit',
          ownerId: b.ownerId,
          victimId: id,
          pos: [x, y],
        });
      }
    }
    b.pos[0] += b.v[0];
    b.pos[1] += b.v[1];
    b.age += 1;
  }

  // 2. Wrap or drop.
  if (wrapBullets) {
    for (const b of bullets) {
      let wrapped = false;
      let nx = b.pos[0];
      let ny = b.pos[1];
      while (nx < 0)   { nx += LX; wrapped = true; }
      while (nx >= LX) { nx -= LX; wrapped = true; }
      while (ny < 0)   { ny += LY; wrapped = true; }
      while (ny >= LY) { ny -= LY; wrapped = true; }
      b.pos[0] = nx;
      b.pos[1] = ny;
      if (wrapped) b.wraps += 1;
    }
    state.bullets = bullets.filter((b) => b.wraps < 2 && !blocked.has(b));
  } else {
    state.bullets = bullets.filter(
      (b) => !blocked.has(b) && b.pos[0] >= 0 && b.pos[0] < LX && b.pos[1] >= 0 && b.pos[1] < LY,
    );
  }
}
