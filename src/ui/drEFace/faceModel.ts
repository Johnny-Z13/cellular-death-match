// Dr. E's face as cells: a parametric face (body, eyes, brows, mouth) is laid
// onto a small grid every frame, then roughened at the membrane so he reads
// as a living culture. Pure: the same inputs and time give the same grid.
// The grid is row-major (y * N + x), unlike the sim grid, which is x-major.
import type { DrEFaceTuning, FaceDirection, FaceParams } from '../../content/drETuning';

export const PART = { empty: 0, body: 1, eye: 2, pupil: 3, mouth: 4, brow: 5, cheek: 6, lens: 7, glint: 8, tongue: 9 } as const;
// Colony sub-cells use ids from here upward.
export const BODY_CELL_BASE = 16;

export interface SpeechEnvelope {
  events: ReadonlyArray<{ start: number; duration: number; amplitude: number }>;
}

export function hash01(x: number, y: number, step: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(step | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function blendFace(a: FaceParams, b: FaceParams, t: number): FaceParams {
  if (t >= 1) return b;
  const k = Math.max(0, t);
  const out = { ...a };
  for (const key of Object.keys(a) as Array<keyof FaceParams>) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}

/** How open the mouth is `tSec` into a line: the voice's own syllable
 *  envelope (prototype-core.cjs), so lips and sound rise and fall together. */
export function speechLevelAt(speech: SpeechEnvelope, tSec: number): number {
  let level = 0;
  for (const e of speech.events) {
    if (tSec < e.start || tSec >= e.start + e.duration) continue;
    const x = (tSec - e.start) / e.duration;
    const envelope = Math.sin((Math.PI * Math.min(1, x / 0.16)) / 2) * Math.sin((Math.PI * Math.min(1, (1 - x) / 0.3)) / 2);
    level = Math.max(level, envelope * e.amplitude);
  }
  return Math.min(1, level);
}

const isBody = (part: number): boolean => part === PART.body || part >= BODY_CELL_BASE;

function colonySeeds(cells: number, radius: number): Array<[number, number]> {
  if (cells <= 1) return [];
  const seeds: Array<[number, number]> = [[0, radius * 0.05]];
  for (let j = 0; j < cells - 1; j++) {
    const angle = (2 * Math.PI * j) / (cells - 1) + 0.5;
    seeds.push([Math.cos(angle) * radius * 0.55, Math.sin(angle) * radius * 0.55]);
  }
  return seeds;
}

export function rasterizeFace(
  direction: FaceDirection,
  params: FaceParams,
  tuning: DrEFaceTuning,
  timeMs: number,
  reducedMotion: boolean,
): Uint8Array {
  const N = tuning.gridSize;
  const grid = new Uint8Array(N * N);
  const c = (N - 1) / 2;
  const sx = 1 + params.squash;
  const sy = 1 - params.squash;
  const R = params.bodyRadius * N;
  const w = reducedMotion ? 0 : (2 * Math.PI * tuning.wobbleHz * timeMs) / 1000;
  const set = (x: number, y: number, part: number, onlyOnBody = false): void => {
    const gx = Math.round(x);
    const gy = Math.round(y);
    if (gx < 0 || gx >= N || gy < 0 || gy >= N) return;
    if (onlyOnBody && !isBody(grid[gy * N + gx]!)) return;
    grid[gy * N + gx] = part;
  };
  const disc = (cx: number, cy: number, rx: number, ry: number, part: number, onlyOnBody = false): void => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        if (((x - cx) / Math.max(rx, 0.5)) ** 2 + ((y - cy) / Math.max(ry, 0.5)) ** 2 <= 1) set(x, y, part, onlyOnBody);
      }
    }
  };

  // Body: a squashed disc whose rim wobbles slowly like a membrane.
  const seeds = colonySeeds(direction.bodyCells, R);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = (x - c) / sx;
      const dy = (y - c) / sy;
      const angle = Math.atan2(dy, dx);
      const rim = R * (1 + tuning.wobble * (0.6 * Math.sin(3 * angle + w) + 0.4 * Math.sin(5 * angle - 1.3 * w)));
      if (Math.hypot(dx, dy) > rim) continue;
      let part: number = PART.body;
      if (seeds.length > 1) {
        let best = 0;
        for (let i = 1; i < seeds.length; i++) {
          if (Math.hypot(dx - seeds[i]![0], dy - seeds[i]![1]) < Math.hypot(dx - seeds[best]![0], dy - seeds[best]![1])) best = i;
        }
        part = BODY_CELL_BASE + best;
      }
      grid[y * N + x] = part;
    }
  }

  // Mouth: a curve (smile or frown) that opens downward into a rounded lens
  // as he speaks; wide open, a tongue shows at the bottom.
  const my = c + params.mouthY * N * sy;
  const mw = params.mouthWidth * N * sx;
  const mouthOpen = Math.max(0, Math.min(1, params.mouthOpen));
  const opening = mouthOpen * mw * 1.6;
  for (let x = -mw; x <= mw; x += 0.5) {
    const k = 1 - (x / mw) ** 2;
    const top = my + params.mouthCurve * k * mw * 0.45;
    // A wide-open mouth stays inside the membrane.
    const floor = c + R * 0.8 * sy;
    const depth = Math.max(1, Math.min(opening * Math.sqrt(k), floor - top));
    for (let y = 0; y < depth; y += 0.5) set(c + x, top + y, PART.mouth);
  }
  if (mouthOpen > 0.45) {
    const tongueR = mw * 0.45 * mouthOpen;
    disc(c, my + params.mouthCurve * mw * 0.45 + opening - tongueR * 0.6, tongueR, tongueR * 0.6, PART.tongue);
  }

  // Eyes, brows and cheeks (the loupe direction makes the right eye a lens).
  const open = Math.max(0, Math.min(1, params.eyeOpen));
  for (const side of [-1, 1] as const) {
    const lens = direction.lens !== null && side === 1;
    const ex = c + side * params.eyeSpacing * N * sx;
    const ey = c + (params.eyeY - direction.eyeLift) * N * sy;
    const er = params.eyeRadius * N * direction.eyeScale * (lens ? 1.8 : 1);
    if (lens) disc(ex, ey, er, er, PART.lens);
    const inner = lens ? er - 1.5 : er;
    if (open < 0.15) {
      for (let x = ex - inner; x <= ex + inner; x += 0.5) set(x, ey, PART.pupil);
    } else {
      disc(ex, ey, inner, inner * open, PART.eye);
      const pr = inner * 0.45;
      const px = ex + params.pupilX * pr;
      const py = ey + params.pupilY * pr * open;
      disc(px, py, pr, pr * open, PART.pupil);
      // One bright cell per eye: the glint that makes cells read as alive.
      if (open >= 0.4) set(px - pr * 0.4, py - pr * 0.45 * open, PART.glint);
    }
    if (direction.brow) {
      const half = er * 1.1;
      const by = ey - er * open - 1.5 - params.browLift * 2.5;
      for (let u = -1; u <= 1; u += 1 / Math.max(2, half * 2)) {
        const x = ex + side * u * half;
        const y = by + params.browTilt * ((1 - u) / 2) * er * 0.8;
        set(x, y, PART.brow);
        set(x, y + 1, PART.brow);
      }
    }
    if (params.cheeks > 0) {
      disc(ex + side * er * 0.6, (ey + my) / 2 + 1, 1 + params.cheeks * 1.5, 1 + params.cheeks, PART.cheek, true);
    }
  }

  // Membrane flicker: edge pixels drop out and bud on a slow random beat.
  if (!reducedMotion && tuning.flicker > 0) {
    const step = Math.floor(timeMs / tuning.flickerMs);
    const before = grid.slice();
    const at = (x: number, y: number): number => (x >= 0 && x < N && y >= 0 && y < N ? before[y * N + x]! : PART.empty);
    const sides: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const part = before[y * N + x]!;
        if (isBody(part)) {
          if (sides.some(([dx, dy]) => at(x + dx, y + dy) === PART.empty) && hash01(x, y, step) < tuning.flicker) grid[y * N + x] = PART.empty;
        } else if (part === PART.empty) {
          const neighbour = sides.map(([dx, dy]) => at(x + dx, y + dy)).find(isBody);
          if (neighbour !== undefined && hash01(x + 101, y + 31, step) < tuning.flicker * 0.5) grid[y * N + x] = neighbour;
        }
      }
    }
  }
  return grid;
}
