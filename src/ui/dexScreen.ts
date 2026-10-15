// The collection: every friend as a living tile, and a page for the one you
// pick, where Dr. E says his line about it. Found friends are drawn in
// colour, unfound ones as silhouettes; very rares stay a mystery until you
// have found one. Opening it pauses the dish (main asks isOpen()).
import { DR_E_DIRECTION } from '../content/drETuning';
import { LIFEFORM_IDENTITIES, type LifeformIdentityId } from '../content/lifeformIdentity';
import type { DexItem, DexTier, DexView } from '../game/friendsDex';
import { createDrEFace, type DrEFace } from './drEFace/faceRenderer';
import { createSpecimen } from './specimen';

export interface DexScreen {
  open(view: DexView): void;
  close(): void;
  isOpen(): boolean;
  /** Update the counter (and the open screen) after a find. */
  refresh(view: DexView): void;
  onToggle(handler: (open: boolean) => void): void;
}

type Tab = 'all' | Exclude<DexTier, 'origin'>;

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'common', label: 'Common' },
  { id: 'rare', label: 'Rare' },
  { id: 'very-rare', label: 'Very rare' },
];

const TIER_LABEL: Record<DexTier, string> = { origin: 'Origin', common: 'Common', rare: 'Rare', 'very-rare': 'Very rare' };

const pad = (n: number) => `#${String(n).padStart(3, '0')}`;

function strainName(strain: string): string {
  return strain === 'control' ? 'Control sample' : LIFEFORM_IDENTITIES[strain as LifeformIdentityId]?.name ?? strain;
}

