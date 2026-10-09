// Glue between the live arena and the dish label overlay: tracks when each
// event first appeared, which strains were just found, the tapped (or freshly
// planted) culture, recent culture sizes (for the inspect trend), and the
// current goal cultures. All state is module-local and refreshed at
// DISH_LABEL_TUNING.updateMs, never per frame.
import type { Arena } from '../game/arena';
import { goalCultureIds } from '../game/goalTargets';
import type { ObjectiveDef } from '../content/objectives';
import { BREED_DEFS, REACTION_RECIPES } from '../content/catalysis';
import { lifeformIdentityForSpawn } from '../content/lifeformIdentity';
import { displayColorForSpawn } from './render';
import {
  DISH_LABEL_TUNING,
  planDishLabels,
  type DishLabelPlacement,
  type LabelCulture,
} from './dishLabels';
import type { DishInspectInfo, DishLabelOverlay } from './dishLabelOverlay';

const CONTROL_COLOR: [number, number, number] = [186, 32, 42];
const PING_MS = 1600;
const TREND_WINDOW_MS = 1200;
const TREND_THRESHOLD = 0.06;

export interface DishLabelRuntimeOptions {
  overlay: DishLabelOverlay;
  canvas: HTMLCanvasElement;
  controlId: number;
  gridSize: number;
  isCompact: () => boolean;
}

export interface DishLabelRuntime {
  reset(nowMs: number): void;
  /** Name the culture under a tap, or a just-planted egg (longer hold). */
  ping(arena: Arena, gridPos: readonly [number, number], nowMs: number, holdMs?: number): void;
  /** Refresh tags if due. Returns the goal culture ids for the renderer. */
  update(arena: Arena, objective: ObjectiveDef | null, nowMs: number): ReadonlySet<number>;
  /** Desktop hover inspect. Pass null to hide. */
  hover(arena: Arena | null, gridPos: readonly [number, number] | null, localX?: number, localY?: number): void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
}

type CultureView = LabelCulture & { role: string; behavior: string };

