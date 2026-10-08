// Dish label planner. Pure: given the living cultures, recent dish events and
// the dish's on-screen size, decide which name tags and event callouts to
// show and where. The overlay (dishLabelOverlay.ts) only renders the plan.
//
// Rules, in priority order: event callouts > tapped culture > goal strains >
// newly appeared strains > control sample > other strains. One tag per
// strain, on its largest culture. A tag that would overlap a higher-priority
// one tries the other side of its culture, then yields.
import type { DishEventKind } from '../game/arena';

export const DISH_LABEL_TUNING = {
  /** Overlay refresh interval; labels follow cultures at ~10Hz. */
  updateMs: 100,
  /** Cultures smaller than this (grid pixels) are too small to name. */
  minVol: 14,
  /** A strain first seen this long after the dish opened counts as new. */
  newStrainGraceMs: 2500,
  /** How long a newly appeared strain carries its "New ·" tag. */
  newStrainMs: 5000,
  /** How long an event callout stays on the dish. */
  eventMs: 3500,
  maxEvents: 2,
  maxTags: { compact: 5, wide: 7 },
  /** Gap between a culture's edge and its tag, in grid units. */
  gapGrid: 2.5,
  /** Rendered tag metrics used for collision estimates (CSS mirrors these). */
  charPx: 7,
  chromePx: 28,
  heightPx: 22,
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
export type DishLabelPlacement = 'above' | 'below' | 'center';

export interface LabelCulture {
  id: number;
  strainKey: string;
  name: string;
  color: readonly [number, number, number];
  center: readonly [number, number];
  vol: number;
  isControl: boolean;
  isGoal: boolean;
  /** When this culture's strain was first seen in the current dish. */
  strainFirstSeenMs: number;
}

export interface LabelEvent {
  id: number;
  kind: DishEventKind;
  label: string;
  pos: readonly [number, number];
  /** Time since the overlay first saw this event. */
  ageMs: number;
}

export interface DishLabelInput {
  cultures: readonly LabelCulture[];
  events: readonly LabelEvent[];
  nowMs: number;
  dishStartMs: number;
  gridSize: number;
  /** Rendered dish width in CSS pixels (the dish is square). */
  dishPx: number;
  /** Culture under the most recent tap, if any. */
  pingId: number | null;
  /** Phones get fewer tags. */
  compact: boolean;
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

interface Rect { x: number; y: number; w: number; h: number }

const KIND_RANK: Record<DishLabelKind, number> = {
  event: 0, ping: 1, goal: 2, new: 3, control: 4, strain: 5,
};

export function planDishLabels(input: DishLabelInput): PlannedLabel[] {
  const t = DISH_LABEL_TUNING;
  const pxPerGrid = input.dishPx / input.gridSize;
  const placed: Rect[] = [];
  const out: PlannedLabel[] = [];

  // ---- Event callouts ----------------------------------------------------
  const events = input.events
    .filter((event) => event.ageMs <= t.eventMs)
    .map((event) => ({ event, text: humanEventLabel(event.label) }))
    .filter((entry): entry is { event: LabelEvent; text: string } => entry.text !== null)
    .sort((a, b) => a.event.ageMs - b.event.ageMs);
  for (const { event, text } of events) {
    if (out.length >= t.maxEvents) break;
    const label = place(
      {
        key: `event-${event.id}`,
        kind: 'event',
        text,
        icon: t.icons[event.kind],
        color: t.eventColors[event.kind],
        cultureId: null,
      },
      event.pos[0], event.pos[1], 0, ['center'],
    );
    if (label) out.push(label);
  }

  // ---- Culture tags ------------------------------------------------------
  const living = input.cultures.filter((c) => c.vol > 0);
  const largestByStrain = new Map<string, LabelCulture>();
  for (const c of living) {
    if (c.vol < t.minVol) continue;
    const current = largestByStrain.get(c.strainKey);
    if (!current || c.vol > current.vol) largestByStrain.set(c.strainKey, c);
  }

  const candidates: Array<{ culture: LabelCulture; kind: DishLabelKind }> = [];
  const ping = input.pingId === null ? undefined : living.find((c) => c.id === input.pingId);
  if (ping) candidates.push({ culture: ping, kind: 'ping' });
  for (const c of largestByStrain.values()) {
    if (c.id === ping?.id) continue;
    candidates.push({ culture: c, kind: cultureKind(c, input) });
  }
  candidates.sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || b.culture.vol - a.culture.vol);

  const maxTags = input.compact ? t.maxTags.compact : t.maxTags.wide;
  let tags = 0;
  for (const { culture: c, kind } of candidates) {
    if (tags >= maxTags) break;
    const radius = Math.sqrt(c.vol / Math.PI);
    const label = place(
      {
        key: `culture-${c.id}`,
        kind,
        text: kind === 'new' ? `New · ${c.name}` : c.name,
        icon: kind === 'goal' ? t.icons.goal
          : kind === 'new' ? t.icons.new
            : kind === 'control' ? t.icons.control
              : '',
        color: `rgb(${c.color[0]}, ${c.color[1]}, ${c.color[2]})`,
        cultureId: c.id,
      },
      c.center[0], c.center[1], radius + t.gapGrid, ['above', 'below'],
    );
    if (label) {
      out.push(label);
      tags += 1;
    }
  }
  return out;

  function place(
    base: Omit<PlannedLabel, 'xPct' | 'yPct' | 'placement'>,
    gx: number,
    gy: number,
    offsetGrid: number,
    placements: readonly DishLabelPlacement[],
  ): PlannedLabel | null {
    const w = labelWidthPx(base.text, base.icon);
    const h = t.heightPx;
    const halfWPct = Math.min(50, (w / 2 / input.dishPx) * 100);
    const xPct = clamp((gx / input.gridSize) * 100, Math.max(t.edgePct, halfWPct), 100 - Math.max(t.edgePct, halfWPct));
    const x = (xPct / 100) * input.dishPx - w / 2;
    for (const placement of placements) {
      const anchorY = placement === 'above' ? (gy - offsetGrid) * pxPerGrid
        : placement === 'below' ? (gy + offsetGrid) * pxPerGrid
          : gy * pxPerGrid;
      const top = placement === 'above' ? anchorY - h : placement === 'below' ? anchorY : anchorY - h / 2;
      if (top < 0 || top + h > input.dishPx) {
        if (placement !== 'center') continue;
      }
      const rect = { x, y: clamp(top, 0, input.dishPx - h), w, h };
      if (placed.some((other) => overlaps(rect, other))) continue;
      placed.push(rect);
      const yPx = placement === 'above' ? rect.y + h : placement === 'below' ? rect.y : rect.y + h / 2;
      return { ...base, xPct, yPct: (yPx / input.dishPx) * 100, placement };
    }
    return null;
  }
}

function cultureKind(c: LabelCulture, input: DishLabelInput): DishLabelKind {
  if (c.isControl) return 'control';
  if (c.isGoal) return 'goal';
  const t = DISH_LABEL_TUNING;
  const appearedMidDish = c.strainFirstSeenMs - input.dishStartMs > t.newStrainGraceMs;
  if (appearedMidDish && input.nowMs - c.strainFirstSeenMs <= t.newStrainMs) return 'new';
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
  const strain = /^NEW LIFEFORM:\s*(.+)$/.exec(text);
  if (strain) return `New strain: ${strain[1]}`;
  const fault = /^FOLDING FAULT:\s*(.+?) discovered\.?$/.exec(text);
  if (fault) return fault[1]!.toLowerCase() === 'folding fault' ? 'Folding fault' : `Folding fault: ${fault[1]}`;
  const reaction = /^CATALYTIC [A-Z]+:\s*(.+?) discovered\.?$/.exec(text);
  if (reaction) return `Reaction: ${reaction[1]}`;
  if (text === 'VISIBLE MUTATION') return 'Mutation';
  if (text === 'ROGUE REAGENT') return 'Rogue chemical';
  if (text === text.toUpperCase()) return text.charAt(0) + text.slice(1).toLowerCase();
  return text;
}
