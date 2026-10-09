// Glue between the live arena and the dish label overlay: tracks when each
// strain and event first appeared in this dish, the tapped culture, recent
// culture sizes (for the inspect trend), and the current goal cultures. All
// state is module-local and refreshed at DISH_LABEL_TUNING.updateMs, never
// per frame.
import type { Arena } from '../game/arena';
import { goalCultureIds } from '../game/goalTargets';
import type { ObjectiveDef } from '../content/objectives';
import { lifeformIdentityForSpawn } from '../content/lifeformIdentity';
import { DISH_LABEL_TUNING, planDishLabels, type LabelCulture } from './dishLabels';
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
  /** Highlight the culture under a dish tap. */
  ping(arena: Arena, gridPos: readonly [number, number], nowMs: number): void;
  /** Refresh tags if due. Returns the goal culture ids for the renderer. */
  update(arena: Arena, objective: ObjectiveDef | null, nowMs: number): ReadonlySet<number>;
  /** Desktop hover inspect. Pass null to hide. */
  hover(arena: Arena | null, gridPos: readonly [number, number] | null, localX?: number, localY?: number): void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
}

export function createDishLabelRuntime(options: DishLabelRuntimeOptions): DishLabelRuntime {
  const { overlay, canvas, controlId, gridSize } = options;
  let enabled = true;
  let dishStartMs = 0;
  let lastUpdateMs = Number.NEGATIVE_INFINITY;
  let pingId: number | null = null;
  let pingUntilMs = 0;
  let goalIds: ReadonlySet<number> = new Set();
  let hoverPos: readonly [number, number] | null = null;
  let hoverLocal: [number, number] = [0, 0];
  const strainFirstSeen = new Map<string, number>();
  const eventFirstSeen = new Map<number, number>();
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

  function cultureView(arena: Arena, id: number): Omit<LabelCulture, 'strainFirstSeenMs'> & { role: string; behavior: string } | null {
    const cell = arena.state.cells.get(id);
    if (!cell || cell.vol <= 0) return null;
    if (id === controlId) {
      return {
        id, strainKey: 'control', name: 'Control sample', color: CONTROL_COLOR,
        center: cell.center, vol: cell.vol, isControl: true, isGoal: goalIds.has(id),
        role: 'Reference culture',
        behavior: 'The red anchor. Cultures that drift close attack it.',
      };
    }
    const spawn = arena.archetypes.get(id);
    if (!spawn) return null;
    const identity = lifeformIdentityForSpawn(spawn);
    return {
      id,
      strainKey: spawn.breedId ?? spawn.archetype,
      name: identity.name,
      color: identity.colors.primary,
      center: cell.center,
      vol: cell.vol,
      isControl: false,
      isGoal: goalIds.has(id),
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
    const view = id ? cultureView(arena, id) : null;
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

  return {
    reset(nowMs) {
      dishStartMs = nowMs;
      lastUpdateMs = Number.NEGATIVE_INFINITY;
      pingId = null;
      goalIds = new Set();
      hoverPos = null;
      strainFirstSeen.clear();
      eventFirstSeen.clear();
      volHistory.clear();
      overlay.clear();
    },
    ping(arena, gridPos, nowMs) {
      const id = cultureAt(arena, gridPos);
      pingId = id || null;
      pingUntilMs = nowMs + PING_MS;
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

      const cultures: LabelCulture[] = [];
      for (const [id, cell] of arena.state.cells) {
        if (cell.vol <= 0) {
          volHistory.delete(id);
          continue;
        }
        const view = cultureView(arena, id);
        if (!view) continue;
        if (!strainFirstSeen.has(view.strainKey)) strainFirstSeen.set(view.strainKey, nowMs);
        cultures.push({ ...view, strainFirstSeenMs: strainFirstSeen.get(view.strainKey)! });
        const history = volHistory.get(id) ?? [];
        history.push([nowMs, cell.vol]);
        while (history.length > 0 && nowMs - history[0]![0] > TREND_WINDOW_MS * 2) history.shift();
        volHistory.set(id, history);
      }

      const markers = arena.getDishEvents();
      const liveEventIds = new Set<number>();
      for (const marker of markers) {
        liveEventIds.add(marker.id);
        if (!eventFirstSeen.has(marker.id)) eventFirstSeen.set(marker.id, nowMs);
      }
      for (const id of eventFirstSeen.keys()) if (!liveEventIds.has(id)) eventFirstSeen.delete(id);

      if (pingId !== null && nowMs > pingUntilMs) pingId = null;

      if (enabled) {
        const plan = planDishLabels({
          cultures,
          events: markers.map((marker) => ({
            id: marker.id,
            kind: marker.kind,
            label: marker.label,
            pos: marker.pos,
            ageMs: nowMs - (eventFirstSeen.get(marker.id) ?? nowMs),
          })),
          nowMs,
          dishStartMs,
          gridSize,
          dishPx: canvas.getBoundingClientRect().width || 400,
          pingId,
          compact: options.isCompact(),
        });
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
