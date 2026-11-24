// What a bullet reaching a culture looks and sounds like. The sim heals most
// bullet holes within a tick, so without this a hit cannot be seen at all.
// Pure state and timing (DOM-free, so it unit-tests in node): main.ts feeds it
// the arena's impacts and hands its flashes to the renderer.
import type { BulletImpact } from '../sim/types';

export const BULLET_FX_TUNING = {
  /** A struck culture's flash fades over this long. */
  flashMs: 240,
  /** ...and the same culture flashes at most this often, so a culture under
   *  fire from several Snipers never strobes (under 3 Hz). Sparks still fly. */
  flashEveryMs: 360,
  /** A yolk shield's ring lights for this long when a bullet passes through. */
  shieldMs: 420,
  /** Hit and shield sounds play at most this often, across the whole dish. */
  soundEveryMs: 260,
  /** A struck culture's rim turns this hot colour. Never white: a white rim
   *  means the culture is the player's own (render.ts OWN_RIM). */
  rimRgb: [255, 84, 58] as [number, number, number],
  /** How far the rim goes to that colour, and the body toward white, at the
   *  flash's peak. */
  rimMix: 0.92,
  bodyLighten: 0.18,
} as const;

export interface BulletFx {
  /** Take this frame's impacts: start flashes, throw sparks, play sounds. */
  update(impacts: readonly BulletImpact[], now: number): void;
  /** Cultures lit right now, 1 at the moment of impact fading to 0. */
  flashes(now: number): ReadonlyMap<number, number>;
  reset(): void;
}

export interface BulletFxOutputs {
  spark(pos: [number, number], v: [number, number], victimId: number, shielded: boolean): void;
  sound(shielded: boolean): void;
}

export function createBulletFx(out: BulletFxOutputs, tuning = BULLET_FX_TUNING): BulletFx {
  const lit = new Map<number, { at: number; forMs: number }>();
  let soundAt = Number.NEGATIVE_INFINITY;
  return {
    update(impacts, now) {
      for (const impact of impacts) {
        out.spark(impact.pos, impact.v, impact.victimId, impact.shielded);
        const last = lit.get(impact.victimId);
        if (!last || now - last.at >= tuning.flashEveryMs) {
          lit.set(impact.victimId, { at: now, forMs: impact.shielded ? tuning.shieldMs : tuning.flashMs });
        }
        if (now - soundAt >= tuning.soundEveryMs) {
          soundAt = now;
          out.sound(impact.shielded);
        }
      }
      for (const [id, flash] of lit) {
        if (now - flash.at >= Math.max(flash.forMs, tuning.flashEveryMs)) lit.delete(id);
      }
    },
    flashes(now) {
      const levels = new Map<number, number>();
      for (const [id, flash] of lit) {
        const level = 1 - (now - flash.at) / flash.forMs;
        if (level > 0) levels.set(id, Math.min(1, level));
      }
      return levels;
    },
    reset() {
      lit.clear();
      soundAt = Number.NEGATIVE_INFINITY;
    },
  };
}
