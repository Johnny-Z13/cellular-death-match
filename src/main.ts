import { createRun, EPOCHS_PER_RUN } from './game/run';
import { createArena, type Arena } from './game/arena';
import { createRenderer, type Renderer } from './ui/render';
import { createDebugPanel } from './ui/debug';
import { createScreens, type ToolId } from './ui/screens';
import { getUpgradeDef } from './content/upgrades';
import { ARCHETYPE_INFO, EGG_ARCHETYPES, type EnemyArchetype } from './content/enemies';
import { createEcologyAudio } from './audio/ecologyAudio';

const LX = 160;
const LY = 160;
const PLAYER_ID = 1;
const EPOCH_TICKS = 60 * 55;

const canvasMaybe = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvasMaybe) throw new Error('Missing #game canvas');
const canvas: HTMLCanvasElement = canvasMaybe;

const run = createRun(Date.now() & 0xffffffff);
const screens = createScreens();
const debug = createDebugPanel();
const ecologyAudio = createEcologyAudio();
// Allow up to PALETTE_SIZE total cell colors for evolving ecosystem spawns.
const PALETTE_SIZE = 32;

let arena: Arena | null = null;
let renderer: Renderer | null = null;
let selectedTool: ToolId = 'egg';
let selectedEggArchetype: EnemyArchetype = 'swarmlet';
let displayedFps = 0;
let framesSinceTick = 0;
let lastFpsTick = performance.now();
let tickCount = 0;
let tickerState = createTickerState();

canvas.tabIndex = 0;
canvas.focus();
canvas.addEventListener('pointerdown', (event) => {
  if (!arena || run.getState().phase !== 'arena') return;
  ecologyAudio.unlock();
  const pos = canvasEventToGridPos(event);
  if (arena.applyTool(selectedTool, pos, { eggArchetype: selectedEggArchetype })) {
    screens.updateToolCharges(arena.getToolStates());
  }
});

screens.onTitleStart(() => {
  ecologyAudio.unlock();
  run.start();
  startNewFight();
});
screens.onEndRestart(() => {
  run.restart();
  showPhase();
});
screens.onToolSelect((tool) => {
  selectedTool = tool;
  screens.setTool(tool);
});
screens.setEggOptions(EGG_ARCHETYPES.map((archetype) => ({
  archetype,
  ...ARCHETYPE_INFO[archetype],
})));
screens.onEggSelect((archetype) => {
  selectedEggArchetype = archetype;
  selectedTool = 'egg';
  screens.setTool(selectedTool);
  screens.setEggArchetype(archetype);
});
screens.setTool(selectedTool);
screens.setEggArchetype(selectedEggArchetype);

showPhase();

function showPhase() {
  // Hide every overlay; show the one for the current phase.
  screens.hide('title');
  screens.hide('pick');
  screens.hide('end');
  screens.hide('hud');
  const state = run.getState();
  if (state.phase === 'title') {
    screens.show('title');
  } else if (state.phase === 'arena') {
    screens.show('hud');
    // arena was started by startNewFight(); HUD updates in loop.
  } else if (state.phase === 'upgrade_pick') {
    const choices = state.pendingPickChoices.map((id) => ({ id, def: getUpgradeDef(id)! }));
    screens.setPickChoices(choices, (id) => {
      run.pickUpgrade(id);
      startNewFight();
    });
    screens.show('pick');
  } else if (state.phase === 'run_end') {
    screens.updateEnd({
      outcome: state.outcome ?? 'lost',
      fightReached: state.fightIndex + 1,
      totalFights: EPOCHS_PER_RUN,
      upgrades: state.upgrades.map((u) => {
        const def = getUpgradeDef(u.id);
        if (!def) return u.id;
        return u.stacks > 1 ? `${def.name} x${u.stacks}` : def.name;
      }),
    });
    screens.show('end');
  }
}

function startNewFight() {
  const playerCfg = run.getPlayerConfig();
  const enemies = run.getEpochSpawnList();
  arena = createArena({
    LX,
    LY,
    seed: (Date.now() & 0xffffffff) ^ (run.getState().fightIndex * 2654435761),
    player: playerCfg,
    enemies,
    wrap: true,
    mode: 'ecosystem',
    epochTicks: EPOCH_TICKS,
    objective: run.getObjective(),
  });
  renderer = createRenderer(canvas, PALETTE_SIZE);
  tickCount = 0;
  tickerState = createTickerState();
  screens.clearTicker();
  screens.addTicker(`Objective received: ${run.getObjective().name}.`);
  screens.updateToolCharges(arena.getToolStates());
  // Update debug panel swatches to match the renderer's palette.
  debug.setSwatch(1, swatchForCellId(1, PALETTE_SIZE));
  for (let i = 0; i < enemies.length; i++) {
    debug.setSwatch(2 + i, swatchForArchetype(enemies[i]!.archetype));
  }
  showPhase();
  requestAnimationFrame(loop);
}

