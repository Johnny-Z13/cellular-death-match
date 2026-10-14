// The title screen's dish, as on the itch cover: the game's own simulation and
// renderer running an open-lab culture beside the wordmark. It ticks only while
// the title is visible and the page is shown. A few name tags follow the
// largest cultures and stay clear of the title copy.
import { createArena } from '../game/arena';
import { createRun } from '../game/run';
import { createFixedStepClock } from '../game/simClock';
import { ARCHETYPE_DEFAULTS, type EnemyArchetype, type EnemySpawn } from '../content/enemies';
import { lifeformIdentityForSpawn } from '../content/lifeformIdentity';
import { OPEN_LAB_LIFE_CYCLE } from '../content/ecologyTuning';
import { COMMON_COLD_CASE } from '../content/researchCases';
import { createRenderer, displayColorForSpawn } from './render';
import type { VisualPerformanceProfile } from './mobilePerformance';

export const TITLE_DISH_TUNING = {
  grid: 160,
  // The open lab's opening mix (the first epoch plus the six eggs the
  // longevity probe lays), interleaved so the colours alternate round the dish.
  strains: ['bruiser', 'swarmlet', 'splitter', 'swarmlet', 'sniper', 'bruiser', 'swarmlet', 'mirror', 'swarmlet', 'swarmlet'] as EnemyArchetype[],
  // Dish time grown before the title is seen, a few milliseconds of each
  // frame at a time so the boot ident keeps its frame rate.
  warmupTicks: 900,
  warmupBudgetMs: 8,
  // Half the game's pace: the title dish is ambience, not play.
  ticksPerSecond: 30,
  maxTags: 4,
  tagRefreshMs: 600,
  // Tags keep this far from the title copy and the screen edge.
  tagClearancePx: 10,
};

const CONTROL_ID = 1;
const CONTROL_TAG = { name: 'Control sample', icon: '◆', color: 'rgb(255 59 69)' };
const IDLE_INPUT = { moveVec: [0, 0] as [number, number], shouldFire: false, shouldEngulf: false };

interface Rect { left: number; top: number; right: number; bottom: number }

