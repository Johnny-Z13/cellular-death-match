import { type SimState, type CellId, type Cell } from '../sim/types';
import { createSim, tick as simTick, addCell } from '../sim/sim';
import { removePixel } from '../sim/cell';
import { getCell, setCell, updateBoundaryAround } from '../sim/grid';
import { type PlayerConfig } from '../content/upgrades';
import { type EnemyArchetype, type EnemySpawn, ARCHETYPE_DEFAULTS } from '../content/enemies';
import { type ObjectiveDef, objectiveForEpoch } from '../content/objectives';
import { bruiserStep } from './enemies/bruiser';
import { sniperStep, type SniperState } from './enemies/sniper';
import { splitterStep } from './enemies/splitter';
import { swarmletStep } from './enemies/swarmlet';
import { mirrorStep } from './enemies/mirror';
import { bossStep, type BossState } from './enemies/boss';
import { shortestVec } from './geometry';

export type { PlayerConfig } from '../content/upgrades';

export interface ArenaInput {
  moveVec: [number, number];
  shouldFire: boolean;
  shouldEngulf: boolean;
}

export type ArenaStatus = 'running' | 'won' | 'lost';
export type LabTool = 'egg' | 'nutrient' | 'toxin';
export type ObjectiveStatus = 'running' | 'satisfied' | 'failed';

export interface Arena {
  state: SimState;
  player: PlayerConfig;
  archetypes: Map<CellId, EnemySpawn>;
  getStatus(): ArenaStatus;
  getEcology(): EcologyInfo;
  getObjectiveProgress(): ObjectiveProgress;
  getToolStates(): Record<LabTool, ToolState>;
  getToolEffects(): ToolEffect[];
  applyTool(tool: LabTool, pos: [number, number], opts?: ApplyToolOpts): boolean;
  tick(input: ArenaInput): void;
  spawnEnemy(opts: SpawnEnemyOpts): CellId;
}

export interface EcologyInfo {
  tick: number;
  epochTicks: number;
  progress: number;
  secondsRemaining: number;
  livingEnemies: number;
  mutations: number;
  births: number;
  supplyDrops: number;
  dominant: string;
}

export interface ObjectiveProgress {
  def: ObjectiveDef;
  status: ObjectiveStatus;
  summary: string;
  urgency: 'safe' | 'warning' | 'critical';
}

export interface ToolState {
  charges: number;
  maxCharges: number;
}

export interface ToolEffect {
  type: Exclude<LabTool, 'egg'>;
  pos: [number, number];
  radius: number;
  ttl: number;
  maxTtl: number;
  seed: number;
}

export interface SpawnEnemyOpts {
  spawn: EnemySpawn;
  pos: [number, number];
}

export interface ApplyToolOpts {
  eggArchetype?: EnemyArchetype;
}

export interface CreateArenaOpts {
  LX: number;
  LY: number;
  seed: number;
  player: PlayerConfig;
  enemies: EnemySpawn[];
  wrap: boolean;
  wrapBullets?: boolean;
  mode?: 'elimination' | 'ecosystem';
  epochTicks?: number;
  objective?: ObjectiveDef;
}

const PLAYER_ID = 1;
const ENGULF_DECAY_PER_FRAME = 0.035;
const MC_STEPS_PER_TICK = 1100;
const DEFAULT_EPOCH_TICKS = 60 * 75;
const MUTATION_INTERVAL_TICKS = 60 * 10;
const RESEED_INTERVAL_TICKS = 60 * 5;
const RESUPPLY_INTERVAL_TICKS = 60 * 11;
const ECOSYSTEM_MIN_POPULATION = 5;
const ECOSYSTEM_MAX_POPULATION = 22;
const PLAYER_THREAT_RANGE = 16;
const MAX_TOOL_EFFECTS = 10;
const NUTRIENT_PULSE_GROWTH = 80;
const NUTRIENT_GROWTH_PER_TICK = 1.8;
const NUTRIENT_PULL_SPEED = 5.5;
const TOXIN_PULSE_DAMAGE = 42;
const TOXIN_SHRINK_PER_TICK = 0.24;
const TOXIN_FLEE_SPEED = 13;
const CULL_RED_MAX_VOL = 180;
const CULL_BLUE_MIN = 2;
const PRESERVE_BLUE_MIN = 1;
const BLOOM_MIN_COVERAGE = 0.10;
const STERILIZE_MAX_COVERAGE = 0.04;
const BALANCE_MAX_DOMINANCE = 0.56;
const BALANCE_BLUE_MIN = 2;

