// The ta-da. The first time a friend is rescued the dish pauses and an egg
// rises out of the dish in a glass droplet. Like a new strain's catch, it
// wobbles three times, cracks and bursts, and the living specimen pops out;
// a tier stamp lands with the name and number; Dr. E pops up delighted and
// says its line; then "Into the dex" sends the droplet into the Friends chip,
// which bumps. A tap during the egg hatches it at once. Reduced motion skips
// the egg and swaps every move for a fade.
import type { HapticCue } from './haptics';
import { CATCH_TIMING, type CatchCue } from './catchReveal';
import type { DexItem } from '../game/friendsDex';
import type { DrEPresence } from './drEPresence';
import { createSpecimen } from './specimen';

export const REVEAL_TIMING = {
  /** The droplet's rise from the dish to the centre. */
  riseMs: 720,
  /** The egg's three wobbles, a crack, then the burst that hatches it. */
  eggWobbleAtMs: [860, 1340, 1820] as const,
  eggCrackAtMs: 2140,
  eggBurstAtMs: 2440,
  /** After the hatch (the burst, or the start without an egg): when the
   *  stamp, name and number land, and when Dr. E pops up and talks. */
  stampMs: 240,
  speakMs: 650,
  /** The hatch moment when there is no egg (reduced motion). */
  noEggHatchMs: 400,
  /** The droplet's flight into the Friends chip. */
  leaveMs: 460,
  /** How long the chip bumps when the droplet lands. */
  bumpMs: 700,
};

export interface FriendReveal {
  /** `from` is the merge's position on screen, or null to rise from below. */
  show(item: DexItem, from: { x: number; y: number } | null, onDone?: () => void): void;
  isOpen(): boolean;
}

export interface FriendRevealDeps {
  presence: DrEPresence;
  playSound: (id: 'epoch_win' | 'ui_tap') => void;
  /** The egg's wobble, crack and burst sounds (shared with the catch). */
  cue: (cue: CatchCue, step: number) => void;
  haptic: (cue: HapticCue) => void;
  /** Stop Dr. E mid-line when the reveal closes. */
  stopSpeech: () => void;
}

const pad = (n: number) => `#${String(n).padStart(3, '0')}`;
// Cells thrown out when a friend's egg bursts.
const CATCH_BURST_CELLS = 16;

