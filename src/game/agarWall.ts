// Paste sets as agar: a gel line cultures cannot grow into. Draw one to fence
// a strain off, give prey a refuge, or pen cultures together for a merge.
// The medium can still take gel pixels, so a culture caught under fresh gel is
// squeezed out rather than pinned. The wall holds at full strength, then
// dissolves over the last part of its life: it starts to leak, then is gone.
// The game owns the wall; the sim only reads its mask (SimState.wall).

export const AGAR_TUNING = {
  /** Half-width of the gel line in grid units. At 2 or more a culture can't
   *  slip through on a diagonal step. */
  radius: 2.5,
  /** Ticks a stretch of wall lasts. */
  ttl: 60 * 20,
  /** Share of its life over which the wall dissolves (and leaks). */
  dissolveShare: 0.35,
  /** Stretches of wall kept at once; the oldest goes first. */
  maxSegments: 96,
};

export interface AgarSegment {
  from: [number, number];
  to: [number, number];
  ttl: number;
  maxTtl: number;
}

export interface AgarWall {
  /** A stretch of wall from one point of a drawn stroke to the next. */
  add(from: readonly [number, number], to: readonly [number, number]): void;
  /** Age the wall by one tick. */
  tick(): void;
  /** Gel strength per pixel, 0..255, x-major like the grid; undefined while
   *  there is no wall. */
  mask(): Uint8Array | undefined;
  segments(): readonly AgarSegment[];
}

/** 1 while the wall is fresh, falling to 0 as it dissolves. */
export function agarStrength(ttl: number, maxTtl: number, tuning = AGAR_TUNING): number {
  const dissolveTicks = maxTtl * tuning.dissolveShare;
  return Math.max(0, Math.min(1, ttl / dissolveTicks));
}

export function createAgarWall(LX: number, LY: number, tuning = AGAR_TUNING): AgarWall {
  const strength = new Uint8Array(LX * LY);
  const segments: AgarSegment[] = [];
  let empty = true;

  function rebuild(): void {
    strength.fill(0);
    empty = segments.length === 0;
    const r = tuning.radius;
    for (const segment of segments) {
      const value = Math.round(255 * agarStrength(segment.ttl, segment.maxTtl, tuning));
      if (value <= 0) continue;
      const [ax, ay] = segment.from;
      const [bx, by] = segment.to;
      const dx = bx - ax;
      const dy = by - ay;
      const lengthSq = dx * dx + dy * dy;
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r));
      const x1 = Math.min(LX - 1, Math.ceil(Math.max(ax, bx) + r));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by) - r));
      const y1 = Math.min(LY - 1, Math.ceil(Math.max(ay, by) + r));
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
          // Distance from the pixel to the segment (a capsule of radius r).
          const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSq)) : 0;
          const px = ax + dx * t - x;
          const py = ay + dy * t - y;
          if (px * px + py * py > r * r) continue;
          const i = x * LY + y;
          if (strength[i]! < value) strength[i] = value;
        }
      }
    }
  }

  return {
    add(from, to) {
      segments.push({ from: [from[0], from[1]], to: [to[0], to[1]], ttl: tuning.ttl, maxTtl: tuning.ttl });
      while (segments.length > tuning.maxSegments) segments.shift();
      rebuild();
    },
    tick() {
      if (segments.length === 0) return;
      for (const segment of segments) segment.ttl -= 1;
      for (let i = segments.length - 1; i >= 0; i--) {
        if (segments[i]!.ttl <= 0) segments.splice(i, 1);
      }
      rebuild();
    },
    mask() {
      return empty ? undefined : strength;
    },
    segments() {
      return segments;
    },
  };
}