function loop() {
  if (!arena || !renderer) return;
  const phase = run.getState().phase;
  if (phase !== 'arena') return;            // stop the loop on any non-arena phase

  const player = arena.state.cells.get(PLAYER_ID);

  arena.tick({
    moveVec: [0, 0],
    shouldFire: false,
    shouldEngulf: false,
  });
  ecologyAudio.update(readAudioFrame(arena));
  tickCount++;

  renderer.render(arena.state, arena.archetypes);
  renderToolEffects(arena);

  framesSinceTick++;
  const now = performance.now();
  if (now - lastFpsTick > 1000) {
    displayedFps = framesSinceTick;
    framesSinceTick = 0;
    lastFpsTick = now;
  }

  // HUD update.
  if (player) {
    const runState = run.getState();
    const ecology = arena.getEcology();
    const objective = arena.getObjectiveProgress();
    screens.updateHud({
      fightIndex: runState.fightIndex,
      totalFights: EPOCHS_PER_RUN,
      vol: player.vol,
      targetVol: player.targetVol,
      progress: ecology.progress,
      secondsRemaining: ecology.secondsRemaining,
      livingEnemies: ecology.livingEnemies,
      mutations: ecology.mutations,
      births: ecology.births,
      supplyDrops: ecology.supplyDrops,
      dominant: ecology.dominant,
      objectiveName: objective.def.name,
      objectiveSummary: objective.summary,
      upgrades: runState.upgrades.map((u) => {
        const def = getUpgradeDef(u.id);
        if (!def) return u.id;
        return u.stacks > 1 ? `${def.name} x${u.stacks}` : def.name;
      }),
    });
    screens.updateToolCharges(arena.getToolStates());
  }
  updateTicker(arena);

  // Debug panel.
  debug.update(arena.state, {
    fps: displayedFps,
    tick: tickCount,
    status: arena.getStatus(),
  });

  // Status check: did this tick end the fight?
  const status = arena.getStatus();
  if (status === 'won') {
    run.completeEpoch();
    showPhase();
    return;
  }
  if (status === 'lost') {
    run.failEpoch();
    showPhase();
    return;
  }

  requestAnimationFrame(loop);
}

interface TickerState {
  lastRedBand: string;
  lastBlueBand: string;
  lastCoverageBand: string;
  lastDominant: string;
  lastToolPressureTick: number;
  lastObjectiveSummary: string;
  didWarnDeadline: boolean;
  didWarnCritical: boolean;
}

function createTickerState(): TickerState {
  return {
    lastRedBand: 'unknown',
    lastBlueBand: 'unknown',
    lastCoverageBand: 'unknown',
    lastDominant: 'none',
    lastToolPressureTick: -9999,
    lastObjectiveSummary: '',
    didWarnDeadline: false,
    didWarnCritical: false,
  };
}

function updateTicker(ar: Arena): void {
  if (tickCount % 45 !== 0) return;
  const red = ar.state.cells.get(PLAYER_ID);
  const redVol = red?.vol ?? 0;
  const blueLiving = Array.from(ar.state.cells)
    .filter(([id, cell]) => id !== PLAYER_ID && cell.vol > 0).length;
  const livingVol = Array.from(ar.state.cells)
    .reduce((sum, [, cell]) => sum + Math.max(0, cell.vol), 0);
  const coverage = livingVol / (LX * LY);
  const ecology = ar.getEcology();
  const objective = ar.getObjectiveProgress();

  const redBand = redVol <= 35 ? 'critical' : redVol <= 140 ? 'dying' : redVol >= 650 ? 'surging' : 'stable';
  if (redBand !== tickerState.lastRedBand) {
    tickerState.lastRedBand = redBand;
    if (redBand === 'critical') screens.addTicker('Red lineage is near collapse.');
    else if (redBand === 'dying') screens.addTicker('Red lineage is dying.');
    else if (redBand === 'surging') screens.addTicker('Red lineage is overgrowing the dish.');
  }

  const blueBand = blueLiving === 0 ? 'extinct' : blueLiving < 3 ? 'thin' : blueLiving >= 7 ? 'blooming' : 'stable';
  if (blueBand !== tickerState.lastBlueBand) {
    tickerState.lastBlueBand = blueBand;
    if (blueBand === 'extinct') screens.addTicker('Blue lineage has vanished from the dish.');
    else if (blueBand === 'thin') screens.addTicker('Blue lineage is under threat.');
    else if (blueBand === 'blooming') screens.addTicker('Blue lineage is blooming.');
  }

  const coverageBand = coverage <= 0.08 ? 'sterile' : coverage >= 0.42 ? 'bloom' : 'normal';
  if (coverageBand !== tickerState.lastCoverageBand) {
    tickerState.lastCoverageBand = coverageBand;
    if (coverageBand === 'sterile') screens.addTicker('Dish is approaching sterility.');
    else if (coverageBand === 'bloom') screens.addTicker('Living matter is filling the dish.');
  }

  if (ecology.dominant !== tickerState.lastDominant && ecology.dominant !== 'none') {
    tickerState.lastDominant = ecology.dominant;
    screens.addTicker(`${capitalize(ecology.dominant)} has become dominant.`);
  }

  const toolPressure = ar.getToolEffects().find((effect) => effect.type === 'toxin');
  if (toolPressure && tickCount - tickerState.lastToolPressureTick > 240) {
    tickerState.lastToolPressureTick = tickCount;
    screens.addTicker('Toxin pressure is reshaping local movement.');
  }

  if (objective.summary !== tickerState.lastObjectiveSummary && tickCount % 180 === 0) {
    tickerState.lastObjectiveSummary = objective.summary;
    screens.addTicker(`Objective update: ${objective.summary}.`);
  }

  if (!tickerState.didWarnDeadline && objective.urgency === 'warning') {
    tickerState.didWarnDeadline = true;
    screens.addTicker('Deadline pressure is rising.');
  } else if (!tickerState.didWarnCritical && objective.urgency === 'critical') {
    tickerState.didWarnCritical = true;
    screens.addTicker('Final seconds: finish the objective now.');
  }
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}

