export interface InputState {
  moveVec: [number, number];      // normalized (length 0 or 1)
  shouldFire: boolean;
  lastFireDir: [number, number];  // last non-zero moveVec (or [1, 0] initial)
}

export interface Input {
  poll(): InputState;
  destroy(): void;
}

// Maps a KeyboardEvent.key value to a [dx, dy] grid-direction contribution.
//
// Convention: grid coordinates are (row, col) = (x, y). "Up" on screen means
// "toward smaller grid x" (negative x). Right = +y. This matches the way
// `ui/render.ts` already maps grid-x → display-y.
const KEY_DIRS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0], w: [-1, 0], W: [-1, 0],
  ArrowDown: [1, 0], s: [1, 0], S: [1, 0],
  ArrowLeft: [0, -1], a: [0, -1], A: [0, -1],
  ArrowRight: [0, 1], d: [0, 1], D: [0, 1],
};

const FIRE_KEYS = new Set([' ', 'Spacebar']);

function normalize(v: [number, number]): [number, number] {
  const len = Math.hypot(v[0], v[1]);
  if (len === 0) return [0, 0];
  return [v[0] / len, v[1] / len];
}

export function createInput(target: EventTarget): Input {
  const held = new Set<string>();
  let lastFireDir: [number, number] = [1, 0];

  const onDown = (e: { key: string }) => { held.add(e.key); };
  const onUp = (e: { key: string }) => { held.delete(e.key); };

  target.addEventListener('keydown', onDown as unknown as EventListener);
  target.addEventListener('keyup', onUp as unknown as EventListener);

  return {
    poll(): InputState {
      let dx = 0, dy = 0;
      for (const k of held) {
        const dir = KEY_DIRS[k];
        if (dir) { dx += dir[0]; dy += dir[1]; }
      }
      const moveVec = normalize([dx, dy]);
      if (moveVec[0] !== 0 || moveVec[1] !== 0) {
        lastFireDir = moveVec;
      }
      let shouldFire = false;
      for (const k of held) {
        if (FIRE_KEYS.has(k)) { shouldFire = true; break; }
      }
      return { moveVec, shouldFire, lastFireDir };
    },
    destroy() {
      target.removeEventListener('keydown', onDown as unknown as EventListener);
      target.removeEventListener('keyup', onUp as unknown as EventListener);
    },
  };
}
