export interface InputState {
  moveVec: [number, number];      // normalized (length 0 or 1)
  shouldFire: boolean;
  lastFireDir: [number, number];  // last non-zero moveVec (or [1, 0] initial)
}

export interface Input {
  poll(): InputState;
  destroy(): void;
}

// Maps a KeyboardEvent.key value to a [dx, dy] direction contribution.
//
// Convention: x = horizontal (right is +x), y = vertical (down is +y).
// This matches both the on-screen display and the `ui/render.ts` grid blit
// (which writes grid pixel (x, y) to ImageData column x, row y).
const KEY_DIRS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
  ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
  ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
  ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
};

const FIRE_KEYS = new Set([' ', 'Spacebar']);

function normalize(v: [number, number]): [number, number] {
  const len = Math.hypot(v[0], v[1]);
  if (len === 0) return [0, 0];
  return [v[0] / len, v[1] / len];
}

export function createInput(target: EventTarget): Input {
  const held = new Set<string>();
  let lastFireDir: [number, number] = [1, 0];   // initial: rightward

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
