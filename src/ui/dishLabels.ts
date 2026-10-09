// Dish label planner. Pure: given the living cultures, recent dish events and
// the dish's on-screen size, decide which name tags and event callouts to
// show and where. The overlay (dishLabelOverlay.ts) only renders the plan.
//
// Rules, in priority order: event callouts > tapped culture > goal strains >
// newly found strains > control sample > other strains. One tag per strain,
// on its largest culture that has room (falling back to the next largest).
// Labels sit beside what they name, never on it: a placement that covers a
// culture body is used only when nothing clearer is free. A label already on
// screen keeps its slot and side, so busy dishes do not flicker.
import type { DishEventKind } from '../game/arena';

export const DISH_LABEL_TUNING = {
  /** Overlay refresh interval; labels follow cultures at ~10Hz. */
  updateMs: 100,
  /** Cultures smaller than this (grid pixels) are too small to name. */
  minVol: 14,
  /** A tag already on screen survives down to this size (hysteresis, so a
   *  culture hovering at the floor doesn't blink its tag on and off). */
  holdVol: 8,
  /** A tag moves to a different culture of its strain only when that one
   *  is this much larger than the culture it is on. */
  switchRatio: 1.5,
  /** A tag stays at least this long once shown (while its culture lives). */
  minDwellMs: 1500,
  /** A strain tag that just left can't reappear for this long. */
  reentryMs: 1200,
  /** How long a newly found strain carries its "New ·" tag. */
  newStrainMs: 5000,
  /** How long an event callout stays on the dish. */
  eventMs: 3500,
  maxEvents: 2,
  maxTags: { compact: 5, wide: 7 },
  /** How many of a strain's cultures to try before giving up on its tag. */
  culturesPerStrain: 3,
  /** Tags clear the culture's padded outline (matches the goal ring in
   *  render.ts): equal-area radius × radiusScale + gapGrid. */
  radiusScale: 1.25,
  gapGrid: 3,
  /** Callouts sit this far (grid units, capped) above the event centre. */
  eventLiftGrid: 10,
  /** Rendered tag metrics used for collision estimates (CSS mirrors these). */
  charPx: 7,
  chromePx: 32,
  heightPx: 22,
  stackGapPx: 4,
  /** Tags keep their centre at least this far (percent) from the dish edge. */
  edgePct: 4,
  icons: {
    goal: '◎',
    new: '★',
    control: '◆',
    critical: '▲',
    caution: '!',
    discovery: '★',
    stabilize: '✓',
    mutation: '✦',
    fold: '◇',
  },
  eventColors: {
    critical: '#ff6b4a',
    caution: '#f6d365',
    discovery: '#7ee6ff',
    stabilize: '#84f5a8',
    mutation: '#f6d365',
    fold: '#b771ff',
  },
} as const;

export type DishLabelKind = 'event' | 'ping' | 'goal' | 'new' | 'control' | 'strain';
export type DishLabelPlacement = 'above' | 'below' | 'right' | 'left' | 'above-2' | 'below-2';

export interface LabelCulture {
  id: number;
  strainKey: string;
  name: string;
  /** The culture's on-screen colour (mutation tints included). */
  color: readonly [number, number, number];
  center: readonly [number, number];
  vol: number;
  isControl: boolean;
  isGoal: boolean;
  /** The strain was found for the first time within newStrainMs. */
  isNew: boolean;
}

export interface LabelEvent {
  id: number;
  kind: DishEventKind;
  label: string;
  pos: readonly [number, number];
  radius: number;
  /** Time since the overlay first saw this event. */
  ageMs: number;
  /** The event is the reaction or strain the current goal asks for. */
  isGoal: boolean;
}

export interface DishLabelInput {
  cultures: readonly LabelCulture[];
  events: readonly LabelEvent[];
  gridSize: number;
  /** Rendered dish width in CSS pixels (the dish is square). */
  dishPx: number;
  /** Culture under the most recent tap or the egg just planted, if any. */
  pingId: number | null;
  /** Phones get fewer tags. */
  compact: boolean;
  /** Last plan's labels by key, so tags hold their culture and slot. */
  previous?: ReadonlyMap<string, PreviousLabel>;
  /** Keys still inside their minimum dwell: placed ahead of newcomers. */
  hold?: ReadonlySet<string>;
  /** Fixed UI over the dish (Notebook tab, preview badge), in dish pixels.
   *  Tags never sit under these. */
  obstacles?: readonly DishLabelRect[];
}

export interface PreviousLabel {
  placement: DishLabelPlacement;
  cultureId: number | null;
}