export function createDexScreen(opts: { additiveBloom: boolean; playTap: () => void }): DexScreen {
  const root = document.getElementById('screen-dex')!;
  const button = document.getElementById('dex-button')!;
  const count = document.getElementById('dex-count')!;
  const foundEl = document.getElementById('dex-found')!;
  const totalEl = document.getElementById('dex-total')!;
  const tabsEl = document.getElementById('dex-tabs')!;
  const grid = document.getElementById('dex-grid')!;
  const closeBtn = document.getElementById('dex-close')!;
  const detail = {
    canvas: document.getElementById('dex-detail-canvas') as HTMLCanvasElement,
    number: document.getElementById('dex-detail-number')!,
    name: document.getElementById('dex-detail-name')!,
    tier: document.getElementById('dex-detail-tier')!,
    strains: document.getElementById('dex-detail-strains')!,
    line: document.getElementById('dex-line')!,
    found: document.getElementById('dex-detail-found')!,
  };

  let view: DexView | null = null;
  let tab: Tab = 'all';
  let selected = 0;
  let open = false;
  let cleanups: Array<() => void> = [];
  let detailCleanup: (() => void) | null = null;
  const toggleHandlers: Array<(open: boolean) => void> = [];

  const veryRareKnown = () => !!view && view.byTier['very-rare'].found > 0;
  const shownAs = (item: DexItem): 'found' | 'silhouette' | 'mystery' => (
    item.found ? 'found' : item.tier === 'very-rare' && !veryRareKnown() ? 'mystery' : 'silhouette'
  );

  const drawInto = (canvas: HTMLCanvasElement, item: DexItem, cssPx: number): (() => void) => {
    if (item.tier === 'origin') {
      const face: DrEFace = createDrEFace(canvas, { direction: DR_E_DIRECTION, size: cssPx, cssSized: true, additiveBloom: opts.additiveBloom, expression: 'happy' });
      return () => face.destroy();
    }
    const specimen = createSpecimen(canvas, item, shownAs(item) === 'found');
    return () => specimen.destroy();
  };

  // The tabs are built once and only updated, so a keyboard user's focus
  // stays on the tab they pressed.
  const tabButtons = TABS.map(({ id, label }) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dex-tab';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', 'dex-grid');
    b.innerHTML = '<span></span><b></b>';
    b.querySelector('span')!.textContent = label;
    b.addEventListener('click', () => {
      opts.playTap();
      tab = id;
      render();
    });
    tabsEl.append(b);
    return { id, b };
  });

  const renderTabs = () => {
    for (const { id, b } of tabButtons) {
      b.setAttribute('aria-selected', String(id === tab));
      const counts = view && id !== 'all' ? view.byTier[id] : view ? { found: view.found, total: view.total } : null;
      b.querySelector('b')!.textContent = counts ? `${counts.found}/${counts.total}` : '';
    }
  };

  const renderDetail = () => {
    detailCleanup?.();
    const item = view?.items.find((entry) => entry.number === selected);
    if (!item) return;
    const shown = shownAs(item);
    detail.canvas.dataset.tier = item.tier;
    detailCleanup = drawInto(detail.canvas, item, 220);
    detail.number.textContent = pad(item.number);
    detail.name.textContent = shown === 'found' ? item.name : 'Unknown friend';
    detail.tier.textContent = TIER_LABEL[item.tier];
    detail.tier.dataset.tier = item.tier;
    detail.strains.replaceChildren(...(shown === 'mystery' ? [] : item.strains).map((strain) => {
      const li = document.createElement('li');
      li.textContent = shown === 'found' || item.tier === 'rare' ? strainName(strain) : '?';
      return li;
    }));
    detail.line.textContent = shown === 'found'
      ? item.note
      : shown === 'mystery'
        ? 'Something very rare. Keep a merged friend going and see what happens.'
        : item.hint || 'Not found yet.';
    detail.found.textContent = item.record ? `Found ${new Date(item.record.at).toLocaleDateString()} · ${item.record.where}` : item.found && item.tier !== 'origin' ? 'Found' : '';
  };

  const render = () => {
    if (!view) return;
    for (const cleanup of cleanups) cleanup();
    cleanups = [];
    foundEl.textContent = String(view.found);
    totalEl.textContent = ` / ${view.total}`;
    renderTabs();
    const items = view.items.filter((item) => tab === 'all' || item.tier === tab);
    grid.replaceChildren(...items.map((item) => {
      const li = document.createElement('li');
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'dex-tile';
      tile.dataset.tier = item.tier;
      tile.dataset.shown = shownAs(item);
      tile.setAttribute('aria-pressed', String(item.number === selected));
      const name = shownAs(item) === 'found' ? item.name : '???';
      tile.setAttribute('aria-label', `${pad(item.number)} ${name}, ${TIER_LABEL[item.tier]}${item.found ? '' : ', not found yet'}`);
      const number = document.createElement('span');
      number.className = 'dex-tile-number';
      number.textContent = pad(item.number);
      const canvas = document.createElement('canvas');
      canvas.className = 'dex-specimen';
      canvas.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'dex-tile-name';
      label.textContent = name;
      tile.append(number, canvas, label);
      tile.addEventListener('click', () => {
        opts.playTap();
        selected = item.number;
        for (const other of grid.querySelectorAll('.dex-tile')) other.setAttribute('aria-pressed', String(other === tile));
        renderDetail();
      });
      li.append(tile);
      cleanups.push(drawInto(canvas, item, 96));
      return li;
    }));
    renderDetail();
  };

  const setOpen = (next: boolean) => {
    open = next;
    root.hidden = !next;
    button.setAttribute('aria-expanded', String(next));
    document.documentElement.classList.toggle('dex-open', next);
    if (!next) {
      for (const cleanup of cleanups) cleanup();
      cleanups = [];
      detailCleanup?.();
      detailCleanup = null;
      button.focus({ preventScroll: true });
    }
    for (const handler of toggleHandlers) handler(next);
  };

  closeBtn.addEventListener('click', () => {
    opts.playTap();
    setOpen(false);
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false);
    }
  });

  return {
    open(next) {
      view = next;
      setOpen(true);
      render();
      (grid.querySelector<HTMLElement>('.dex-tile[aria-pressed="true"]') ?? closeBtn).focus({ preventScroll: true });
    },
    close: () => { if (open) setOpen(false); },
    isOpen: () => open,
    refresh(next) {
      view = next;
      count.textContent = String(next.found);
      document.getElementById('dex-count-total')!.textContent = `/${next.total}`;
      button.setAttribute('aria-label', `Open your friends: ${next.found} of ${next.total} found`);
      if (open) render();
    },
    onToggle: (handler) => { toggleHandlers.push(handler); },
  };
}