function readAudioFrame(ar: Arena): { eating: number; fighting: number } {
  let eating = 0;
  let fighting = 0;
  for (const event of ar.state.events) {
    if (event.type !== 'pixelTransferred') continue;
    if (event.from === 0 && event.to !== 0) {
      eating += 1;
    } else if (event.from !== 0 && event.to !== 0 && event.from !== event.to) {
      const taker = ar.state.cells.get(event.to);
      if (taker && taker.intent.engulfMultiplier > 1.05) eating += 2;
      else fighting += 1;
    }
  }
  return { eating, fighting };
}

function canvasEventToGridPos(event: PointerEvent): [number, number] {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * LX;
  const y = ((event.clientY - rect.top) / rect.height) * LY;
  return [
    Math.max(0, Math.min(LX - 1, x)),
    Math.max(0, Math.min(LY - 1, y)),
  ];
}

function renderToolEffects(ar: Arena): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const sx = canvas.width / LX;
  const sy = canvas.height / LY;
  for (const effect of ar.getToolEffects()) {
    const alpha = Math.max(0, effect.ttl / effect.maxTtl);
    const color = effect.type === 'nutrient'
      ? { core: [212, 214, 94], edge: [102, 170, 96] }
      : { core: [171, 93, 220], edge: [104, 52, 150] };
    const pixels = splodgePixels(effect.seed, effect.radius);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const p of pixels) {
      const fade = alpha * p.a;
      const [r, g, b] = p.edge ? color.edge : color.core;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fade})`;
      ctx.fillRect(
        (effect.pos[0] + p.x) * sx,
        (effect.pos[1] + p.y) * sy,
        Math.ceil(sx),
        Math.ceil(sy),
      );
    }
    ctx.restore();
  }
}

function splodgePixels(seed: number, radius: number): Array<{ x: number; y: number; a: number; edge: boolean }> {
  const out: Array<{ x: number; y: number; a: number; edge: boolean }> = [];
  const r = Math.round(radius);
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y) / radius;
      if (d > 1) continue;
      const wobble = hash2(seed, x, y) * 0.28 - 0.14;
      const speckle = hash2(seed + 911, x * 3, y * 3);
      const threshold = 0.82 + wobble;
      if (d > threshold || speckle < 0.18 + d * 0.16) continue;
      out.push({
        x,
        y,
        a: 0.08 + (1 - d) * 0.42 + hash2(seed + 17, x, y) * 0.12,
        edge: d > 0.64 || speckle < 0.32,
      });
    }
  }
  return out;
}

function hash2(seed: number, x: number, y: number): number {
  let n = (seed ^ (x * 374761393) ^ (y * 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

// Mirrors the renderer's palette logic so inspector swatches match the dish.
function swatchForCellId(cellId: number, _paletteSize: number): string {
  if (cellId === 1) return 'rgb(186, 32, 42)';
  return swatchForArchetype(EGG_ARCHETYPES[(cellId - 2) % EGG_ARCHETYPES.length]!);
}

function swatchForArchetype(archetype: EnemyArchetype): string {
  const [r, g, b] = ARCHETYPE_INFO[archetype].color;
  return `rgb(${r}, ${g}, ${b})`;
}