interface AiState {
  sniper?: SniperState;
  boss?: BossState;
  splitter?: { didSpawn: boolean };
}

export function createArena(opts: CreateArenaOpts): Arena {
  const mode = opts.mode ?? 'elimination';
  const epochTicks = opts.epochTicks ?? DEFAULT_EPOCH_TICKS;
  const objective = opts.objective ?? objectiveForEpoch(0);
  const nEnemies = opts.enemies.length;
  const state = createSim({
    LX: opts.LX,
    LY: opts.LY,
    nCells: 1 + nEnemies,
    targetVol: opts.player.targetVol,
    seed: opts.seed,
    wrap: opts.wrap,
    wrapBullets: opts.wrapBullets ?? true,
  });

  const archetypes = new Map<CellId, EnemySpawn>();
  const aiStates = new Map<CellId, AiState>();
  let nextCellId = 2 + nEnemies;          // ids beyond initial spawns
  let tickNo = 0;
  let mutationCount = 0;
  let birthCount = 0;
  let supplyDropCount = 0;
  const toolEffects: ToolEffect[] = [];
  const toolStates: Record<LabTool, ToolState> = toolLoadoutFor(opts.player);

  for (let i = 0; i < nEnemies; i++) {
    const cellId = 2 + i;
    let spawn = opts.enemies[i]!;
    // Mirror adopts the player's stats.
    if (spawn.archetype === 'mirror') {
      spawn = {
        ...spawn,
        targetVol: opts.player.targetVol,
        speed: opts.player.speed,
        engulfMultiplier: opts.player.engulfMultiplier,
      };
    }
    archetypes.set(cellId, spawn);
    const cell = state.cells.get(cellId);
    if (cell) cell.targetVol = spawn.targetVol;

    const aiState: AiState = {};
    if (spawn.archetype === 'sniper')   aiState.sniper = { shootTimer: spawn.shootCooldown ?? 30 };
    if (spawn.archetype === 'boss')     aiState.boss = { phase: 1, didSpawnP2: false };
    if (spawn.archetype === 'splitter') aiState.splitter = { didSpawn: false };
    aiStates.set(cellId, aiState);
  }

  const player = state.cells.get(PLAYER_ID);
  if (player) player.intent.speed = opts.player.speed;

  function dispatchAi(self: Cell, target: Cell, ar: Arena): void {
    const spawn = archetypes.get(self.id);
    if (!spawn) return;
    const ai = aiStates.get(self.id);
    if (!ai) return;
    switch (spawn.archetype) {
      case 'bruiser':  bruiserStep(self, target, state); return;
      case 'sniper':   sniperStep(self, target, state, spawn, ai.sniper!); return;
      case 'splitter': splitterStep(self, target, state, spawn); return;
      case 'swarmlet': swarmletStep(self, target, state, spawn); return;
      case 'mirror':   mirrorStep(self, target, state, spawn); return;
      case 'boss':     bossStep(self, target, state, spawn, ai.boss!, ar); return;
    }
  }

  const arena: Arena = {
    state,
    player: opts.player,
    archetypes,
    getStatus(): ArenaStatus {
      const p = state.cells.get(PLAYER_ID);
      if (!p || p.vol === 0) return mode === 'ecosystem' ? 'running' : 'lost';
      if (mode === 'ecosystem') {
        const status = evaluateObjective(state, objective, tickNo, epochTicks).status;
        if (status === 'satisfied') return 'won';
        if (status === 'failed') return 'lost';
        return 'running';
      }
      for (const [id, cell] of state.cells) {
        if (id === PLAYER_ID) continue;
        if (cell.vol > 0) return 'running';
      }
      return 'won';
    },
    getEcology(): EcologyInfo {
      let livingEnemies = 0;
      let dominant = 'none';
      let dominantVol = -1;
      for (const [id, cell] of state.cells) {
        if (id === PLAYER_ID || cell.vol <= 0) continue;
        livingEnemies += 1;
        if (cell.vol > dominantVol) {
          dominantVol = cell.vol;
          dominant = archetypes.get(id)?.archetype ?? `cell ${id}`;
        }
      }
      return {
        tick: tickNo,
        epochTicks,
        progress: Math.min(1, tickNo / epochTicks),
        secondsRemaining: Math.max(0, Math.ceil((epochTicks - tickNo) / 60)),
        livingEnemies,
        mutations: mutationCount,
        births: birthCount,
        supplyDrops: supplyDropCount,
        dominant,
      };
    },
    getObjectiveProgress(): ObjectiveProgress {
      return evaluateObjective(state, objective, tickNo, epochTicks);
    },
    getToolStates(): Record<LabTool, ToolState> {
      return {
        egg: { ...toolStates.egg },
        nutrient: { ...toolStates.nutrient },
        toxin: { ...toolStates.toxin },
      };
    },
    getToolEffects(): ToolEffect[] {
      return toolEffects.map((effect) => ({
        ...effect,
        pos: [...effect.pos],
      }));
    },
    applyTool(tool: LabTool, pos: [number, number], applyOpts: ApplyToolOpts = {}): boolean {
      const toolState = toolStates[tool];
      if (toolState.charges <= 0) return false;
      if (tool === 'egg') {
        const seedPos = findEggSeedPos(state, pos);
        if (!seedPos) return false;
        toolState.charges -= 1;
        const spawn = eggSpawnFor(applyOpts.eggArchetype ?? 'swarmlet', state.rng.random());
        this.spawnEnemy({ spawn, pos: seedPos });
        birthCount += 1;
        return true;
      }

      toolState.charges -= 1;
      const effect: ToolEffect = {
        type: tool,
        pos,
        radius: tool === 'nutrient'
          ? opts.player.nutrientRadius ?? 20
          : opts.player.toxinRadius ?? 24,
        ttl: tool === 'nutrient' ? 60 * 8 : 60 * 7,
        maxTtl: tool === 'nutrient' ? 60 * 8 : 60 * 7,
        seed: state.rng.randInt(1_000_000),
      };
      pulseToolEffect(state, effect);
      toolEffects.push(effect);
      while (toolEffects.length > MAX_TOOL_EFFECTS) toolEffects.shift();
      return true;
    },
    tick(input: ArenaInput): void {
      if (this.getStatus() !== 'running') return;
      tickNo += 1;

      // The red lineage is no longer directly piloted in ecosystem mode. It
      // remains a visible anchor organism, influenced by the same dish tools.
      const p = state.cells.get(PLAYER_ID);
      if (p) {
        p.intent.vec = mode === 'ecosystem' ? [0, 0] : input.moveVec;
        p.intent.speed = mode === 'ecosystem' ? 0 : opts.player.speed;
        p.intent.shooting = input.shouldFire;
        p.intent.engulfMultiplier = mode === 'ecosystem'
          ? 1
          : input.shouldEngulf ? opts.player.engulfMultiplier : 1;
        if (mode !== 'ecosystem' && input.shouldEngulf) {
          p.targetVol -= ENGULF_DECAY_PER_FRAME;
        }
      }

      // Enemy AIs.
      const playerCell = state.cells.get(PLAYER_ID);
      if (playerCell) {
        for (const [id] of archetypes) {
          const cell = state.cells.get(id);
          if (!cell || cell.vol === 0) continue;
          const target = mode === 'ecosystem'
            ? chooseEcosystemTarget(cell, playerCell, state)
            : playerCell;
          dispatchAi(cell, target, this);
        }
      }

      if (mode === 'ecosystem') {
        applyToolEffects(state, toolEffects);
        for (const effect of toolEffects) effect.ttl -= 1;
        for (let i = toolEffects.length - 1; i >= 0; i--) {
          if (toolEffects[i]!.ttl <= 0) toolEffects.splice(i, 1);
        }
        if (tickNo % MUTATION_INTERVAL_TICKS === 0) {
          mutationCount += mutateEcology(state, archetypes);
        }
        if (tickNo % RESEED_INTERVAL_TICKS === 0) {
          birthCount += reseedEcology(this, state, archetypes);
        }
        if (tickNo % RESUPPLY_INTERVAL_TICKS === 0) {
          supplyDropCount += resupplyLab(toolStates, objective);
        }
      }

      // On-death handlers.
      for (const [id, spawn] of archetypes) {
        if (spawn.archetype !== 'splitter') continue;
        const ai = aiStates.get(id);
        if (!ai?.splitter || ai.splitter.didSpawn) continue;
        const cell = state.cells.get(id);
        if (!cell || cell.vol > 0) continue;
        // Splitter died — spawn 2 swarmlets at its last known center.
        ai.splitter.didSpawn = true;
        const pos = cell.center;
        const swarmletSpawn = { ...ARCHETYPE_DEFAULTS.swarmlet };
        this.spawnEnemy({ spawn: swarmletSpawn, pos: [pos[0] - 3, pos[1]] });
        this.spawnEnemy({ spawn: swarmletSpawn, pos: [pos[0] + 3, pos[1]] });
      }

      simTick(state, MC_STEPS_PER_TICK);
    },
    spawnEnemy(spawnOpts: SpawnEnemyOpts): CellId {
      const id = nextCellId++;
      addCell(state, {
        id,
        targetVol: spawnOpts.spawn.targetVol,
        pos: spawnOpts.pos,
      });
      archetypes.set(id, spawnOpts.spawn);
      const ai: AiState = {};
      if (spawnOpts.spawn.archetype === 'sniper')   ai.sniper = { shootTimer: spawnOpts.spawn.shootCooldown ?? 30 };
      if (spawnOpts.spawn.archetype === 'boss')     ai.boss = { phase: 1, didSpawnP2: false };
      if (spawnOpts.spawn.archetype === 'splitter') ai.splitter = { didSpawn: false };
      aiStates.set(id, ai);
      return id;
    },
  };
  return arena;
}

