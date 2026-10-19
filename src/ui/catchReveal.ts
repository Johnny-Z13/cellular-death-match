// The catch: a new strain's reveal at the end of a trial, played like opening
// a prize. A sealed specimen egg (the strain's silhouette inside) wobbles
// three times, cracks and bursts in the strain's colour; the creature pops
// out over light rays; its name lands; a dex card slides up registering it
// (number, what it does, "now in your Egg tray") while the friends count
// ticks; then Dr. E cheers. A tap mid-way jumps to the finished card.
// Runs on the #fx-genome layer (ui/fx.ts owns showing and closing it).
// Reduced motion shows the finished card at once.

export const CATCH_TIMING = {
  /** The egg's three wobbles, each starting at these times. */
  wobbleAtMs: [420, 980, 1540] as const,
  /** Light leaks through cracks. */
  crackAtMs: 1880,
  /** The egg bursts and the creature pops out. */
  burstAtMs: 2200,
  /** The name lands. */
  nameAtMs: 2460,
  /** The dex card slides up. */
  cardAtMs: 2780,
  /** How long the friends count takes to tick up. */
  countMs: 520,
  /** Dr. E pops up and says his line; the continue hint appears. */
  cheerAtMs: 3260,
  /** Cells thrown out by the burst. */
  burstCells: 18,
  /** Taps this soon after an egg appears are ignored, so the rest of the
   *  gesture that finished the trial (a double tap on Finish) can't skip it. */
  inputGraceMs: 700,
};

export type CatchCue = 'wobble' | 'crack' | 'burst';

export interface CatchInfo {
  name: string;
  asset: string;
  primary: readonly [number, number, number];
  /** Friends dex number, e.g. 4 for #004. */
  number?: number;
  role?: string;
  behavior?: string;
  /** Dr. E's line. */
  note?: string;
  /** Friends found, including this one, and the dex total. */
  found?: number;
  total?: number;
}

export interface CatchDeps {
  cue: (cue: CatchCue, step: number) => void;
  fanfare: () => void;
  haptic: (cue: 'impact' | 'discovery' | 'success') => void;
  cheer: () => void;
  /** Stop Dr. E mid-line when the reveal closes. */
  stopSpeech: () => void;
}

export interface CatchStage {
  start(info: CatchInfo, reducedMotion: boolean): void;
  /** Jump to the finished card. */
  settle(): void;
  isSettled(): boolean;
  clear(): void;
}

const PHASES = ['is-catching', 'catch-wobble', 'catch-crack', 'catch-burst', 'catch-named', 'catch-carded', 'catch-cheer', 'catch-settled'];
const pad = (n: number) => `#${String(n).padStart(3, '0')}`;

export function createCatchStage(root: HTMLElement, deps: CatchDeps): CatchStage {
  const T = CATCH_TIMING;
  const q = <E extends HTMLElement>(sel: string) => root.querySelector<E>(sel);
  const silhouette = q<HTMLImageElement>('.catch-egg-silhouette');
  const cells = q('.catch-cells');
  const number = q('#catch-number');
  const count = q('#catch-count');
  const role = q('#catch-role');
  const behavior = q('#catch-behavior');
  const line = q('#catch-line');
  let timers: number[] = [];
  let countRaf = 0;
  let info: CatchInfo | null = null;
  let settled = true;

  const later = (ms: number, fn: () => void) => { timers.push(window.setTimeout(fn, ms)); };
  const stopTimers = () => {
    for (const id of timers) window.clearTimeout(id);
    timers = [];
    cancelAnimationFrame(countRaf);
  };
  const countText = (n: number) => (info?.total ? `${n} / ${info.total} friends` : '');

  const tickCount = () => {
    if (!count || !info?.found || !info.total) return;
    const from = info.found - 1;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / T.countMs);
      count.textContent = countText(t < 1 ? from : info!.found!);
      if (t < 1) countRaf = requestAnimationFrame(step);
    };
    count.textContent = countText(from);
    countRaf = requestAnimationFrame(step);
  };

  const throwCells = () => {
    if (!cells) return;
    const thrown: HTMLElement[] = [];
    for (let i = 0; i < T.burstCells; i += 1) {
      const cell = document.createElement('i');
      const angle = (i / T.burstCells) * 360 + (i % 2 ? 9 : -9);
      cell.style.setProperty('--a', `${angle}deg`);
      cell.style.setProperty('--d', `${120 + (i % 3) * 46}px`);
      cell.style.setProperty('--s', `${6 + (i % 4) * 3}px`);
      thrown.push(cell);
    }
    cells.replaceChildren(...thrown);
  };

  const cheer = () => {
    root.classList.add('catch-cheer');
    deps.cheer();
    if (line) line.textContent = info?.note ?? '';
  };

  const settle = () => {
    if (settled) return;
    stopTimers();
    settled = true;
    root.classList.add('catch-crack', 'catch-burst', 'catch-named', 'catch-carded', 'catch-settled');
    root.classList.remove('catch-wobble');
    if (count) count.textContent = countText(info?.found ?? 0);
    if (!root.classList.contains('catch-cheer')) cheer();
  };

  return {
    start(next, reducedMotion) {
      stopTimers();
      info = next;
      settled = false;
      root.classList.remove(...PHASES);
      if (silhouette) silhouette.src = next.asset;
      if (number) number.textContent = next.number !== undefined ? pad(next.number) : '';
      if (role) role.textContent = next.role ?? '';
      if (behavior) behavior.textContent = next.behavior ?? '';
      if (line) line.textContent = '';
      if (count) count.textContent = countText(Math.max(0, (next.found ?? 1) - 1));
      cells?.replaceChildren();
      void root.offsetWidth;
      root.classList.add('is-catching');
      if (reducedMotion) {
        deps.fanfare();
        settle();
        return;
      }
      T.wobbleAtMs.forEach((at, i) => later(at, () => {
        root.classList.remove('catch-wobble');
        void root.offsetWidth;
        root.classList.add('catch-wobble');
        root.style.setProperty('--wobble', String(i + 1));
        deps.cue('wobble', i);
        deps.haptic('impact');
      }));
      later(T.crackAtMs, () => {
        root.classList.add('catch-crack');
        deps.cue('crack', 0);
      });
      later(T.burstAtMs, () => {
        throwCells();
        root.classList.remove('catch-wobble');
        root.classList.add('catch-burst');
        deps.cue('burst', 0);
        deps.fanfare();
        deps.haptic('success');
      });
      later(T.nameAtMs, () => root.classList.add('catch-named'));
      later(T.cardAtMs, () => {
        root.classList.add('catch-carded');
        tickCount();
      });
      later(T.cheerAtMs, () => {
        cheer();
        settled = true;
        root.classList.add('catch-settled');
      });
    },
    settle,
    isSettled: () => settled,
    clear() {
      stopTimers();
      settled = true;
      info = null;
      deps.stopSpeech();
      root.classList.remove(...PHASES);
      cells?.replaceChildren();
      if (line) line.textContent = '';
    },
  };
}
