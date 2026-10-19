// Oddities: the lab's secrets. Strange things that happen in the dish, or to
// Dr. E, that are not creatures: a fence around nothing, a sneeze, a dish
// that holds itself. Each is found once and kept in the Notebook's Found tab
// with Dr. E's note; until then it shows as a riddle, and Dr. E scribbles the
// odd riddle into the dish log. Detection only reads what the game already
// tracks (Arena.getOddityStats(), the Balance clock, the research archive)
// plus a few shell inputs (taps on Dr. E's face, a key code, the clock).

export type OddityId =
  | 'empty_pen' | 'wall_to_wall' | 'cuttings' | 'shield_wall'
  | 'full_spectrum' | 'still_life' | 'long_hold' | 'mitosis_party'
  | 'mapmaker' | 'achoo' | 'night_owl' | 'disco_dish';

export interface OddityDef {
  id: OddityId;
  name: string;
  /** Shown in the Notebook until found, and scribbled into the log as a hint. */
  riddle: string;
  /** Dr. E's line once found. */
  note: string;
  /** The tile's colour once found. */
  color: [number, number, number];
}

export const ODDITIES: readonly OddityDef[] = [
  { id: 'empty_pen', name: 'Empty Pen', riddle: 'A fence around nothing at all.', note: 'A fence around nothing. Very philosophical.', color: [182, 227, 106] },
  { id: 'wall_to_wall', name: 'Wall to Wall', riddle: 'Split the world in two.', note: 'Wall to wall! Two little worlds now.', color: [214, 246, 178] },
  { id: 'cuttings', name: 'Cuttings', riddle: 'Snip the same strain three times in one dish.', note: 'Three cuttings! The dish is a garden now.', color: [106, 232, 126] },
  { id: 'shield_wall', name: 'Shield Wall', riddle: 'Let gel catch twenty shots.', note: 'Twenty shots and not one got through. Lovely gel.', color: [255, 86, 154] },
  { id: 'full_spectrum', name: 'Full Spectrum', riddle: 'Six strains, all alive at once.', note: 'Six strains at once! It is practically a festival.', color: [246, 255, 96] },
  { id: 'still_life', name: 'Still Life', riddle: 'Hold balance for two minutes without lifting a finger.', note: 'Two minutes and you never touched it. It held itself.', color: [91, 233, 214] },
  { id: 'long_hold', name: 'The Long Hold', riddle: 'Ten minutes of balance in a single dish.', note: 'Ten minutes of balance. The dish has a heartbeat.', color: [132, 236, 255] },
  { id: 'mitosis_party', name: 'Mitosis Party', riddle: 'Eight divisions in a single dish.', note: 'Eight divisions! Everyone is splitting up. In a good way.', color: [255, 190, 82] },
  { id: 'mapmaker', name: 'Mapmaker', riddle: 'Record three different biomes.', note: 'Three biomes. You are mapping a whole little world.', color: [72, 255, 218] },
  { id: 'achoo', name: 'Achoo!', riddle: 'Tickle the doctor.', note: 'Achoo! Pardon me. Spores everywhere.', color: [190, 142, 255] },
  { id: 'night_owl', name: 'Night Owl', riddle: 'Visit the lab when it should be closed.', note: 'Should we not both be asleep?', color: [120, 140, 255] },
  { id: 'disco_dish', name: 'Disco Dish', riddle: 'Up, up, down, down…', note: 'Ooh. The cultures are dancing.', color: [255, 98, 98] },
];

/** Every threshold an oddity reads, in one place to tune. */
export const ODDITY_TUNING = {
  cuttingsPerStrain: 3,
  bulletsBlocked: 20,
  strainsAtOnce: 6,
  /** Still Life: an unbroken balance streak this long with no tool used. */
  stillLifeTicks: 60 * 120,
  longHoldTicks: 60 * 600,
  divisions: 8,
  biomes: 3,
  /** Achoo: taps on Dr. E's face within the window. */
  faceTaps: 5,
  faceTapWindowMs: 3000,
  /** Night Owl: local hours the lab is closed, [from, to). */
  nightHours: [0, 5] as const,
  /** A closed Membrane loop: ends this close, around this much area. */
  penCloseDistance: 10,
  penMinArea: 150,
  /** Wall to Wall: one stroke spanning this share of the dish. */
  wallSpan: 0.85,
};

/** What the detectors read each frame. */
export interface OddityInput {
  emptyPens: number;
  wallsToWall: number;
  /** The most pinches of any one strain this dish. */
  maxPinchesOfOneStrain: number;
  bulletsBlocked: number;
  strainsAlive: number;
  balanceStreakTicks: number;
  ticksSinceTool: number;
  heldTicks: number;
  divisions: number;
  biomes: number;
  faceTapsInWindow: number;
  localHour: number;
  konami: boolean;
}

/** The oddities this input satisfies that are not yet found. */
export function newOddities(input: OddityInput, found: ReadonlySet<OddityId>): OddityId[] {
  const T = ODDITY_TUNING;
  const met: Record<OddityId, boolean> = {
    empty_pen: input.emptyPens > 0,
    wall_to_wall: input.wallsToWall > 0,
    cuttings: input.maxPinchesOfOneStrain >= T.cuttingsPerStrain,
    shield_wall: input.bulletsBlocked >= T.bulletsBlocked,
    full_spectrum: input.strainsAlive >= T.strainsAtOnce,
    still_life: input.balanceStreakTicks >= T.stillLifeTicks && input.ticksSinceTool >= T.stillLifeTicks,
    long_hold: input.heldTicks >= T.longHoldTicks,
    mitosis_party: input.divisions >= T.divisions,
    mapmaker: input.biomes >= T.biomes,
    achoo: input.faceTapsInWindow >= T.faceTaps,
    night_owl: input.localHour >= T.nightHours[0] && input.localHour < T.nightHours[1],
    disco_dish: input.konami,
  };
  return ODDITIES.map((def) => def.id).filter((id) => met[id] && !found.has(id));
}