export interface PlannedLabel {
  key: string;
  kind: DishLabelKind;
  text: string;
  icon: string;
  color: string;
  /** Anchor point in percent of the dish. */
  xPct: number;
  yPct: number;
  placement: DishLabelPlacement;
  cultureId: number | null;
}

export interface DishLabelRect { x: number; y: number; w: number; h: number }
type Rect = DishLabelRect;

const KIND_RANK: Record<DishLabelKind, number> = {
  event: 0, ping: 1, goal: 2, new: 3, control: 4, strain: 5,
};

const PLACEMENTS: readonly DishLabelPlacement[] = ['above', 'below', 'right', 'left', 'above-2', 'below-2'];

export function planDishLabels(input: DishLabelInput): PlannedLabel[] {
  const t = DISH_LABEL_TUNING;
  const pxPerGrid = input.dishPx / input.gridSize;
  const placed: Rect[] = [...(input.obstacles ?? [])];
  const out: PlannedLabel[] = [];
  const previous = input.previous ?? new Map<string, PreviousLabel>();

  const living = input.cultures.filter((c) => c.vol > 0);
  const bodies: Rect[] = living
    .filter((c) => c.vol >= t.minVol)
    .map((c) => {
      const r = Math.sqrt(c.vol / Math.PI) * pxPerGrid;
      return { x: c.center[0] * pxPerGrid - r, y: c.center[1] * pxPerGrid - r, w: r * 2, h: r * 2 };
    });

  // ---- Which tags exist, and on which culture ----------------------------
  // Hysteresis everywhere: a tag that is already on screen keeps its
  // culture while that culture is alive and comparable, survives a dip
  // below the size floor, and keeps its key (a ping reuses the strain key)
  // so the element is moved, never recreated.
  const ping = input.pingId === null ? undefined : living.find((c) => c.id === input.pingId);
  const byStrain = new Map<string, LabelCulture[]>();
  for (const c of living) {
    const list = byStrain.get(c.strainKey) ?? [];
    list.push(c);
    byStrain.set(c.strainKey, list);
  }

  interface Candidate { key: string; kind: DishLabelKind; cultures: LabelCulture[]; sticky: boolean }
  const candidates: Candidate[] = [];
  for (const [strainKey, list] of byStrain) {
    const key = `strain-${strainKey}`;
    const prior = previous.get(key);
    const sorted = [...list].sort((a, b) => b.vol - a.vol);
    if (ping && ping.strainKey === strainKey) {
      candidates.push({ key, kind: 'ping', cultures: [ping], sticky: prior?.cultureId === ping.id });
      continue;
    }
    const held = prior ? sorted.find((c) => c.id === prior.cultureId && c.vol >= t.holdVol) : undefined;
    const largest = sorted[0]!;
    const anchor = held && held.vol * t.switchRatio >= largest.vol ? held : largest;
    if (anchor.vol < (anchor === held ? t.holdVol : t.minVol)) continue;
    const others = sorted.filter((c) => c !== anchor && c.vol >= t.minVol).slice(0, t.culturesPerStrain - 1);
    candidates.push({ key, kind: cultureKind(anchor), cultures: [anchor, ...others], sticky: anchor === held });
  }
  candidates.sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind]
    || Number(previous.has(b.key)) - Number(previous.has(a.key))
    || b.cultures[0]!.vol - a.cultures[0]!.vol);

  const maxTags = input.compact ? t.maxTags.compact : t.maxTags.wide;
  let tags = 0;
  const placedKeys = new Set<string>();

  // ---- Pass 1: tags already on screen hold their slot ---------------------
  // Sticky tags keep their exact side; tags inside their minimum dwell keep
  // their place in the budget even if they had to move culture.
  const hold = input.hold ?? new Set<string>();
  for (const candidate of candidates) {
    if (tags >= maxTags) break;
    const prior = previous.get(candidate.key);
    let label: PlannedLabel | null = null;
    if (candidate.sticky && prior) {
      label = placeTag(candidate, candidate.cultures[0]!, [prior.placement], false);
    }
    if (!label && hold.has(candidate.key)) {
      const order = prior ? [prior.placement, ...PLACEMENTS.filter((p) => p !== prior.placement)] : PLACEMENTS;
      for (const c of candidate.cultures) {
        label = placeTag(candidate, c, order, true);
        if (label) break;
      }
    }
    if (!label) continue;
    out.push(label);
    placedKeys.add(candidate.key);
    tags += 1;
  }

  // ---- Pass 2: event callouts fit around the tags -------------------------
  const seenText = new Set<string>();
  const events = input.events
    .filter((event) => event.ageMs <= t.eventMs)
    .map((event) => ({ event, text: humanEventLabel(event.label) }))
    .filter((entry): entry is { event: LabelEvent; text: string } => entry.text !== null)
    .sort((a, b) => Number(b.event.isGoal) - Number(a.event.isGoal) || a.event.ageMs - b.event.ageMs);
  let eventCount = 0;
  const calloutStrains = new Set<string>();
  for (const { event, text } of events) {
    if (eventCount >= t.maxEvents) break;
    if (seenText.has(text)) continue;
    seenText.add(text);
    const key = `event-${event.id}`;
    const prior = previous.get(key);
    const label = place(
      { key, kind: 'event', text, icon: t.icons[event.kind], color: t.eventColors[event.kind], cultureId: null },
      event.pos[0], event.pos[1], Math.min(event.radius, t.eventLiftGrid),
      prior ? [prior.placement, ...PLACEMENTS.filter((p) => p !== prior.placement)] : PLACEMENTS,
      true,
    );
    if (!label) continue;
    out.push(label);
    eventCount += 1;
    const strain = /^New strain: (.+)$/.exec(text);
    if (strain) calloutStrains.add(strain[1]!);
  }

  // ---- Pass 3: everything else, in priority order -------------------------
  for (const candidate of candidates) {
    if (tags >= maxTags) break;
    if (placedKeys.has(candidate.key)) continue;
    // A "New strain" callout already names this strain; don't stack a tag.
    if (candidate.kind !== 'ping' && calloutStrains.has(candidate.cultures[0]!.name)) continue;
    const prior = previous.get(candidate.key);
    for (const c of candidate.cultures) {
      const order = prior && prior.cultureId === c.id
        ? [prior.placement, ...PLACEMENTS.filter((p) => p !== prior.placement)]
        : PLACEMENTS;
      const label = placeTag(candidate, c, order, true);
      if (label) {
        out.push(label);
        placedKeys.add(candidate.key);
        tags += 1;
        break;
      }
    }
  }
  return out;

  function placeTag(
    candidate: Candidate,
    c: LabelCulture,
    order: readonly DishLabelPlacement[],
    avoidBodies: boolean,
  ): PlannedLabel | null {
    const kind = candidate.kind === 'ping' ? 'ping' : cultureKind(c);
    const offset = Math.sqrt(c.vol / Math.PI) * t.radiusScale + t.gapGrid;
    return place(
      {
        key: candidate.key,
        kind,
        text: kind === 'new' ? `New · ${c.name}` : c.name,
        icon: kind === 'goal' ? t.icons.goal
          : kind === 'new' ? t.icons.new
            : kind === 'control' ? t.icons.control
              : '',
        color: `rgb(${c.color[0]}, ${c.color[1]}, ${c.color[2]})`,
        cultureId: c.id,
      },
      c.center[0], c.center[1], offset, order, avoidBodies,
    );
  }

  function place(
    base: Omit<PlannedLabel, 'xPct' | 'yPct' | 'placement'>,
    gx: number,
    gy: number,
    offsetGrid: number,
    order: readonly DishLabelPlacement[],
    avoidBodies: boolean,
  ): PlannedLabel | null {
    const w = labelWidthPx(base.text, base.icon);
    const h = t.heightPx;
    const offsetPx = offsetGrid * pxPerGrid;
    const cx = gx * pxPerGrid;
    const cy = gy * pxPerGrid;
    let fallback: { rect: Rect; placement: DishLabelPlacement } | null = null;
    for (const placement of order) {
      const rect = rectFor(placement, cx, cy, offsetPx, w, h, input.dishPx);
      if (!rect) continue;
      if (placed.some((other) => overlaps(rect, other))) continue;
      if (avoidBodies && bodies.some((body) => overlaps(rect, body))) {
        fallback ??= { rect, placement };
        continue;
      }
      return commit(rect, placement);
    }
    return fallback ? commit(fallback.rect, fallback.placement) : null;

    function commit(rect: Rect, placement: DishLabelPlacement): PlannedLabel {
      placed.push(rect);
      // Anchor point the CSS transform hangs the tag from (see is-* classes).
      const ax = rect.x + rect.w / 2;
      const ay = placement.startsWith('above') ? rect.y + rect.h
        : placement.startsWith('below') ? rect.y
          : rect.y + rect.h / 2;
      return { ...base, xPct: (ax / input.dishPx) * 100, yPct: (ay / input.dishPx) * 100, placement };
    }
  }
}

