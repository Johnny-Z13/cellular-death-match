// The ta-da. The first time a friend is rescued the dish pauses and its
// specimen rises out of the dish in a glass droplet; a tier stamp lands with
// the name and number; Dr. E pops up delighted and says its line; then
// "Into the dex" sends the droplet into the Friends chip, which bumps.
// Reduced motion keeps the sequence but swaps every move for a fade.
import type { HapticCue } from './haptics';
import type { DexItem } from '../game/friendsDex';
import type { DrEPresence } from './drEPresence';
import { createSpecimen } from './specimen';

export const REVEAL_TIMING = {
  /** The droplet's rise from the dish to the centre. */
  riseMs: 720,
  /** When the stamp, name and number land. */
  stampMs: 640,
  /** When Dr. E pops up and starts talking. */
  speakMs: 1050,
  /** The droplet's flight into the Friends chip. */
  leaveMs: 460,
};

export interface FriendReveal {
  /** `from` is the merge's position on screen, or null to rise from below. */
  show(item: DexItem, from: { x: number; y: number } | null, onDone?: () => void): void;
  isOpen(): boolean;
}

export interface FriendRevealDeps {
  presence: DrEPresence;
  playSound: (id: 'epoch_win' | 'ui_tap') => void;
  haptic: (cue: HapticCue) => void;
}

const pad = (n: number) => `#${String(n).padStart(3, '0')}`;

export function createFriendReveal(deps: FriendRevealDeps): FriendReveal {
  const T = REVEAL_TIMING;
  const root = document.getElementById('friend-reveal')!;
  const canvas = document.getElementById('reveal-canvas') as HTMLCanvasElement;
  const stamp = document.getElementById('reveal-stamp')!;
  const name = document.getElementById('reveal-name')!;
  const number = document.getElementById('reveal-number')!;
  const line = document.getElementById('reveal-line')!;
  const next = document.getElementById('reveal-continue') as HTMLButtonElement;
  const chip = document.getElementById('dex-button');
  let open = false;
  let timers: number[] = [];
  let specimen: { destroy(): void } | null = null;
  let done: (() => void) | undefined;

  const later = (ms: number, fn: () => void) => { timers.push(window.setTimeout(fn, ms)); };

  const finish = () => {
    if (!open || root.classList.contains('is-leaving')) return;
    deps.playSound('ui_tap');
    const target = chip?.getBoundingClientRect();
    if (target) {
      root.style.setProperty('--to-x', `${target.left + target.width / 2 - window.innerWidth / 2}px`);
      root.style.setProperty('--to-y', `${target.top + target.height / 2 - window.innerHeight / 2}px`);
    }
    root.classList.add('is-leaving');
    later(T.leaveMs, () => {
      for (const id of timers) window.clearTimeout(id);
      timers = [];
      specimen?.destroy();
      specimen = null;
      root.hidden = true;
      root.className = 'friend-reveal';
      line.textContent = '';
      open = false;
      chip?.classList.add('is-bumped');
      window.setTimeout(() => chip?.classList.remove('is-bumped'), 700);
      chip?.focus({ preventScroll: true });
      done?.();
    });
  };

  next.addEventListener('click', finish);
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') finish();
  });

  return {
    show(item, from, onDone) {
      for (const id of timers) window.clearTimeout(id);
      timers = [];
      done = onDone;
      open = true;
      specimen?.destroy();
      specimen = createSpecimen(canvas, item, true);
      root.dataset.tier = item.tier;
      stamp.textContent = item.tier === 'very-rare' ? 'Very rare' : item.tier === 'rare' ? 'Rare' : 'New';
      name.textContent = item.name;
      number.textContent = pad(item.number);
      line.textContent = '';
      root.style.setProperty('--from-x', `${from ? from.x - window.innerWidth / 2 : 0}px`);
      root.style.setProperty('--from-y', `${from ? from.y - window.innerHeight / 2 : window.innerHeight * 0.4}px`);
      root.className = 'friend-reveal';
      root.hidden = false;
      // Next frame, so the droplet starts at the dish before it rises.
      requestAnimationFrame(() => root.classList.add('is-rising'));
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
    },
    isOpen: () => open,
  };
}
