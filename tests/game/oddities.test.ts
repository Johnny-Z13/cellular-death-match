import { describe, expect, it } from 'vitest';
import {
  ODDITIES,
  ODDITY_TUNING,
  createKonamiListener,
  isClosedLoop,
  isEmptyPen,
  loadOddities,
  newOddities,
  odditiesView,
  odditySketch,
  recordOddity,
  spansDish,
  type OddityInput,
} from '../../src/game/oddities';
import { retiredWordsIn } from '../../src/content/glossary';

const quiet: OddityInput = {
  emptyPens: 0, wallsToWall: 0, maxPinchesOfOneStrain: 0, bulletsBlocked: 0, strainsAlive: 2,
  balanceStreakTicks: 0, ticksSinceTool: 0, heldTicks: 0, divisions: 0, biomes: 0,
  faceTapsInWindow: 0, localHour: 14, konami: false,
};

function memoryStorage() {
  const map = new Map<string, string>();
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); } };
}

const ring = (cx: number, cy: number, r: number, n = 24) =>
  Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos((i / n) * Math.PI * 2), cy + r * Math.sin((i / n) * Math.PI * 2)] as const);

describe('oddities', () => {
  it('finds nothing in a quiet, ordinary dish', () => {
    expect(newOddities(quiet, new Set())).toEqual([]);
  });

  it('meets each oddity on its own condition, and never twice', () => {
    const T = ODDITY_TUNING;
    expect(newOddities({ ...quiet, maxPinchesOfOneStrain: T.cuttingsPerStrain }, new Set())).toEqual(['cuttings']);
    expect(newOddities({ ...quiet, bulletsBlocked: T.bulletsBlocked }, new Set())).toEqual(['shield_wall']);
    expect(newOddities({ ...quiet, strainsAlive: 6 }, new Set())).toEqual(['full_spectrum']);
    expect(newOddities({ ...quiet, divisions: T.divisions }, new Set())).toEqual(['mitosis_party']);
    expect(newOddities({ ...quiet, biomes: T.biomes }, new Set())).toEqual(['mapmaker']);
    expect(newOddities({ ...quiet, faceTapsInWindow: T.faceTaps }, new Set())).toEqual(['achoo']);
    expect(newOddities({ ...quiet, localHour: 2 }, new Set())).toEqual(['night_owl']);
    expect(newOddities({ ...quiet, konami: true }, new Set())).toEqual(['disco_dish']);
    expect(newOddities({ ...quiet, konami: true }, new Set(['disco_dish']))).toEqual([]);
  });

  it('only counts a still life when no tool was used during the streak', () => {
    const T = ODDITY_TUNING;
    expect(newOddities({ ...quiet, balanceStreakTicks: T.stillLifeTicks, ticksSinceTool: T.stillLifeTicks - 1 }, new Set())).toEqual([]);
    expect(newOddities({ ...quiet, balanceStreakTicks: T.stillLifeTicks, ticksSinceTool: T.stillLifeTicks }, new Set())).toEqual(['still_life']);
  });

  it('tells a closed, empty pen from an open stroke or an occupied pen', () => {
    const LX = 80;
    const LY = 60;
    const cells = new Uint16Array(LX * LY);
    expect(isClosedLoop(ring(40, 30, 12))).toBe(true);
    expect(isClosedLoop(ring(40, 30, 12).slice(0, 14))).toBe(false);
    expect(isClosedLoop(ring(40, 30, 4))).toBe(false); // too small to count
    expect(isEmptyPen(ring(40, 30, 12), cells, LX, LY)).toBe(true);
    cells[40 * LY + 30] = 7;
    expect(isEmptyPen(ring(40, 30, 12), cells, LX, LY)).toBe(false);
    // A culture outside the ring does not spoil it.
    cells[40 * LY + 30] = 0;
    cells[5 * LY + 5] = 7;
    expect(isEmptyPen(ring(40, 30, 12), cells, LX, LY)).toBe(true);
  });

  it('knows a wall to wall stroke', () => {
    expect(spansDish([[2, 30], [78, 31]], 80, 60)).toBe(true);
    expect(spansDish([[10, 30], [50, 31]], 80, 60)).toBe(false);
    expect(spansDish([[40, 1], [41, 58]], 80, 60)).toBe(true);
  });

  it('hears the key code, case-insensitively, after a false start', () => {
    const hear = createKonamiListener();
    const keys = ['x', 'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'B', 'a'];
    expect(keys.map(hear)).toEqual([...Array(10).fill(false), true]);
  });

  it('saves finds once, survives junk, and shows riddles until found', () => {
    const storage = memoryStorage();
    let save = loadOddities(storage);
    expect(save.found).toEqual([]);
    save = recordOddity(storage, save, 'achoo', new Date('2026-10-19T10:00:00Z'));
    save = recordOddity(storage, save, 'achoo');
    expect(loadOddities(storage).found).toEqual([{ id: 'achoo', foundAt: '2026-10-19T10:00:00.000Z' }]);
    storage.setItem('cellular-death-match.oddities.v1', '{"found":[{"id":"nope"},{"id":"achoo"},{"id":"achoo"},7]}');
    expect(loadOddities(storage).found.map((entry) => entry.id)).toEqual(['achoo']);
    storage.setItem('cellular-death-match.oddities.v1', 'not json');
    expect(loadOddities(storage).found).toEqual([]);

    const view = odditiesView({ found: [{ id: 'achoo', foundAt: '' }] });
    expect(view).toMatchObject({ found: 1, total: ODDITIES.length });
    expect(view.items.find((item) => item.id === 'achoo')!.name).toBe('Achoo!');
    expect(view.items.find((item) => item.id === 'empty_pen')!.name).toBe('???');
    expect(odditySketch({ found: [] }, 0)).toContain(ODDITIES[0]!.riddle);
    expect(odditySketch({ found: ODDITIES.map((def) => ({ id: def.id, foundAt: '' })) }, 0.5)).toBeNull();
  });

  it('speaks the one player vocabulary', () => {
    for (const def of ODDITIES) {
      expect(retiredWordsIn(`${def.name} ${def.riddle} ${def.note}`), def.id).toEqual([]);
      expect(`${def.riddle}`.length, def.id).toBeLessThanOrEqual(60);
    }
  });
});