export function createFriendReveal(deps: FriendRevealDeps): FriendReveal {
  const T = REVEAL_TIMING;
  const root = document.getElementById('friend-reveal')!;
  const canvas = document.getElementById('reveal-canvas') as HTMLCanvasElement;
  const stamp = document.getElementById('reveal-stamp')!;
  const name = document.getElementById('reveal-name')!;
  const number = document.getElementById('reveal-number')!;
  const line = document.getElementById('reveal-line')!;
  const next = document.getElementById('reveal-continue') as HTMLButtonElement;
  const cells = root.querySelector<HTMLElement>('.catch-cells');
  const chip = document.getElementById('dex-button');
  const reduceMotion = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let open = false;
  let timers: number[] = [];
  let specimen: { destroy(): void } | null = null;
  let done: (() => void) | undefined;
  let current: DexItem | null = null;
  let hatched = true;

  const later = (ms: number, fn: () => void) => { timers.push(window.setTimeout(fn, ms)); };
  const clearTimers = () => {
    for (const id of timers) window.clearTimeout(id);
    timers = [];
  };

  const throwCells = () => {
    if (!cells) return;
    const thrown: HTMLElement[] = [];
    for (let i = 0; i < CATCH_BURST_CELLS; i += 1) {
      const cell = document.createElement('i');
      cell.style.setProperty('--a', `${(i / CATCH_BURST_CELLS) * 360 + (i % 2 ? 9 : -9)}deg`);
      cell.style.setProperty('--d', `${110 + (i % 3) * 40}px`);
      cell.style.setProperty('--s', `${6 + (i % 4) * 3}px`);
      thrown.push(cell);
    }
    cells.replaceChildren(...thrown);
  };

  // The specimen is out: the stamp lands, then Dr. E speaks.
  const hatch = (withBurst: boolean) => {
    if (!current) return;
    const item = current;
    hatched = true;
    if (withBurst) {
      throwCells();
      root.classList.remove('catch-wobble');
      root.classList.add('catch-crack', 'catch-burst');
      deps.cue('burst', 0);
    }
    root.classList.add('is-hatched');
    later(T.stampMs, () => {
      root.classList.add('is-stamped');
      deps.playSound('epoch_win');
      deps.haptic(item.tier === 'very-rare' ? 'success' : 'discovery');
    });
    later(T.speakMs, () => {
      root.classList.add('is-speaking');
      deps.presence.react('delighted', 4200);
      line.textContent = item.note;
      next.focus({ preventScroll: true });
    });
  };

  const finish = () => {
    if (!open || root.classList.contains('is-leaving')) return;
    deps.playSound('ui_tap');
    deps.stopSpeech();
    const target = chip?.getBoundingClientRect();
    if (target) {
      root.style.setProperty('--to-x', `${target.left + target.width / 2 - window.innerWidth / 2}px`);
      root.style.setProperty('--to-y', `${target.top + target.height / 2 - window.innerHeight / 2}px`);
    }
    root.classList.add('is-leaving');
    later(T.leaveMs, () => {
      clearTimers();
      specimen?.destroy();
      specimen = null;
      root.hidden = true;
      root.className = 'friend-reveal';
      line.textContent = '';
      cells?.replaceChildren();
      current = null;
      open = false;
      chip?.classList.add('is-bumped');
      window.setTimeout(() => chip?.classList.remove('is-bumped'), T.bumpMs);
      chip?.focus({ preventScroll: true });
      done?.();
    });
  };

  next.addEventListener('click', finish);
  // A tap or key during the egg hatches it at once (as a new strain's catch),
  // but only after the same short grace as a catch: a merge forms mid-play,
  // and taps already on their way must not burst the egg unseen.
  let armedAt = 0;
  const armed = () => performance.now() >= armedAt;
  const hatchNow = () => {
    if (!open || hatched) return false;
    clearTimers();
    hatch(true);
    return true;
  };
  root.addEventListener('click', (event) => {
    if (event.target !== next && armed()) hatchNow();
  });
  root.addEventListener('keydown', (event) => {
    if (!armed()) {
      event.preventDefault();
      return;
    }
    if (event.key === 'Escape' && !hatchNow()) finish();
    else if ((event.key === 'Enter' || event.key === ' ') && hatchNow()) event.preventDefault();
  });

  return {
    show(item, from, onDone) {
      clearTimers();
      done = onDone;
      open = true;
      armedAt = performance.now() + CATCH_TIMING.inputGraceMs;
      current = item;
      specimen?.destroy();
      specimen = createSpecimen(canvas, item, true);
      root.dataset.tier = item.tier;
      stamp.textContent = item.tier === 'very-rare' ? 'Very rare' : item.tier === 'rare' ? 'Rare' : 'New';
      name.textContent = item.name;
      number.textContent = pad(item.number);
      line.textContent = '';
      root.style.setProperty('--from-x', `${from ? from.x - window.innerWidth / 2 : 0}px`);
      root.style.setProperty('--from-y', `${from ? from.y - window.innerHeight / 2 : window.innerHeight * 0.4}px`);
      root.className = reduceMotion ? 'friend-reveal' : 'friend-reveal is-egg';
      root.hidden = false;
      cells?.replaceChildren();
      hatched = false;
      // Focus moves into the dialog at once, so keys never reach the paused dish.
      root.focus({ preventScroll: true });
      // Next frame, so the droplet starts at the dish before it rises.
      requestAnimationFrame(() => root.classList.add('is-rising'));
      if (reduceMotion) {
        later(T.noEggHatchMs, () => hatch(false));
        return;
      }
      T.eggWobbleAtMs.forEach((at, i) => later(at, () => {
        root.classList.remove('catch-wobble');
        void root.offsetWidth;
        root.classList.add('catch-wobble');
        root.style.setProperty('--wobble', String(i + 1));
        deps.cue('wobble', i);
        deps.haptic('impact');
      }));
      later(T.eggCrackAtMs, () => {
        root.classList.add('catch-crack');
        deps.cue('crack', 0);
      });
      later(T.eggBurstAtMs, () => hatch(true));
    },
    isOpen: () => open,
  };
}
