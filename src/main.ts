import { createRun, EPOCHS_PER_RUN } from './game/run';
import { createArena, type Arena, type ArenaStatus } from './game/arena';
import { createRenderer, type Renderer } from './ui/render';
import { createDebugPanel } from './ui/debug';
import { createScreens, type ToolId } from './ui/screens';
import { getUpgradeDef } from './content/upgrades';
import { ARCHETYPE_INFO, EGG_ARCHETYPES, type EnemyArchetype } from './content/enemies';
import { createEcologyAudio } from './audio/ecologyAudio';
import { hash2 } from './game/hash';
import {
  clearDiscoverySave,
  loadDiscoverySave,
  revealAllDiscoveries,
  saveDiscoveryState,
  setDiscoveryPersistence,
  type DiscoverySaveState,
} from './game/discoverySave';

declare const __COMMIT_MESSAGE__: string;

const LX = 160;
const LY = 160;
const PLAYER_ID = 1;
const EPOCH_TICKS = 60 * 55;

const canvasMaybe = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvasMaybe) throw new Error('Missing #game canvas');
const canvas: HTMLCanvasElement = canvasMaybe;
const layoutMaybe = document.querySelector('.layout');
if (!(layoutMaybe instanceof HTMLElement)) throw new Error('Missing .layout');
const layout: HTMLElement = layoutMaybe;
const commitDebug = document.getElementById('commit-debug');
if (commitDebug) commitDebug.textContent = `commit: ${__COMMIT_MESSAGE__}`;

const run = createRun(Date.now() & 0xffffffff);
const screens = createScreens();
const debug = createDebugPanel();
const ecologyAudio = createEcologyAudio();
const discoveryStorage = window.localStorage;
let discoverySave: DiscoverySaveState = loadDiscoverySave(discoveryStorage);
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

interface RuntimeOverlayState {
  menuOpen: boolean;
  debugOpen: boolean;
  presentationMode: boolean;
  selectedLifeformId: string | null;
}

const overlayState: RuntimeOverlayState = {
  menuOpen: false,
  debugOpen: false,
  presentationMode: false,
  selectedLifeformId: null,
};

debug.onDiscoveryPersistenceChange((enabled) => {
  discoverySave = setDiscoveryPersistence(discoveryStorage, enabled);
  debug.updateDiscoveries(discoveryDebugInfo());
});
debug.onClearDiscoveries(() => {
  discoverySave = clearDiscoverySave(discoveryStorage);
  debug.updateDiscoveries(discoveryDebugInfo());
});
debug.onRevealDiscoveries(() => {
  discoverySave = revealAllDiscoveries(discoveryStorage);
  debug.updateDiscoveries(discoveryDebugInfo());
});
debug.onPresentationToggle(() => {
  setPresentationMode(!overlayState.presentationMode);
});
debug.updateDiscoveries(discoveryDebugInfo());

screens.onLifeformSelect((id) => {
  overlayState.selectedLifeformId = id;
  screens.setSelectedLifeform(id);
});

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  overlayState.menuOpen = !overlayState.menuOpen;
  overlayState.debugOpen = overlayState.menuOpen;
  applyOverlayState();
});