type Point = readonly [number, number];

/** Shoelace area of a closed polygon. */
function polygonArea(points: readonly Point[]): number {
  let twice = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]!;
    const [x2, y2] = points[(i + 1) % points.length]!;
    twice += x1 * y2 - x2 * y1;
  }
  return Math.abs(twice) / 2;
}

function insidePolygon(x: number, y: number, points: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]!;
    const [xj, yj] = points[j]!;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** A stroke that closes on itself around enough room. */
export function isClosedLoop(points: readonly Point[], tuning = ODDITY_TUNING): boolean {
  if (points.length < 4) return false;
  const [sx, sy] = points[0]!;
  const [ex, ey] = points[points.length - 1]!;
  return Math.hypot(ex - sx, ey - sy) <= tuning.penCloseDistance && polygonArea(points) >= tuning.penMinArea;
}

/** A closed Membrane loop with no culture inside. `cells` is the grid,
 *  x-major (cells[x * LY + y]); any non-zero pixel inside spoils it. */
export function isEmptyPen(points: readonly Point[], cells: ArrayLike<number>, LX: number, LY: number, tuning = ODDITY_TUNING): boolean {
  if (!isClosedLoop(points, tuning)) return false;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs)));
  const x1 = Math.min(LX - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys)));
  const y1 = Math.min(LY - 1, Math.ceil(Math.max(...ys)));
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      if (cells[x * LY + y] !== 0 && insidePolygon(x + 0.5, y + 0.5, points)) return false;
    }
  }
  return true;
}

/** One stroke reaching across most of the dish, side to side or top to bottom. */
export function spansDish(points: readonly Point[], LX: number, LY: number, tuning = ODDITY_TUNING): boolean {
  if (points.length < 2) return false;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return Math.max(...xs) - Math.min(...xs) >= LX * tuning.wallSpan
    || Math.max(...ys) - Math.min(...ys) >= LY * tuning.wallSpan;
}

/** The classic code, as KeyboardEvent.key values. */
export const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'] as const;

/** Feeds keys in; true once the last ten keys spell the code. */
export function createKonamiListener(): (key: string) => boolean {
  let progress = 0;
  return (key) => {
    const k = key.length === 1 ? key.toLowerCase() : key;
    progress = k === KONAMI[progress] ? progress + 1 : k === KONAMI[0] ? 1 : 0;
    if (progress === KONAMI.length) {
      progress = 0;
      return true;
    }
    return false;
  };
}

export const ODDITIES_KEY = 'cellular-death-match.oddities.v1';

export interface OdditiesSave {
  found: Array<{ id: OddityId; foundAt: string }>;
}

const ODDITY_IDS = new Set<string>(ODDITIES.map((def) => def.id));

export function loadOddities(storage: Pick<Storage, 'getItem'>): OdditiesSave {
  try {
    const raw = storage.getItem(ODDITIES_KEY);
    const value = raw ? JSON.parse(raw) as { found?: unknown } : null;
    const found = Array.isArray(value?.found) ? value!.found : [];
    const seen = new Set<string>();
    return {
      found: found.flatMap((entry): OdditiesSave['found'] => {
        const id = (entry as { id?: unknown })?.id;
        const foundAt = (entry as { foundAt?: unknown })?.foundAt;
        if (typeof id !== 'string' || !ODDITY_IDS.has(id) || seen.has(id)) return [];
        seen.add(id);
        return [{ id: id as OddityId, foundAt: typeof foundAt === 'string' ? foundAt : '' }];
      }),
    };
  } catch {
    return { found: [] };
  }
}

export function recordOddity(storage: Pick<Storage, 'setItem'>, save: OdditiesSave, id: OddityId, now = new Date()): OdditiesSave {
  if (save.found.some((entry) => entry.id === id)) return save;
  const next = { found: [...save.found, { id, foundAt: now.toISOString() }] };
  try {
    storage.setItem(ODDITIES_KEY, JSON.stringify(next));
  } catch {
    // A full or blocked store keeps the find for this session only.
  }
  return next;
}

/** The Notebook's view: every oddity, found ones with their notes. */
export interface OdditiesView {
  found: number;
  total: number;
  items: Array<{ id: OddityId; name: string; text: string; color: [number, number, number] | null }>;
}

export function odditiesView(save: OdditiesSave): OdditiesView {
  const found = new Set(save.found.map((entry) => entry.id));
  return {
    found: found.size,
    total: ODDITIES.length,
    items: ODDITIES.map((def) => found.has(def.id)
      ? { id: def.id, name: def.name, text: `Dr. E: “${def.note}”`, color: def.color }
      : { id: def.id, name: '???', text: def.riddle, color: null }),
  };
}

/** A riddle for Dr. E to scribble into the log: an unfound oddity, chosen by
 *  `pick` (0..1), or null once every oddity is found. */
export function odditySketch(save: OdditiesSave, pick: number): string | null {
  const found = new Set(save.found.map((entry) => entry.id));
  const open = ODDITIES.filter((def) => !found.has(def.id));
  if (open.length === 0) return null;
  const def = open[Math.min(open.length - 1, Math.floor(pick * open.length))]!;
  return `Dr. E scribbles in the margin: “${def.riddle}”`;
}