function toolLoadoutFor(player: PlayerConfig): Record<LabTool, ToolState> {
  const eggCharges = player.eggCharges ?? 8;
  const nutrientCharges = player.nutrientCharges ?? 5;
  const toxinCharges = player.toxinCharges ?? 4;
  return {
    egg: { charges: eggCharges, maxCharges: eggCharges },
    nutrient: { charges: nutrientCharges, maxCharges: nutrientCharges },
    toxin: { charges: toxinCharges, maxCharges: toxinCharges },
  };
}

function evaluateObjective(
  state: SimState,
  objective: ObjectiveDef,
  tickNo: number,
  epochTicks: number,
): ObjectiveProgress {
  const metrics = dishMetrics(state);
  const deadline = tickNo >= epochTicks;
  const urgency = objectiveUrgency(tickNo, epochTicks);

  if (objective.kind === 'preserve') {
    const ok = metrics.blueLiving >= PRESERVE_BLUE_MIN;
    return {
      def: objective,
      status: deadline ? ok ? 'satisfied' : 'failed' : 'running',
      summary: `${metrics.blueLiving} / ${PRESERVE_BLUE_MIN} blue lineages preserved`,
      urgency,
    };
  }

  if (objective.kind === 'cull_red') {
    const ok = metrics.redVol <= CULL_RED_MAX_VOL && metrics.blueLiving >= CULL_BLUE_MIN;
    const failed = deadline && !ok;
    return {
      def: objective,
      status: ok ? 'satisfied' : failed ? 'failed' : 'running',
      summary: `red ${metrics.redVol} / ${CULL_RED_MAX_VOL}, blue ${metrics.blueLiving} / ${CULL_BLUE_MIN}`,
      urgency,
    };
  }

  if (objective.kind === 'bloom') {
    const pct = metrics.coverage;
    const ok = pct >= BLOOM_MIN_COVERAGE;
    return {
      def: objective,
      status: ok ? 'satisfied' : deadline ? 'failed' : 'running',
      summary: `${Math.round(pct * 100)}% / ${Math.round(BLOOM_MIN_COVERAGE * 100)}% coverage`,
      urgency,
    };
  }

  if (objective.kind === 'sterilize') {
    const pct = metrics.coverage;
    const ok = pct <= STERILIZE_MAX_COVERAGE;
    return {
      def: objective,
      status: ok ? 'satisfied' : deadline ? 'failed' : 'running',
      summary: `${Math.round(pct * 100)}% / ${Math.round(STERILIZE_MAX_COVERAGE * 100)}% living matter`,
      urgency,
    };
  }

  const dominancePct = metrics.livingVol === 0 ? 0 : metrics.dominantVol / metrics.livingVol;
  const ok = dominancePct <= BALANCE_MAX_DOMINANCE && metrics.blueLiving >= BALANCE_BLUE_MIN;
  return {
    def: objective,
    status: deadline ? ok ? 'satisfied' : 'failed' : 'running',
    summary: `${Math.round(dominancePct * 100)}% / ${Math.round(BALANCE_MAX_DOMINANCE * 100)}% dominant lineage`,
    urgency,
  };
}