canvas.tabIndex = 0;
canvas.focus();
canvas.addEventListener('animationend', () => {
  canvas.classList.remove('dish-shake');
});
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
screens.onAgitate(() => {
  if (!arena || run.getState().phase !== 'arena') return;
  ecologyAudio.unlock();
  if (!arena.agitate()) return;
  screens.updateAgitation(arena.getAgitationState());
  screens.addTicker('Dish agitated: lifeforms are mixing.');
  canvas.classList.remove('dish-shake');
  void canvas.offsetWidth;
  canvas.classList.add('dish-shake');
});
screens.onEndEpoch(() => {
  if (!arena || run.getState().phase !== 'arena') return;
  ecologyAudio.unlock();
  const status = arena.endEpochNow();
  resolveArenaStatus(status);
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
  overlayState.selectedLifeformId = archetype;
  screens.setSelectedLifeform(archetype);
});
screens.setTool(selectedTool);
screens.setEggArchetype(selectedEggArchetype);
screens.setSelectedLifeform(selectedEggArchetype);

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
    wrap: false,
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
  screens.updateAgitation(arena.getAgitationState());
  debug.updateDiscoveries(discoveryDebugInfo());
  // Update debug panel swatches to match the renderer's palette.
  debug.setSwatch(1, swatchForCellId(1, PALETTE_SIZE));
  for (let i = 0; i < enemies.length; i++) {
    debug.setSwatch(2 + i, swatchForArchetype(enemies[i]!.archetype));
  }
  showPhase();
  loop();
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

  renderer.render(arena.state, arena.archetypes, arena.getDishEvents());
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
      reactions: ecology.reactions,
      accidents: ecology.accidents,
      outbreaks: ecology.outbreaks,
      dominant: ecology.dominant,
      crisis: ecology.crisis,
      objectiveName: objective.def.name,
      objectiveSummary: objective.summary,
      upgrades: runState.upgrades.map((u) => {
        const def = getUpgradeDef(u.id);
        if (!def) return u.id;
        return u.stacks > 1 ? `${def.name} x${u.stacks}` : def.name;
      }),
    });
    screens.updateToolCharges(arena.getToolStates());
    screens.updateAgitation(arena.getAgitationState());
  }
  updateTicker(arena);
  persistArenaDiscoveries(arena);

  // Debug panel.
  debug.update(arena.state, {
    fps: displayedFps,
    tick: tickCount,
    status: arena.getStatus(),
  });
  debug.updateDiscoveries(discoveryDebugInfo());

  // Status check: did this tick end the fight?
  if (resolveArenaStatus(arena.getStatus())) return;

  scheduleLoop();
}

function resolveArenaStatus(status: ArenaStatus): boolean {
  if (status === 'won') {
    run.completeEpoch();
    showPhase();
    return true;
  }
  if (status === 'lost') {
    run.failEpoch();
    showPhase();
    return true;
  }
  return false;
}

function scheduleLoop(): void {
  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(loop);
  } else {
    window.setTimeout(loop, 16);
  }
}

function persistArenaDiscoveries(ar: Arena): void {
  const discoveries = ar.getEcology().discoveries;
  if (!discoverySave.persistenceEnabled) return;
  discoverySave = {
    ...discoverySave,
    discoveredBreedIds: unique([...discoverySave.discoveredBreedIds, ...discoveries.breedIds]),
    discoveredNoteIds: unique([...discoverySave.discoveredNoteIds, ...discoveries.noteIds]),
  };
  discoverySave = saveDiscoveryState(discoveryStorage, discoverySave);
}