// The rectangle a tag occupies for a placement around a culture centre, kept
// inside the dish; null when the placement has no room at all.
function rectFor(
  placement: DishLabelPlacement,
  cx: number,
  cy: number,
  offset: number,
  w: number,
  h: number,
  dishPx: number,
): Rect | null {
  const t = DISH_LABEL_TUNING;
  const stack = h + t.stackGapPx;
  const edge = (t.edgePct / 100) * dishPx;
  const clampX = (x: number) => clamp(x, Math.min(edge, (dishPx - w) / 2), Math.max(dishPx - w - edge, (dishPx - w) / 2));
  let x: number;
  let y: number;
  if (placement === 'right' || placement === 'left') {
    x = placement === 'right' ? cx + offset : cx - offset - w;
    y = cy - h / 2;
    if (x < 0 || x + w > dishPx) return null;
  } else {
    x = clampX(cx - w / 2);
    y = placement === 'above' ? cy - offset - h
      : placement === 'below' ? cy + offset
        : placement === 'above-2' ? cy - offset - h - stack
          : cy + offset + stack;
  }
  if (y < 0 || y + h > dishPx) return null;
  return { x, y, w, h };
}

function cultureKind(c: LabelCulture): DishLabelKind {
  if (c.isControl) return 'control';
  if (c.isGoal) return 'goal';
  if (c.isNew) return 'new';
  return 'strain';
}