function objectiveUrgency(tickNo: number, epochTicks: number): ObjectiveProgress['urgency'] {
  const remaining = epochTicks - tickNo;
  if (remaining <= 60 * 10) return 'critical';
  if (remaining <= 60 * 22) return 'warning';
  return 'safe';
}

function dishMetrics(state: SimState): {
  redVol: number;
  blueLiving: number;
  livingVol: number;
  dominantVol: number;
  coverage: number;
} {
  let redVol = 0;
  let blueLiving = 0;
  let livingVol = 0;
  let dominantVol = 0;
  for (const [id, cell] of state.cells) {
    if (cell.vol <= 0) continue;
    livingVol += cell.vol;
    dominantVol = Math.max(dominantVol, cell.vol);
    if (id === PLAYER_ID) redVol += Math.min(cell.vol, cell.targetVol);
    else blueLiving += 1;
  }
  return {
    redVol,
    blueLiving,
    livingVol,
    dominantVol,
    coverage: livingVol / (state.grid.LX * state.grid.LY),
  };
}

function mutateEcology(state: SimState, archetypes: Map<CellId, EnemySpawn>): number {
  let changed = 0;
  for (const [id, spawn] of archetypes) {
    const cell = state.cells.get(id);
    if (!cell || cell.vol <= 0) continue;
    const instability = spawn.instability ?? 1;
    const drift = (state.rng.random() - 0.5) * 0.18 * instability;
    spawn.targetVol = clamp(spawn.targetVol * (1 + drift), 55, 1800);
    spawn.speed = clamp(spawn.speed * (1 - drift * 0.45), 3, 16);
    spawn.engulfMultiplier = clamp(spawn.engulfMultiplier * (1 + drift * 0.6), 1, 9);
    if (spawn.shootCooldown !== undefined) {
      spawn.shootCooldown = Math.round(clamp(spawn.shootCooldown * (1 + drift), 28, 90));
    }
    cell.targetVol = clamp((cell.targetVol + spawn.targetVol) / 2, 35, 1800);
    changed += 1;
  }
  return changed;
}