function discoveryDebugInfo(): {
  persistenceEnabled: boolean;
  discoveredCount: number;
  revealAll: boolean;
} {
  return {
    persistenceEnabled: discoverySave.persistenceEnabled,
    discoveredCount: unique([
      ...discoverySave.discoveredBreedIds,
      ...discoverySave.discoveredNoteIds,
    ]).length,
    revealAll: discoverySave.revealAll,
  };
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function applyOverlayState(): void {
  layout.classList.toggle('debug-open', overlayState.debugOpen);
  layout.classList.toggle('menu-open', overlayState.menuOpen);
  layout.classList.toggle('presentation-mode', overlayState.presentationMode);
}

function setPresentationMode(enabled: boolean): void {
  overlayState.presentationMode = enabled;
  if (enabled && document.fullscreenEnabled && !document.fullscreenElement) {
    void layout.requestFullscreen().catch(() => undefined);
  } else if (!enabled && document.fullscreenElement) {
    void document.exitFullscreen().catch(() => undefined);
  }
  applyOverlayState();
}

interface TickerState {
  lastControlSampleBand: string;
  lastLifeformBand: string;
  lastCoverageBand: string;
  lastDominant: string;
  lastToolPressureTick: number;
  lastReactionCount: number;
  lastAccidentCount: number;
  lastOutbreakCount: number;
  lastMutationCount: number;
  lastObjectiveSummary: string;
  seenSignals: string[];
  didWarnDeadline: boolean;
  didWarnCritical: boolean;
}

function createTickerState(): TickerState {
  return {
    lastControlSampleBand: 'unknown',
    lastLifeformBand: 'unknown',
    lastCoverageBand: 'unknown',
    lastDominant: 'none',
    lastToolPressureTick: -9999,
    lastReactionCount: 0,
    lastAccidentCount: 0,
    lastOutbreakCount: 0,
    lastMutationCount: 0,
    lastObjectiveSummary: '',
    seenSignals: [],
    didWarnDeadline: false,
    didWarnCritical: false,
  };
}

function updateTicker(ar: Arena): void {
  if (tickCount % 45 !== 0) return;
  const controlSample = ar.state.cells.get(PLAYER_ID);
  const controlSampleVol = controlSample?.vol ?? 0;
  const livingLifeforms = Array.from(ar.state.cells)
    .filter(([id, cell]) => id !== PLAYER_ID && cell.vol > 0).length;
  const livingVol = Array.from(ar.state.cells)
    .reduce((sum, [, cell]) => sum + Math.max(0, cell.vol), 0);
  const coverage = livingVol / (LX * LY);
  const ecology = ar.getEcology();
  const objective = ar.getObjectiveProgress();

  for (const signal of ecology.signals.slice().reverse()) {
    if (tickerState.seenSignals.includes(signal)) continue;
    tickerState.seenSignals.push(signal);
    while (tickerState.seenSignals.length > 12) tickerState.seenSignals.shift();
    screens.addTicker(signal);
  }

  const controlSampleBand = controlSampleVol <= 35 ? 'critical' : controlSampleVol <= 140 ? 'thin' : controlSampleVol >= 650 ? 'surging' : 'stable';
  if (controlSampleBand !== tickerState.lastControlSampleBand) {
    tickerState.lastControlSampleBand = controlSampleBand;
    if (controlSampleBand === 'critical') screens.addTicker('Control sample is near collapse.');
    else if (controlSampleBand === 'thin') screens.addTicker('Control sample is destabilizing.');
    else if (controlSampleBand === 'surging') screens.addTicker('Control sample is overgrowing the dish.');
  }

  const lifeformBand = livingLifeforms === 0 ? 'extinct' : livingLifeforms < 3 ? 'thin' : livingLifeforms >= 7 ? 'blooming' : 'stable';
  if (lifeformBand !== tickerState.lastLifeformBand) {
    tickerState.lastLifeformBand = lifeformBand;
    if (lifeformBand === 'extinct') screens.addTicker('Lifeforms have vanished from the dish.');
    else if (lifeformBand === 'thin') screens.addTicker('Lifeform diversity is under threat.');
    else if (lifeformBand === 'blooming') screens.addTicker('Lifeforms are blooming.');
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

  const toolPressure = ar.getToolEffects().find((effect) =>
    effect.type === 'toxin' || effect.type === 'acid' || effect.type === 'salt' || effect.type === 'brine',
  );
  if (toolPressure && tickCount - tickerState.lastToolPressureTick > 240) {
    tickerState.lastToolPressureTick = tickCount;
    screens.addTicker(`${capitalize(toolPressure.type)} pressure is reshaping local movement.`);
  }

  if (ecology.reactions > tickerState.lastReactionCount) {
    tickerState.lastReactionCount = ecology.reactions;
    screens.addTicker('Reagent reaction: unstable chemistry is blooming.', 'caution');
  }

  if (ecology.accidents > tickerState.lastAccidentCount) {
    tickerState.lastAccidentCount = ecology.accidents;
    screens.addTicker('Lab accident: rogue reagent entered the dish.', 'caution');
  }

  if (ecology.outbreaks > tickerState.lastOutbreakCount) {
    tickerState.lastOutbreakCount = ecology.outbreaks;
    screens.addTicker('Predator outbreak: hunter cells erupted from the dominant culture.', 'critical');
  }

  if (ecology.mutations > tickerState.lastMutationCount) {
    tickerState.lastMutationCount = ecology.mutations;
    screens.addTicker('Visible mutation: a culture expressed a new trait.', 'discovery');
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

function readAudioFrame(ar: Arena): {
  eating: number;
  fighting: number;
  reactions: number;
  mutations: number;
  hatches: number;
} {
  let eating = 0;
  let fighting = 0;
  let reactions = 0;
  let mutations = 0;
  let hatches = 0;
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
  const activeReactions = ar.getToolEffects()
    .filter((effect) =>
      effect.type === 'bloom'
      || effect.type === 'brine'
      || effect.type === 'lysis'
      || effect.type === 'foam'
      || effect.type === 'conduit'
      || effect.type === 'flare'
      || effect.type === 'crystal'
      || effect.type === 'fold_fault')
    .filter((effect) => effect.ttl > effect.maxTtl - 4).length;
  reactions += activeReactions;
  mutations += ar.getToolEffects()
    .filter((effect) => effect.type === 'mutation')
    .filter((effect) => effect.ttl > effect.maxTtl - 4).length;
  hatches += ar.getToolEffects()
    .filter((effect) => effect.type === 'hatch')
    .filter((effect) => effect.ttl > effect.maxTtl - 4).length;
  return { eating, fighting, reactions, mutations, hatches };
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
    const color = colorForEffect(effect.type);
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

function colorForEffect(type: ReturnType<Arena['getToolEffects']>[number]['type']): {
  core: [number, number, number];
  edge: [number, number, number];
} {
  switch (type) {
    case 'nutrient': return { core: [212, 214, 94], edge: [102, 170, 96] };
    case 'toxin': return { core: [171, 93, 220], edge: [104, 52, 150] };
    case 'water': return { core: [90, 216, 255], edge: [39, 108, 154] };
    case 'salt': return { core: [234, 246, 242], edge: [128, 158, 154] };
    case 'acid': return { core: [131, 255, 85], edge: [45, 141, 61] };
    case 'bloom': return { core: [246, 255, 96], edge: [60, 232, 152] };
    case 'brine': return { core: [210, 255, 245], edge: [74, 142, 154] };
    case 'lysis': return { core: [255, 98, 98], edge: [144, 32, 82] };
    case 'foam': return { core: [201, 255, 255], edge: [103, 208, 176] };
    case 'conduit': return { core: [128, 255, 176], edge: [64, 196, 255] };
    case 'flare': return { core: [255, 190, 82], edge: [255, 76, 92] };
    case 'crystal': return { core: [214, 255, 248], edge: [91, 196, 255] };
    case 'fold_fault': return { core: [190, 142, 255], edge: [72, 255, 218] };
    case 'mutation': return { core: [255, 205, 74], edge: [255, 92, 174] };
    case 'hatch': return { core: [186, 255, 160], edge: [72, 210, 255] };
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

// Mirrors the renderer's palette logic so inspector swatches match the dish.
function swatchForCellId(cellId: number, _paletteSize: number): string {
  if (cellId === 1) return 'rgb(186, 32, 42)';
  return swatchForArchetype(EGG_ARCHETYPES[(cellId - 2) % EGG_ARCHETYPES.length]!);
}

function swatchForArchetype(archetype: EnemyArchetype): string {
  const [r, g, b] = ARCHETYPE_INFO[archetype].color;
  return `rgb(${r}, ${g}, ${b})`;
}
