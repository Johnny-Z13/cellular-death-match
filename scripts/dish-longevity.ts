// Hands-off dish longevity probe. Seeds a dish the way a player opens one
// (the epoch spawn list plus six eggs), then takes no further action and
// records how long the culture stays diverse.
//
// usage: npx vite-node scripts/dish-longevity.ts -- [--seeds 20] [--seconds 300] [--hazards on|off]
import { createRun } from '../src/game/run';
import { createArena } from '../src/game/arena';
import type { EnemyArchetype } from '../src/content/enemies';

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
};
const SEEDS = Number(arg('seeds', '20'));
const SECONDS = Number(arg('seconds', '300'));
const HAZARDS = arg('hazards', 'on') === 'on';
const CHECKPOINTS = [30, 60, 120, 300, 600].filter((s) => s <= SECONDS);
const EGGS: EnemyArchetype[] = ['swarmlet', 'bruiser', 'splitter', 'sniper', 'mirror', 'swarmlet'];
const TPS = 60;

interface SeedResult {
  strainsAt: number[];
  culturesAt: number[];
  diverseSeconds: number;
  equilibriumAt: number | null;
  births: number;
  medianLifespan: number;
}

function probe(seed: number): SeedResult {
  const run = createRun(seed);
  const arena = createArena({
    LX: 160, LY: 160, seed, player: run.getPlayerConfig(), enemies: run.getEpochSpawnList(),
    wrap: false, mode: 'ecosystem', includeControlSample: true, objective: run.getObjective(),
    fightIndex: 6, knownBreedIds: new Set(),
  });
  arena.setHazardsHeld(!HAZARDS);
  const born = new Map<number, number>();
  const lifespans: number[] = [];
  let tick = 0;
  let diverseTicks = 0;
  let equilibriumAt: number | null = null;
  const strainsAt: number[] = [];
  const culturesAt: number[] = [];
  const living = () => [...arena.state.cells].filter(([id, c]) => id > 1 && c.vol > 0);
  const strains = () => new Set(living().map(([id]) => {
    const spawn = arena.archetypes.get(id);
    return spawn?.breedId ?? spawn?.archetype ?? 'unknown';
  })).size;
  const step = () => {
    arena.tick({ moveVec: [0, 0], shouldFire: false, shouldEngulf: false });
    tick += 1;
    for (const [id, c] of arena.state.cells) {
      if (id <= 1) continue;
      if (c.vol > 0 && !born.has(id)) born.set(id, tick);
      const b = born.get(id);
      if (c.vol <= 0 && b !== undefined && b >= 0) { lifespans.push((tick - b) / TPS); born.set(id, -1); }
    }
    if (strains() >= 3) diverseTicks += 1;
    if (equilibriumAt === null && arena.isHomeostasisAchieved()) equilibriumAt = tick / TPS;
    if (CHECKPOINTS.includes(tick / TPS)) { strainsAt.push(strains()); culturesAt.push(living().length); }
  };

  // Open the dish like a player: six eggs around the centre, honouring cooldowns.
  for (let i = 0; i < EGGS.length; i++) {
    const a = (i / EGGS.length) * Math.PI * 2;
    const pos: [number, number] = [80 + 38 * Math.cos(a), 80 + 38 * Math.sin(a)];
    let guard = 0;
    while (!arena.applyTool('egg', pos, { eggArchetype: EGGS[i] }) && guard++ < 900) step();
    step();
  }
  while (tick < SECONDS * TPS) step();
  lifespans.sort((x, y) => x - y);
  return {
    strainsAt, culturesAt,
    diverseSeconds: diverseTicks / TPS,
    equilibriumAt,
    births: arena.archetypes.size,
    medianLifespan: lifespans.length ? lifespans[Math.floor(lifespans.length / 2)]! : SECONDS,
  };
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; };
const results: SeedResult[] = [];
const started = Date.now();
for (let seed = 1; seed <= SEEDS; seed++) {
  const r = probe(seed * 7919);
  results.push(r);
  console.log(`seed ${String(seed).padStart(2)}  strains@${CHECKPOINTS.join('/')}s ${r.strainsAt.join('/')}  cultures ${r.culturesAt.join('/')}  `
    + `3+ strains ${r.diverseSeconds.toFixed(0)}s  equilibrium ${r.equilibriumAt === null ? '-' : `${r.equilibriumAt.toFixed(0)}s`}  `
    + `births ${r.births}  median life ${r.medianLifespan.toFixed(1)}s`);
}
console.log(`\n${SEEDS} seeds, ${SECONDS}s, hazards ${HAZARDS ? 'on' : 'off'}  (${((Date.now() - started) / 1000).toFixed(0)}s wall)`);
CHECKPOINTS.forEach((s, i) => {
  const st = results.map((r) => r.strainsAt[i] ?? 0);
  console.log(`  at ${String(s).padStart(3)}s  median strains ${median(st)}  seeds with 3+ strains ${st.filter((n) => n >= 3).length}/${SEEDS}  median cultures ${median(results.map((r) => r.culturesAt[i] ?? 0))}`);
});
console.log(`  median time with 3+ strains ${median(results.map((r) => r.diverseSeconds)).toFixed(0)}s`);
console.log(`  equilibrium reached ${results.filter((r) => r.equilibriumAt !== null).length}/${SEEDS}`);
console.log(`  median culture lifespan ${median(results.map((r) => r.medianLifespan)).toFixed(1)}s`);
console.log(`  median births ${median(results.map((r) => r.births))}`);
