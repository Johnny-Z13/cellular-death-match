// Merge census: which small groups of cultures already hold together in the
// dishes we ship, and for how long. Each dish opens like a player opens it;
// every --scan ticks the probe builds the contact graph and records how long
// each touching set of 2..--max cultures keeps its exact members and contact
// pattern. Times are game seconds at 60 ticks/s (the title dish runs at half
// speed on screen, so its holds look twice as long there).
//
// usage: npx vite-node scripts/merge-census.ts -- [--seeds 12] [--seconds 180] [--dish all|trial1..trial5|openlab|title] [--scan 10] [--max 4] [--top 30] [--json out.json]
import { writeFileSync } from 'node:fs';
import { createRun } from '../src/game/run';
import { createArena, type Arena } from '../src/game/arena';
import { ARCHETYPE_DEFAULTS, type EnemyArchetype } from '../src/content/enemies';
import { OPEN_LAB_LIFE_CYCLE } from '../src/content/ecologyTuning';
import { COMMON_COLD_CASE } from '../src/content/researchCases';
import { TITLE_DISH_TUNING } from '../src/ui/titleDish';
import { buildContactGraph, canonicalShape, connectedSubsets, contactComponents } from '../src/game/contactGraph';

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
};
const DISHES = ['trial1', 'trial2', 'trial3', 'trial4', 'trial5', 'openlab', 'title'] as const;
type DishId = (typeof DISHES)[number];
const SEEDS = Number(arg('seeds', '12'));
const SECONDS = Number(arg('seconds', '180'));
const SCAN = Number(arg('scan', '10'));
const MAX = Number(arg('max', '4'));
const TOP = Number(arg('top', '30'));
const JSON_OUT = arg('json', '');
const DISH_ARG = arg('dish', 'all');
const RUN_DISHES: DishId[] = DISH_ARG === 'all' ? [...DISHES] : [DISH_ARG as DishId];
if (!RUN_DISHES.every((d) => (DISHES as readonly string[]).includes(d))) throw new Error(`unknown dish ${DISH_ARG}`);
const TPS = 60;
const EGGS: EnemyArchetype[] = ['swarmlet', 'bruiser', 'splitter', 'sniper', 'mirror', 'swarmlet'];
const IDLE = { moveVec: [0, 0] as [number, number], shouldFire: false, shouldEngulf: false };
// The shape Johnny saw on the title: one green Splitter with two red cultures.
const RED = new Set(['sniper', 'control', 'boss']);

function openDish(dish: DishId, seed: number): Arena {
  if (dish === 'title') {
    // As src/ui/titleDish.ts builds it, at the 1440x900 window's grid.
    const arena = createArena({
      LX: 219, LY: 137, seed, player: createRun(seed).getPlayerConfig(),
      enemies: TITLE_DISH_TUNING.strains.map((a) => ({ ...ARCHETYPE_DEFAULTS[a] })),
      wrap: false, mode: 'ecosystem', includeControlSample: true, fightIndex: COMMON_COLD_CASE.trials.length,
      worldEventIntensity: 0, knownBreedIds: new Set(), lifeCycle: OPEN_LAB_LIFE_CYCLE, breedDiscovery: false,
    });
    arena.setHazardsHeld(true);
    return arena;
  }
  const run = createRun(seed);
  // The open lab copies scripts/dish-longevity.ts; trials restore their fight index.
  const fightIndex = dish === 'openlab' ? 6 : Number(dish.slice(5)) - 1;
  if (dish !== 'openlab') run.restore({ ...run.getState(), phase: 'arena', fightIndex });
  const onboarding = fightIndex === 0;
  const arena = createArena({
    LX: 160, LY: 160, seed, player: run.getPlayerConfig(),
    enemies: onboarding ? run.getOnboardingSpawnList() : run.getEpochSpawnList(),
    wrap: false, mode: 'ecosystem', includeControlSample: !onboarding, objective: run.getObjective(),
    fightIndex, knownBreedIds: new Set(),
    lifeCycle: fightIndex >= COMMON_COLD_CASE.trials.length ? OPEN_LAB_LIFE_CYCLE : 'arena',
  });
  // Open the dish like a player: six eggs in a ring, honouring cooldowns; an
  // egg the dish refuses is skipped after 15 s.
  for (let i = 0; i < EGGS.length; i++) {
    const a = (i / EGGS.length) * Math.PI * 2;
    const pos: [number, number] = [80 + 38 * Math.cos(a), 80 + 38 * Math.sin(a)];
    let guard = 0;
    while (!arena.applyTool('egg', pos, { eggArchetype: EGGS[i] }) && guard++ < 900) arena.tick(IDLE);
    arena.tick(IDLE);
  }
  return arena;
}

interface Episode { shape: string; seconds: number; isolated: boolean }

let scanMsTotal = 0;
let scans = 0;