function chooseEcosystemTarget(self: Cell, player: Cell, state: SimState): Cell {
  const { LX, LY } = state.grid;
  const playerVec = shortestVec(self.center, player.center, LX, LY);
  const playerDist = Math.hypot(playerVec[0], playerVec[1]);
  if (playerDist <= PLAYER_THREAT_RANGE) return player;

  let best: Cell | null = null;
  let bestDist = Infinity;
  for (const [id, candidate] of state.cells) {
    if (id === self.id || id === PLAYER_ID || candidate.vol <= 0) continue;
    const v = shortestVec(self.center, candidate.center, LX, LY);
    const dist = Math.hypot(v[0], v[1]);
    if (dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  }
  return best ?? self;
}

function findEggSeedPos(state: SimState, pos: [number, number]): [number, number] | null {
  const { grid } = state;
  const cx = Math.round(pos[0]);
  const cy = Math.round(pos[1]);
  for (let r = 0; r <= 24; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const candidate = normalizeCoord(grid, cx + dx, cy + dy);
        if (!candidate) continue;
        if (seedablePixelCount(state, candidate) > 0) return candidate;
      }
    }
  }
  return null;
}

function seedablePixelCount(state: SimState, pos: [number, number]): number {
  let count = 0;
  const cx = Math.round(pos[0]);
  const cy = Math.round(pos[1]);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const candidate = normalizeCoord(state.grid, cx + dx, cy + dy);
      if (!candidate) continue;
      if (getCell(state.grid, candidate[0], candidate[1]) === 0) count += 1;
    }
  }
  return count;
}