function labelWidthPx(text: string, icon: string): number {
  const t = DISH_LABEL_TUNING;
  return text.length * t.charPx + t.chromePx + (icon ? 12 : 0);
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Short sentence-case callout for a dish event marker, or null to suppress
 *  the duplicate FLASH/SPARK markers that accompany a reaction. */
export function humanEventLabel(raw: string): string | null {
  const text = raw.trim();
  if (/\s(FLASH|SPARK)$/.test(text)) return null;
  const strain = /^NEW STRAIN:\s*(.+)$/.exec(text);
  if (strain) return `New strain: ${strain[1]}`;
  const fault = /^FOLDING FAULT:\s*(.+?) discovered\.?$/.exec(text);
  if (fault) return fault[1]!.toLowerCase() === 'folding fault' ? 'Folding fault' : `Folding fault: ${fault[1]}`;
  const reaction = /^(?:[A-Z][a-z]+ reaction|Reaction):\s*(.+?) discovered\.?$/.exec(text);
  if (reaction) return `Reaction: ${reaction[1]}`;
  if (text === 'VISIBLE MUTATION') return 'Mutation';
  // Field events are named so they can't be mistaken for the Bloom Mass strain.
  if (text === 'AGAR BLOOM') return 'Fertile patch';
  if (text === 'BLOOM REACTION') return 'Growth burst';
  if (text === 'ROGUE CHEMICAL') return 'Rogue chemical';
  if (text === text.toUpperCase()) return text.charAt(0) + text.slice(1).toLowerCase();
  return text;
}

// ---- Dwell: calm appear / disappear ----------------------------------------
// The planner is re-run ten times a second; this memory turns its answers
// into a calm display. A shown tag is held for minDwellMs (fed back to the
// planner as `hold`), and a plain strain tag that just left waits reentryMs
// before it may return. Goal tags, pings and callouts are never delayed.

export interface LabelDwell {
  shownAt: Map<string, number>;
  removedAt: Map<string, number>;
}

export function createLabelDwell(): LabelDwell {
  return { shownAt: new Map(), removedAt: new Map() };
}

export function labelHoldKeys(memory: LabelDwell, nowMs: number): Set<string> {
  const keys = new Set<string>();
  for (const [key, at] of memory.shownAt) {
    if (nowMs - at < DISH_LABEL_TUNING.minDwellMs) keys.add(key);
  }
  return keys;
}

const NEVER_DELAYED: ReadonlySet<DishLabelKind> = new Set(['event', 'ping', 'goal', 'new']);

export function applyLabelDwell(plan: readonly PlannedLabel[], memory: LabelDwell, nowMs: number): PlannedLabel[] {
  const shown: PlannedLabel[] = [];
  for (const label of plan) {
    const wasShown = memory.shownAt.has(label.key);
    const leftAt = memory.removedAt.get(label.key);
    if (!wasShown && leftAt !== undefined && !NEVER_DELAYED.has(label.kind)
      && nowMs - leftAt < DISH_LABEL_TUNING.reentryMs) continue;
    if (!wasShown) memory.shownAt.set(label.key, nowMs);
    memory.removedAt.delete(label.key);
    shown.push(label);
  }
  const live = new Set(shown.map((label) => label.key));
  for (const key of [...memory.shownAt.keys()]) {
    if (live.has(key)) continue;
    memory.shownAt.delete(key);
    memory.removedAt.set(key, nowMs);
  }
  return shown;
}
