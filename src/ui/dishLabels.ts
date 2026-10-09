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
  chromePx: 28,
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
export type DishLabelPlacement = 'above' | 'below' | 'above-2' | 'below-2';

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
  /** Last plan's placements by key, so labels hold their slot. */
  previous?: ReadonlyMap<string, DishLabelPlacement>;
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

const PLACEMENTS: readonly DishLabelPlacement[] = ['above', 'below', 'above-2', 'below-2'];

export function planDishLabels(input: DishLabelInput): PlannedLabel[] {
  const t = DISH_LABEL_TUNING;
  const pxPerGrid = input.dishPx / input.gridSize;
  const placed: Rect[] = [];
  const out: PlannedLabel[] = [];
  const previous = input.previous ?? new Map<string, DishLabelPlacement>();

  const living = input.cultures.filter((c) => c.vol > 0);
  const bodies: Rect[] = living
    .filter((c) => c.vol >= t.minVol)
    .map((c) => {
      const r = Math.sqrt(c.vol / Math.PI) * pxPerGrid;
      return { x: c.center[0] * pxPerGrid - r, y: c.center[1] * pxPerGrid - r, w: r * 2, h: r * 2 };
    });

  // ---- Event callouts ----------------------------------------------------
  const seenText = new Set<string>();
  const calloutStrains = new Set<string>();
  const events = input.events
    .filter((event) => event.ageMs <= t.eventMs)
    .map((event) => ({ event, text: humanEventLabel(event.label) }))
    .filter((entry): entry is { event: LabelEvent; text: string } => entry.text !== null)
    .sort((a, b) => Number(b.event.isGoal) - Number(a.event.isGoal) || a.event.ageMs - b.event.ageMs);
  let eventCount = 0;
  for (const { event, text } of events) {
    if (eventCount >= t.maxEvents) break;
    if (seenText.has(text)) continue;
    seenText.add(text);
    const label = place(
      {
        key: `event-${event.id}`,
        kind: 'event',
        text,
        icon: t.icons[event.kind],
        color: t.eventColors[event.kind],
        cultureId: null,
      },
      event.pos[0], event.pos[1], Math.min(event.radius, t.eventLiftGrid), `event-${event.id}`,
    );
    if (!label) continue;
    out.push(label);
    eventCount += 1;
    const strain = /^New strain: (.+)$/.exec(text);
    if (strain) calloutStrains.add(strain[1]!);
  }

  // ---- Culture tags ------------------------------------------------------
  const byStrain = new Map<string, LabelCulture[]>();
  for (const c of living) {
    if (c.vol < t.minVol) continue;
    const list = byStrain.get(c.strainKey) ?? [];
    list.push(c);
    byStrain.set(c.strainKey, list);
  }
  const ping = input.pingId === null ? undefined : living.find((c) => c.id === input.pingId);

  interface Candidate { key: string; kind: DishLabelKind; cultures: LabelCulture[] }
  const candidates: Candidate[] = [];
  if (ping) candidates.push({ key: `ping-${ping.id}`, kind: 'ping', cultures: [ping] });
  for (const [strainKey, list] of byStrain) {
    // A ping already names this strain; one tag per name is enough.
    if (ping && ping.strainKey === strainKey) continue;
    const cultures = list
      .sort((a, b) => b.vol - a.vol)
      .slice(0, t.culturesPerStrain);
    if (cultures.length === 0) continue;
    // A "New strain" callout already names this strain; don't stack a tag.
    if (calloutStrains.has(cultures[0]!.name)) continue;
    candidates.push({ key: `strain-${strainKey}`, kind: cultureKind(cultures[0]!), cultures });
  }
  candidates.sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind]
    || Number(previous.has(b.key)) - Number(previous.has(a.key))
    || b.cultures[0]!.vol - a.cultures[0]!.vol);

  const maxTags = input.compact ? t.maxTags.compact : t.maxTags.wide;
  let tags = 0;
  for (const candidate of candidates) {
    if (tags >= maxTags) break;
    for (const c of candidate.cultures) {
      const kind = candidate.kind === 'ping' ? 'ping' : cultureKind(c);
      const offset = Math.sqrt(c.vol / Math.PI) * t.radiusScale + t.gapGrid;
      const label = place(
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
        c.center[0], c.center[1], offset, candidate.key,
      );
      if (label) {
        out.push(label);
        tags += 1;
        break;
      }
    }
  }
  return out;

  function place(
    base: Omit<PlannedLabel, 'xPct' | 'yPct' | 'placement'>,
    gx: number,
    gy: number,
    offsetGrid: number,
    key: string,
  ): PlannedLabel | null {
    const w = labelWidthPx(base.text, base.icon);
    const h = t.heightPx;
    const halfWPct = Math.min(50, (w / 2 / input.dishPx) * 100);
    const xPct = clamp((gx / input.gridSize) * 100, Math.max(t.edgePct, halfWPct), 100 - Math.max(t.edgePct, halfWPct));
    const x = (xPct / 100) * input.dishPx - w / 2;
    const offsetPx = offsetGrid * pxPerGrid;
    const prior = previous.get(key);
    const order = prior ? [prior, ...PLACEMENTS.filter((p) => p !== prior)] : PLACEMENTS;
    let fallback: { rect: Rect; placement: DishLabelPlacement } | null = null;
    for (const placement of order) {
      const top = topFor(placement, gy * pxPerGrid, offsetPx, h);
      if (top < 0 || top + h > input.dishPx) continue;
      const rect = { x, y: top, w, h };
      if (placed.some((other) => overlaps(rect, other))) continue;
      if (bodies.some((body) => overlaps(rect, body))) {
        fallback ??= { rect, placement };
        continue;
      }
      return commit(rect, placement);
    }
    return fallback ? commit(fallback.rect, fallback.placement) : null;

    function commit(rect: Rect, placement: DishLabelPlacement): PlannedLabel {
      placed.push(rect);
      const yPx = placement.startsWith('above') ? rect.y + h : rect.y;
      return { ...base, xPct, yPct: (yPx / input.dishPx) * 100, placement };
    }
  }
}

function topFor(placement: DishLabelPlacement, centreY: number, offset: number, h: number): number {
  const stack = h + DISH_LABEL_TUNING.stackGapPx;
  if (placement === 'above') return centreY - offset - h;
  if (placement === 'below') return centreY + offset;
  if (placement === 'above-2') return centreY - offset - h - stack;
  return centreY + offset + stack;
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