function normalizeCoord(
  grid: SimState['grid'],
  x: number,
  y: number,
): [number, number] | null {
  if (grid.wrap) {
    return [
      ((x % grid.LX) + grid.LX) % grid.LX,
      ((y % grid.LY) + grid.LY) % grid.LY,
    ];
  }
  if (x < 0 || x >= grid.LX || y < 0 || y >= grid.LY) return null;
  return [x, y];
}

function pulseToolEffect(state: SimState, effect: ToolEffect): void {
  const { LX, LY } = state.grid;
  for (const [, cell] of state.cells) {
    if (cell.vol <= 0) continue;
    const v = shortestVec(cell.center, effect.pos, LX, LY);
    const dist = Math.hypot(v[0], v[1]);
    if (dist > effect.radius) continue;
    const strength = 1 - dist / effect.radius;
    if (effect.type === 'nutrient') {
      cell.targetVol = clamp(cell.targetVol + NUTRIENT_PULSE_GROWTH * strength, 25, 2200);
    } else {
      cell.targetVol = clamp(cell.targetVol - TOXIN_PULSE_DAMAGE * strength, 12, 2200);
    }
  }
  if (effect.type === 'toxin') {
    erodePixels(state, effect, 68);
  }
}

function erodePixels(state: SimState, effect: ToolEffect, maxPixels: number): void {
  const { grid } = state;
  const cx = Math.round(effect.pos[0]);
  const cy = Math.round(effect.pos[1]);
  const r = Math.ceil(effect.radius);
  let removed = 0;
  for (let dx = -r; dx <= r && removed < maxPixels; dx++) {
    for (let dy = -r; dy <= r && removed < maxPixels; dy++) {
      const dist = Math.hypot(dx, dy);
      if (dist > effect.radius) continue;
      let x = cx + dx;
      let y = cy + dy;
      if (grid.wrap) {
        x = ((x % grid.LX) + grid.LX) % grid.LX;
        y = ((y % grid.LY) + grid.LY) % grid.LY;
      } else if (x < 0 || x >= grid.LX || y < 0 || y >= grid.LY) {
        continue;
      }
      const id = getCell(grid, x, y);
      if (id === 0) continue;
      const strength = 1 - dist / effect.radius;
      if (state.rng.random() > strength * 0.9) continue;
      const cell = state.cells.get(id);
      if (!cell || cell.vol <= 0) continue;
      setCell(grid, x, y, 0);
      removePixel(cell, x, y, grid.LX, grid.LY);
      updateBoundaryAround(grid, x, y);
      removed += 1;
    }
  }
}