function census(dish: DishId, seed: number): Episode[] {
  const arena = openDish(dish, seed);
  const strainOf = (id: number): string | null => {
    if (id === 1) return 'control';
    const spawn = arena.archetypes.get(id);
    return spawn ? spawn.breedId ?? spawn.archetype : null;
  };
  const active = new Map<string, { shape: string; scans: number; isolatedScans: number }>();
  const episodes: Episode[] = [];
  const close = (key: string): void => {
    const entry = active.get(key)!;
    episodes.push({ shape: entry.shape, seconds: (entry.scans * SCAN) / TPS, isolated: entry.isolatedScans * 2 >= entry.scans });
    active.delete(key);
  };
  for (let tick = 1; tick <= SECONDS * TPS; tick++) {
    arena.tick(IDLE);
    if (tick % SCAN !== 0) continue;
    const began = performance.now();
    const graph = buildContactGraph(arena.state, strainOf);
    const whole = new Set(contactComponents(graph).map((group) => group.join(',')));
    const seen = new Set<string>();
    for (const ids of connectedSubsets(graph, MAX)) {
      const members = ids.join(',');
      const shape = canonicalShape(graph, ids);
      const key = `${members}|${shape}`;
      seen.add(key);
      const entry = active.get(key) ?? { shape, scans: 0, isolatedScans: 0 };
      entry.scans += 1;
      if (whole.has(members)) entry.isolatedScans += 1;
      active.set(key, entry);
    }
    scanMsTotal += performance.now() - began;
    scans += 1;
    for (const key of [...active.keys()]) if (!seen.has(key)) close(key);
  }
  for (const key of [...active.keys()]) close(key);
  return episodes;
}

interface ShapeRow { shape: string; episodes: number; held2: number; held4: number; held8: number; medianHold: number; longest: number; isolatedShare: number; seeds: number }

function summarise(perSeed: Episode[][]): ShapeRow[] {
  const byShape = new Map<string, { holds: number[]; isolated: number; seeds: Set<number> }>();
  perSeed.forEach((episodes, seedIndex) => {
    for (const e of episodes) {
      const row = byShape.get(e.shape) ?? { holds: [], isolated: 0, seeds: new Set<number>() };
      row.holds.push(e.seconds);
      if (e.isolated) row.isolated += 1;
      row.seeds.add(seedIndex);
      byShape.set(e.shape, row);
    }
  });
  return [...byShape].map(([shape, row]) => {
    const holds = [...row.holds].sort((a, b) => a - b);
    return {
      shape, episodes: holds.length,
      held2: holds.filter((s) => s >= 2).length, held4: holds.filter((s) => s >= 4).length, held8: holds.filter((s) => s >= 8).length,
      medianHold: holds[Math.floor(holds.length / 2)] ?? 0, longest: holds.at(-1) ?? 0,
      isolatedShare: row.isolated / holds.length, seeds: row.seeds.size,
    };
  }).sort((a, b) => b.held4 - a.held4 || b.held2 - a.held2 || b.episodes - a.episodes);
}

const printRows = (rows: ShapeRow[]): void => {
  console.log(`  ${'shape'.padEnd(58)} ${'eps'.padStart(6)} ${'>=2s'.padStart(6)} ${'>=4s'.padStart(6)} ${'>=8s'.padStart(6)} ${'median'.padStart(7)} ${'longest'.padStart(8)} ${'isolated'.padStart(9)} ${'seeds'.padStart(6)}`);
  for (const r of rows) {
    console.log(`  ${r.shape.padEnd(58)} ${String(r.episodes).padStart(6)} ${String(r.held2).padStart(6)} ${String(r.held4).padStart(6)} ${String(r.held8).padStart(6)} ${r.medianHold.toFixed(1).padStart(7)} ${r.longest.toFixed(1).padStart(8)} ${(r.isolatedShare * 100).toFixed(0).padStart(8)}% ${String(r.seeds).padStart(6)}`);
  }
};

const isTwoRedAroundGreen = (shape: string): boolean => {
  const labels = shape.split('|')[0]!.split(',');
  return labels.length === 3 && labels.filter((l) => l === 'splitter').length === 1 && labels.filter((l) => RED.has(l)).length === 2;
};

const started = Date.now();
const perDish = {} as Record<DishId, ShapeRow[]>;
const all: Episode[][] = [];
for (const dish of RUN_DISHES) {
  const perSeed: Episode[][] = [];
  for (let seed = 1; seed <= SEEDS; seed++) perSeed.push(census(dish, seed * 7919));
  all.push(...perSeed);
  perDish[dish] = summarise(perSeed);
  console.log(`\n${dish}: ${SEEDS} seeds x ${SECONDS}s, sets of 2-${MAX}, top ${TOP} by holds of 4 s or more`);
  printRows(perDish[dish].slice(0, TOP));
}
const overall = summarise(all);
console.log(`\nTwo red cultures around one green Splitter (sniper, control, boss), every dish:`);
for (const dish of RUN_DISHES) {
  const rows = perDish[dish].filter((r) => isTwoRedAroundGreen(r.shape));
  console.log(` ${dish}${rows.length ? '' : ': none seen'}`);
  if (rows.length) printRows(rows);
}
const scanMs = scans ? scanMsTotal / scans : 0;
console.log(`\nlegend: shape = sorted strain labels | touching pairs by position. "isolated" = share of holds where the set was a whole contact group, not part of a bigger cluster.`);
console.log(`scan cost ${scanMs.toFixed(3)} ms average over ${scans} scans (merge detection budget: 0.3 ms). ${((Date.now() - started) / 1000).toFixed(0)}s wall`);
if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify({ args: { SEEDS, SECONDS, SCAN, MAX, dishes: RUN_DISHES }, perDish, overall, scanMs }, null, 2));
  console.log(`wrote ${JSON_OUT}`);
}