export function createDishLabelRuntime(options: DishLabelRuntimeOptions): DishLabelRuntime {
  const { overlay, canvas, controlId, gridSize } = options;
  let enabled = true;
  let lastUpdateMs = Number.NEGATIVE_INFINITY;
  let pingId: number | null = null;
  let pingUntilMs = 0;
  let goalIds: ReadonlySet<number> = new Set();
  let hoverPos: readonly [number, number] | null = null;
  let hoverLocal: [number, number] = [0, 0];
  let previous = new Map<string, DishLabelPlacement>();
  const eventFirstSeen = new Map<number, number>();
  const freshStrains = new Map<string, number>();
  const volHistory = new Map<number, Array<[number, number]>>();

  function cultureAt(arena: Arena, pos: readonly [number, number]): number {
    // Nearest owned pixel within a small radius, so a tap on the rim of a
    // thin culture still finds it.
    const { cells, LY } = arena.state.grid;
    const cx = Math.round(pos[0]);
    const cy = Math.round(pos[1]);
    for (let r = 0; r <= 3; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) continue;
          const id = cells[x * LY + y] ?? 0;
          if (id !== 0) return id;
        }
      }
    }
    return 0;
  }

  function cultureView(arena: Arena, id: number, nowMs: number): CultureView | null {
    const cell = arena.state.cells.get(id);
    if (!cell || cell.vol <= 0) return null;
    if (id === controlId) {
      return {
        id, strainKey: 'control', name: 'Control sample', color: CONTROL_COLOR,
        center: cell.center, vol: cell.vol, isControl: true, isGoal: goalIds.has(id), isNew: false,
        role: 'Reference culture',
        behavior: 'The red anchor. Cultures that drift close attack it.',
      };
    }
    const spawn = arena.archetypes.get(id);
    if (!spawn) return null;
    const identity = lifeformIdentityForSpawn(spawn);
    const foundAt = freshStrains.get(identity.name);
    return {
      id,
      strainKey: spawn.breedId ?? spawn.archetype,
      name: identity.name,
      color: displayColorForSpawn(spawn),
      center: cell.center,
      vol: cell.vol,
      isControl: false,
      isGoal: goalIds.has(id),
      isNew: foundAt !== undefined && nowMs - foundAt <= DISH_LABEL_TUNING.newStrainMs,
      role: identity.role,
      behavior: identity.behavior,
    };
  }

  function trendFor(id: number, vol: number, nowMs: number): DishInspectInfo['trend'] {
    const history = volHistory.get(id);
    const past = history?.find(([t]) => nowMs - t <= TREND_WINDOW_MS + DISH_LABEL_TUNING.updateMs);
    if (!past || past[1] <= 0) return 'steady';
    const change = (vol - past[1]) / past[1];
    if (change > TREND_THRESHOLD) return 'growing';
    if (change < -TREND_THRESHOLD) return 'shrinking';
    return 'steady';
  }

  function refreshHover(arena: Arena, nowMs: number): void {
    if (!hoverPos || !enabled) {
      overlay.inspect(null);
      return;
    }
    const id = cultureAt(arena, hoverPos);
    const view = id ? cultureView(arena, id, nowMs) : null;
    if (!view) {
      overlay.inspect(null);
      return;
    }
    overlay.inspect({
      name: view.name,
      role: view.role,
      behavior: view.behavior,
      color: `rgb(${view.color[0]}, ${view.color[1]}, ${view.color[2]})`,
      size: view.vol,
      trend: trendFor(id, view.vol, nowMs),
      isGoal: view.isGoal,
    }, hoverLocal[0], hoverLocal[1]);
  }

  // Event text that names what the current goal asks for (its reaction or
  // strain), so that callout is never crowded out by background churn.
  function goalWordsFor(objective: ObjectiveDef | null): string[] {
    if (!objective) return [];
    const words: string[] = [];
    const recipe = REACTION_RECIPES.find((candidate) => candidate.id === objective.recipeId);
    if (recipe) words.push(recipe.name);
    if (objective.breedId) words.push(BREED_DEFS[objective.breedId].name);
    return words;
  }

  return {
    reset() {
      lastUpdateMs = Number.NEGATIVE_INFINITY;
      pingId = null;
      goalIds = new Set();
      hoverPos = null;
      previous = new Map();
      eventFirstSeen.clear();
      freshStrains.clear();
      volHistory.clear();
      overlay.clear();
    },
    ping(arena, gridPos, nowMs, holdMs = PING_MS) {
      const id = cultureAt(arena, gridPos);
      pingId = id || null;
      pingUntilMs = nowMs + holdMs;
      lastUpdateMs = Number.NEGATIVE_INFINITY;
    },
    update(arena, objective, nowMs) {
      if (nowMs - lastUpdateMs < DISH_LABEL_TUNING.updateMs) return goalIds;
      lastUpdateMs = nowMs;

      const candidates = new Map<number, { spawn: NonNullable<ReturnType<Arena['archetypes']['get']>>; vol: number }>();
      for (const [id, spawn] of arena.archetypes) {
        const cell = arena.state.cells.get(id);
        if (cell) candidates.set(id, { spawn, vol: cell.vol });
      }
      goalIds = objective ? goalCultureIds(objective, candidates) : new Set();

      const markers = arena.getDishEvents();
      const liveEventIds = new Set<number>();
      for (const marker of markers) {
        liveEventIds.add(marker.id);
        if (eventFirstSeen.has(marker.id)) continue;
        eventFirstSeen.set(marker.id, nowMs);
        // The arena only marks strains that are new to the player.
        const found = /^NEW STRAIN:\s*(.+)$/.exec(marker.label);
        if (found) freshStrains.set(found[1]!, nowMs);
      }
      for (const id of eventFirstSeen.keys()) if (!liveEventIds.has(id)) eventFirstSeen.delete(id);

      const cultures: LabelCulture[] = [];
      for (const [id, cell] of arena.state.cells) {
        if (cell.vol <= 0) {
          volHistory.delete(id);
          continue;
        }
        const view = cultureView(arena, id, nowMs);
        if (!view) continue;
        cultures.push(view);
        const history = volHistory.get(id) ?? [];
        history.push([nowMs, cell.vol]);
        while (history.length > 0 && nowMs - history[0]![0] > TREND_WINDOW_MS * 2) history.shift();
        volHistory.set(id, history);
      }

      if (pingId !== null && nowMs > pingUntilMs) pingId = null;

      if (enabled) {
        overlay.fitTo(canvas);
        const goalWords = goalWordsFor(objective);
        const plan = planDishLabels({
          cultures,
          events: markers.map((marker) => ({
            id: marker.id,
            kind: marker.kind,
            label: marker.label,
            pos: marker.pos,
            radius: marker.radius,
            ageMs: nowMs - (eventFirstSeen.get(marker.id) ?? nowMs),
            isGoal: goalWords.some((word) => marker.label.includes(word)),
          })),
          gridSize,
          dishPx: canvas.getBoundingClientRect().width || 400,
          pingId,
          compact: options.isCompact(),
          previous,
        });
        previous = new Map(plan.map((label) => [label.key, label.placement]));
        overlay.render(plan);
        refreshHover(arena, nowMs);
      }
      return goalIds;
    },
    hover(arena, gridPos, localX = 0, localY = 0) {
      hoverPos = gridPos;
      hoverLocal = [localX, localY];
      if (!arena || !gridPos) {
        overlay.inspect(null);
        return;
      }
      refreshHover(arena, performance.now());
    },
    setEnabled(next) {
      enabled = next;
      overlay.setEnabled(next);
      if (!next) overlay.clear();
      lastUpdateMs = Number.NEGATIVE_INFINITY;
    },
    isEnabled() {
      return enabled;
    },
  };
}