function applyToolEffects(state: SimState, effects: ToolEffect[]): void {
  if (effects.length === 0) return;
  const { LX, LY } = state.grid;
  for (const [, cell] of state.cells) {
    if (cell.vol <= 0) continue;
    let vx = 0;
    let vy = 0;
    let speedBoost = 0;
    for (const effect of effects) {
      const v = shortestVec(cell.center, effect.pos, LX, LY);
      const dist = Math.hypot(v[0], v[1]);
      if (dist > effect.radius) continue;
      const strength = (1 - dist / effect.radius) * (effect.ttl / effect.maxTtl);
      const dirX = dist > 0 ? v[0] / dist : 0;
      const dirY = dist > 0 ? v[1] / dist : 0;
      if (effect.type === 'nutrient') {
        vx += dirX * strength;
        vy += dirY * strength;
        speedBoost += NUTRIENT_PULL_SPEED * strength;
        cell.targetVol = clamp(cell.targetVol + NUTRIENT_GROWTH_PER_TICK * strength, 25, 2200);
      } else {
        vx -= dirX * strength;
        vy -= dirY * strength;
        speedBoost += TOXIN_FLEE_SPEED * strength;
        cell.targetVol = clamp(cell.targetVol - TOXIN_SHRINK_PER_TICK * strength, 12, 2200);
      }
    }
    const len = Math.hypot(vx, vy);
    if (len > 0) {
      cell.intent.vec = [vx / len, vy / len];
      cell.intent.speed = Math.max(cell.intent.speed, speedBoost);
      if (cell.intent.engulfMultiplier <= 1) cell.intent.engulfMultiplier = 1;
    } else if (speedBoost > 0) {
      cell.intent.speed = Math.max(cell.intent.speed, speedBoost);
    }
  }
}

function resupplyLab(toolStates: Record<LabTool, ToolState>, objective: ObjectiveDef): number {
  const preference: LabTool[] = objective.kind === 'bloom' || objective.kind === 'preserve'
    ? ['nutrient', 'egg', 'toxin']
    : objective.kind === 'cull_red' || objective.kind === 'sterilize'
      ? ['toxin', 'egg', 'nutrient']
      : ['egg', 'toxin', 'nutrient'];
  const refill = preference.find((tool) => toolStates[tool].charges < toolStates[tool].maxCharges);
  if (!refill) return 0;
  toolStates[refill].charges += 1;
  return 1;
}

function reseedEcology(
  arena: Arena,
  state: SimState,
  archetypes: Map<CellId, EnemySpawn>,
): number {
  const living = Array.from(state.cells)
    .filter(([id, cell]) => id !== PLAYER_ID && cell.vol > 0)
    .sort((a, b) => b[1].vol - a[1].vol);
  if (living.length >= ECOSYSTEM_MIN_POPULATION || archetypes.size >= ECOSYSTEM_MAX_POPULATION) return 0;

  const parentEntry = living[0];
  const parentSpawn = parentEntry ? archetypes.get(parentEntry[0]) : undefined;
  const spawn = parentSpawn
    ? budSpawn(parentSpawn, state.rng.random())
    : { ...ARCHETYPE_DEFAULTS.swarmlet };
  const parent = parentEntry?.[1];
  const pos: [number, number] = parent
    ? [
        parent.center[0] + state.rng.randInt(17) - 8,
        parent.center[1] + state.rng.randInt(17) - 8,
      ]
    : [
        state.rng.randInt(state.grid.LX),
        state.rng.randInt(state.grid.LY),
      ];
  arena.spawnEnemy({ spawn, pos });
  return 1;
}

function budSpawn(parent: EnemySpawn, roll: number): EnemySpawn {
  const archetype = roll < 0.15 ? 'swarmlet' : parent.archetype;
  const base = archetype === parent.archetype ? parent : ARCHETYPE_DEFAULTS.swarmlet;
  return {
    ...base,
    targetVol: clamp(base.targetVol * 0.42, 55, 500),
    speed: clamp(base.speed * 1.08, 4, 16),
    engulfMultiplier: clamp(base.engulfMultiplier * 0.92, 1, 8),
    instability: (base.instability ?? 1) * 1.18,
  };
}

function eggSpawnFor(archetype: EnemyArchetype, roll: number): EnemySpawn {
  const base = ARCHETYPE_DEFAULTS[archetype];
  const spawn = budSpawn(base, 1);
  const sizeJitter = 0.9 + roll * 0.25;
  spawn.archetype = archetype;
  spawn.targetVol = clamp(spawn.targetVol * sizeJitter, 55, 620);
  spawn.instability = Math.max(spawn.instability ?? 1, (base.instability ?? 1) * 1.15);
  return spawn;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