export function createTitleDish(profile: VisualPerformanceProfile, paletteSize: number): void {
  const canvas = document.getElementById('title-dish');
  const tagLayer = document.getElementById('title-dish-tags');
  const screen = document.getElementById('screen-title');
  if (!(canvas instanceof HTMLCanvasElement) || !tagLayer || !screen) return;

  const T = TITLE_DISH_TUNING;
  const seed = (Date.now() & 0xffffffff) >>> 0;
  const arena = createArena({
    LX: T.grid,
    LY: T.grid,
    seed,
    player: createRun(seed).getPlayerConfig(),
    enemies: T.strains.map((archetype) => ({ ...ARCHETYPE_DEFAULTS[archetype] })),
    wrap: false,
    mode: 'ecosystem',
    includeControlSample: true,
    fightIndex: COMMON_COLD_CASE.trials.length,
    worldEventIntensity: 0,
    knownBreedIds: new Set(),
    lifeCycle: OPEN_LAB_LIFE_CYCLE,
    breedDiscovery: false,
  });
  arena.setHazardsHeld(true);
  canvas.width = profile.canvasSize;
  canvas.height = profile.canvasSize;
  const renderer = createRenderer(canvas, paletteSize, { additiveBloom: profile.additiveBloom });
  const clock = createFixedStepClock({ ticksPerSecond: T.ticksPerSecond, nowMs: performance.now() });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let warmupLeft = T.warmupTicks;
  let paused = false;
  let dirty = true;
  let canvasRect = canvas.getBoundingClientRect();
  let avoid: Rect[] = [];
  let nextTagRefresh = 0;
  // strain key -> the culture its tag follows
  let tagged = new Map<string, number>();
  const tagNodes = new Map<string, HTMLElement>();

  const measure = (): void => {
    canvasRect = canvas.getBoundingClientRect();
    const copy = screen.querySelectorAll<HTMLElement>('.title-eyebrow, .title-wordmark > span, .title-pitch, .title-archive-strip, .title-start-button, .title-save-note');
    avoid = [...copy, document.getElementById('options-button')]
      .filter((node): node is HTMLElement => !!node && node.getClientRects().length > 0)
      .map((node) => node.getBoundingClientRect());
    dirty = true;
  };

  // spawn is undefined for the control sample.
  const tagNode = (key: string, spawn: EnemySpawn | undefined): HTMLElement => {
    let node = tagNodes.get(key);
    if (node) return node;
    node = document.createElement('span');
    node.className = 'title-dish-tag';
    const dot = document.createElement('i');
    const label = document.createElement('span');
    if (spawn) {
      label.textContent = lifeformIdentityForSpawn(spawn).name;
      node.style.setProperty('--tag-color', `rgb(${displayColorForSpawn(spawn).join(' ')})`);
    } else {
      label.textContent = `${CONTROL_TAG.icon} ${CONTROL_TAG.name}`;
      node.style.setProperty('--tag-color', CONTROL_TAG.color);
    }
    node.append(dot, label);
    tagLayer.append(node);
    tagNodes.set(key, node);
    return node;
  };

  // Where a culture's tag sits (its anchor is the tag's bottom centre), or
  // null when that spot is off screen, over the title copy or over a tag
  // already placed.
  const tagSpot = (id: number, node: HTMLElement, placed: readonly Rect[]): (Rect & { x: number; y: number }) | null => {
    const cell = arena.state.cells.get(id);
    if (!cell || cell.vol <= 0) return null;
    const scale = canvasRect.width / T.grid;
    const x = canvasRect.left + (cell.center[0] + 0.5) * scale;
    const y = canvasRect.top + (cell.center[1] + 0.5) * scale - Math.sqrt(cell.vol / Math.PI) * scale - 6;
    const pad = T.tagClearancePx;
    const half = node.offsetWidth / 2;
    const box = { x, y, left: x - half - pad, right: x + half + pad, top: y - node.offsetHeight - pad, bottom: y + pad };
    if (box.left < 0 || box.top < 0 || box.right > window.innerWidth || box.bottom > window.innerHeight) return null;
    for (const r of [...avoid, ...placed]) {
      if (box.left < r.right && box.right > r.left && box.top < r.bottom && box.bottom > r.top) return null;
    }
    return box;
  };

  // Pick which cultures carry tags: the control sample, then strains that
  // already have one, then the largest. A tag only changes hands when its
  // culture dies or drifts under the copy or another tag.
  const chooseTags = (): void => {
    const byStrain = new Map<string, Array<{ id: number; vol: number }>>();
    for (const [id, cell] of arena.state.cells) {
      const spawn = arena.archetypes.get(id);
      if (cell.vol <= 0 || (id !== CONTROL_ID && !spawn)) continue;
      const key = spawn ? spawn.breedId ?? spawn.archetype : 'control';
      byStrain.set(key, [...(byStrain.get(key) ?? []), { id, vol: cell.vol }]);
    }
    const strains = [...byStrain].map(([key, cultures]) => {
      cultures.sort((a, b) => b.vol - a.vol);
      const kept = tagged.get(key);
      const rank = key === 'control' ? 2e9 : (kept !== undefined ? 1e9 : 0) + cultures[0]!.vol;
      return { key, cultures, kept, rank };
    }).sort((a, b) => b.rank - a.rank);
    const placed: Rect[] = [];
    const next = new Map<string, number>();
    for (const { key, cultures, kept } of strains) {
      if (next.size >= T.maxTags) break;
      const node = tagNode(key, arena.archetypes.get(cultures[0]!.id));
      const order = kept !== undefined ? [kept, ...cultures.map((c) => c.id)] : cultures.map((c) => c.id);
      for (const id of order) {
        const spot = tagSpot(id, node, placed);
        if (!spot) continue;
        placed.push(spot);
        next.set(key, id);
        break;
      }
    }
    tagged = next;
  };

  const placeTags = (): void => {
    const placed: Rect[] = [];
    for (const [key, id] of tagged) {
      const node = tagNodes.get(key)!;
      const spot = tagSpot(id, node, placed);
      node.classList.toggle('is-shown', !!spot);
      if (!spot) continue;
      placed.push(spot);
      node.style.transform = `translate3d(${spot.x.toFixed(1)}px, ${spot.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    }
    for (const [key, node] of tagNodes) {
      if (!tagged.has(key)) node.classList.remove('is-shown');
    }
  };

  const animate = (now: number): void => {
    requestAnimationFrame(animate);
    if (!screen.classList.contains('visible') || document.hidden) {
      paused = true;
      return;
    }
    if (paused) {
      clock.reset(now);
      measure();
      paused = false;
    }
    let ticks = reducedMotion && warmupLeft === 0 ? 0 : clock.consumeTicks(now);
    for (let i = 0; i < ticks; i += 1) arena.tick(IDLE_INPUT);
    const budgetEnd = performance.now() + T.warmupBudgetMs;
    while (warmupLeft > 0 && performance.now() < budgetEnd) {
      arena.tick(IDLE_INPUT);
      warmupLeft -= 1;
      ticks += 1;
    }
    if (ticks > 0 || dirty) {
      renderer.render(arena.state, arena.archetypes);
      dirty = false;
    }
    if (warmupLeft > 0) return;
    if (now >= nextTagRefresh) {
      chooseTags();
      nextTagRefresh = now + T.tagRefreshMs;
    }
    placeTags();
  };

  window.addEventListener('resize', measure);
  // The copy rises into place and its font loads late; measure once each settles.
  screen.querySelector('.title-card')?.addEventListener('animationend', measure);
  void document.fonts.ready.then(measure);
  measure();
  requestAnimationFrame(animate);
}
