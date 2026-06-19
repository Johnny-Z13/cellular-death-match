import { createRun } from './game/run';
import { createArena, type Arena, type ArenaStatus } from './game/arena';
import { createRenderer, type Renderer } from './ui/render';
import { createDebugPanel } from './ui/debug';
import { createScreens, type ToolId } from './ui/screens';
import { getUpgradeDef } from './content/upgrades';
import { ARCHETYPE_INFO, EGG_ARCHETYPES, type EnemyArchetype } from './content/enemies';
import { BREED_DEFS, DISCOVERY_NOTES, type BreedId } from './content/catalysis';
import { notebookViewForProgression, atlasViewForProgression } from './content/notebook';
import { createEcologyAudio } from './audio/ecologyAudio';
import { createUiAudio, DROP_SOUND_FOR_TOOL } from './audio/uiAudio';
import { createFx } from './ui/fx';
import { createCoach } from './ui/coach';
import { onboardingIdleNudge } from './ui/onboardingHints';
import { soundEventForDishSignal, type SoundEventId } from './audio/soundDesign';
import { hash2 } from './game/hash';
import {
  clearDiscoverySave,
  loadDiscoverySave,
  saveDiscoveryState,
  setDiscoveryPersistence,
  type DiscoverySaveState,
} from './game/discoverySave';
import {
  acknowledgeNotebookDiscoveries,
  clearDiscoveryProgression,
  createDiscoveryProgression,
  discoveryAnnouncementsForProgressionChange,
  applyCompletionResearchGrant,
  revealAllDiscoveryProgression,
  updateDiscoveryProgression,
  type DiscoveryDelta,
  type DiscoveryProgressionState,
  type ProgressionLifeformId,
} from './game/discoveryProgression';
import { researchBriefForGrant, type ResearchBriefLine } from './game/researchBrief';
import { applyOnboardingStateReset } from './game/onboardingReset';
import {
  isOnboardingEpoch,
  lifeformUnlocksForCurrentStage,
  shouldUseOnboardingDishForCurrentStage,
  toolUnlocksForCurrentStage,
} from './game/onboardingStage';
import { createStrainLibrary, type StrainLibrary } from './game/strainLibrary';

declare const __COMMIT_MESSAGE__: string;

const LX = 160;
const LY = 160;
const PLAYER_ID = 1;
// Epoch ticks now comes from escalation.ts via arena's fightIndex.
const PASTE_CURSOR_RADIUS = 9; // grid units; mirrors TOOL_TUNING.paste.radius for the draw cursor glow
const reduceMotionPref = typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvasMaybe = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvasMaybe) throw new Error('Missing #game canvas');
const canvas: HTMLCanvasElement = canvasMaybe;
const layoutMaybe = document.querySelector('.layout');
if (!(layoutMaybe instanceof HTMLElement)) throw new Error('Missing .layout');
const layout: HTMLElement = layoutMaybe;
const commitDebug = document.getElementById('commit-debug');
// Build identity readout — lets us confirm a deploy is the latest at a glance.
// Cap to a gist; the full subject can be long.
if (commitDebug) {
  const gist = __COMMIT_MESSAGE__.length > 50
    ? `${__COMMIT_MESSAGE__.slice(0, 50).trimEnd()}…`
    : __COMMIT_MESSAGE__;
  commitDebug.textContent = `build · ${gist}`;
}

const run = createRun(Date.now() & 0xffffffff);
const screens = createScreens();
const debug = createDebugPanel();
const ecologyAudio = createEcologyAudio();
const uiAudio = createUiAudio();
const fx = createFx();
const coach = createCoach();
const discoveryStorage = window.localStorage;
applyOnboardingStateReset(discoveryStorage);
let discoverySave: DiscoverySaveState = loadDiscoverySave(discoveryStorage);
let discoveryProgression = createDiscoveryProgression(discoverySave);
const strainLibrary: StrainLibrary = createStrainLibrary(discoveryStorage);
// Allow up to PALETTE_SIZE total cell colors for evolving ecosystem spawns.
const PALETTE_SIZE = 32;

let arena: Arena | null = null;
let renderer: Renderer | null = null;
let selectedTool: ToolId = 'egg';
let selectedEggArchetype: EnemyArchetype = 'swarmlet';
// When a discovered breed is the active lifeform, the egg hatches that breed.
let selectedBreedId: BreedId | null = null;
let displayedFps = 0;
let framesSinceTick = 0;
let lastFpsTick = performance.now();
let tickCount = 0;
let tickerState = createTickerState();
let didAnnounceCompletion = false;
// Idle-nudge bookkeeping: last tick the player acted, and how many nudges this
// epoch (capped so the assistant never nags).
let lastActionTick = 0;
let nudgeCountThisEpoch = 0;
let heardDishEventIds = new Set<number>();
let pendingResearchBrief: ResearchBriefLine[] = [];
let lastOpeningBloomCreated = false;
let didPlaceEggThisEpoch = false;
let discoveredBreedsThisRun = new Set<string>();
let discoveredHybridsThisRun = new Set<string>();
let peakBiodiversity = 0;

interface RuntimeOverlayState {
  menuOpen: boolean;
  debugOpen: boolean;
  notebookOpen: boolean;
  presentationMode: boolean;
  selectedLifeformId: string | null;
}

const overlayState: RuntimeOverlayState = {
  menuOpen: false,
  debugOpen: false,
  notebookOpen: false,
  presentationMode: false,
  selectedLifeformId: null,
};

debug.onDiscoveryPersistenceChange((enabled) => {
  discoverySave = setDiscoveryPersistence(discoveryStorage, enabled);
  if (enabled) saveRuntimeDiscoveryState();
  debug.updateDiscoveries(discoveryDebugInfo());
});
debug.onClearDiscoveries(() => {
  discoverySave = clearDiscoverySave(discoveryStorage);
  discoveryProgression = clearDiscoveryProgression(discoveryProgression);
  applyDiscoveryProgressionUi();
  refreshArenaToolUi();
  debug.updateDiscoveries(discoveryDebugInfo());
});
debug.onRevealDiscoveries(() => {
  discoveryProgression = revealAllDiscoveryProgression(discoveryProgression);
  saveRuntimeDiscoveryState();
  applyDiscoveryProgressionUi();
  refreshArenaToolUi();
  debug.updateDiscoveries(discoveryDebugInfo());
});
debug.onPresentationToggle(() => {
  setPresentationMode(!overlayState.presentationMode);
});
debug.onReverbToggle((enabled) => {
  uiAudio.unlock();
  uiAudio.setReverbEnabled(enabled);
});
debug.setReverbEnabled(uiAudio.isReverbEnabled());
debug.updateDiscoveries(discoveryDebugInfo());
refreshNotebook();

screens.onNotebookOpen(() => {
  uiAudio.unlock();
  uiAudio.play('ui_select');
  openNotebook();
});
screens.onNotebookClose(() => {
  uiAudio.play('ui_tap');
  closeNotebook();
});
screens.onFullscreenOpen(() => {
  uiAudio.unlock();
  uiAudio.play('ui_tap');
  setPresentationMode(!overlayState.presentationMode);
});

screens.onAudioToggle(() => {
  uiAudio.unlock();
  const nowMuted = uiAudio.toggleMuted();
  screens.setAudioMuted(nowMuted);
  if (!nowMuted) {
    uiAudio.play('ui_select');
    if (run.getState().phase === 'arena') uiAudio.startAmbience();
  }
});
screens.setAudioMuted(uiAudio.isMuted());

screens.onLifeformSelect((id) => {
  if (!currentLifeformUnlocks().includes(id as ProgressionLifeformId)) return;
  overlayState.selectedLifeformId = id;
  screens.setSelectedLifeform(id);
  // Picking any lifeform arms the egg tool so the player can drop it straight
  // away. A discovered breed hatches as that breed; a base strain as its egg.
  selectedBreedId = id in BREED_DEFS ? (id as BreedId) : null;
  selectedTool = 'egg';
  screens.setTool('egg');
});

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  if (overlayState.presentationMode) {
    setPresentationMode(false);
    return;
  }
  if (overlayState.notebookOpen) {
    closeNotebook();
    return;
  }
  overlayState.menuOpen = !overlayState.menuOpen;
  overlayState.debugOpen = overlayState.menuOpen;
  applyOverlayState();
});

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && overlayState.presentationMode) {
    setPresentationMode(false);
  }
});

canvas.tabIndex = 0;
canvas.focus();
canvas.addEventListener('animationend', () => {
  canvas.classList.remove('dish-shake');
});
let pasteStrokeActive = false;
let lastPasteSoundAt = 0;
let pasteCursor: [number, number] | null = null;

// Any deliberate dish action re-arms the idle nudge and clears a visible one.
function registerPlayerAction(): void {
  lastActionTick = tickCount;
  coach.hideNudge();
}

canvas.addEventListener('pointerdown', (event) => {
  if (!arena || run.getState().phase !== 'arena') return;
  ecologyAudio.unlock();
  const pos = canvasEventToGridPos(event);
  if (selectedTool === 'paste') {
    // Begin a drawn stroke; subsequent pointermove events lay the trail.
    pasteStrokeActive = true;
    pasteCursor = pos;
    canvas.setPointerCapture(event.pointerId);
    if (arena.applyTool('paste', pos)) {
      uiAudio.play('drop_paste');
      screens.updateToolCharges(arena.getToolStates());
      coach.report('paste-drawn');
      registerPlayerAction();
    }
    return;
  }
  if (arena.applyTool(selectedTool, pos, {
    eggArchetype: selectedEggArchetype,
    eggBreedId: selectedBreedId ?? undefined,
  })) {
    // Egg keeps the soft UI tap; reagents get their own bespoke drop sound.
    uiAudio.play(DROP_SOUND_FOR_TOOL[selectedTool] ?? 'ui_tap');
    screens.updateToolCharges(arena.getToolStates());
    if (selectedTool === 'egg') {
      didPlaceEggThisEpoch = true;
      coach.report('egg-placed');
    } else if (selectedTool === 'nutrient') {
      coach.report('nutrient-used');
    }
    updateButtonHint();
    registerPlayerAction();
  }
});

canvas.addEventListener('pointermove', (event) => {
  if (!pasteStrokeActive || !arena || run.getState().phase !== 'arena') return;
  const pos = canvasEventToGridPos(event);
  pasteCursor = pos;
  if (arena.applyTool('paste', pos)) {
    screens.updateToolCharges(arena.getToolStates());
    coach.report('paste-drawn');
    registerPlayerAction();
    // Soft smear while drawing, rate-limited so a drag doesn't machine-gun it.
    const now = performance.now();
    if (now - lastPasteSoundAt > 150) {
      lastPasteSoundAt = now;
      uiAudio.play('drop_paste');
    }
  }
});

function endPasteStroke(event?: PointerEvent): void {
  if (!pasteStrokeActive) return;
  pasteStrokeActive = false;
  pasteCursor = null;
  arena?.endPasteStroke();
  if (event) {
    try { canvas.releasePointerCapture(event.pointerId); } catch { /* already released */ }
  }
}

canvas.addEventListener('pointerup', endPasteStroke);
canvas.addEventListener('pointercancel', endPasteStroke);

screens.onTitleStart(() => {
  ecologyAudio.unlock();
  uiAudio.unlock();
  uiAudio.play('ui_select');
  run.start();
  discoveredBreedsThisRun = new Set();
  discoveredHybridsThisRun = new Set();
  peakBiodiversity = 0;
  startNewFight();
});
screens.onEndRestart(() => {
  uiAudio.play('ui_select');
  fx.playWipe();
  run.restart();
  showPhase();
});
screens.onToolSelect((tool) => {
  if (!currentToolUnlocks().includes(tool)) return;
  uiAudio.play('ui_select');
  selectedTool = tool;
  screens.setTool(tool);
});
screens.onAgitate(() => {
  if (!arena || run.getState().phase !== 'arena') return;
  ecologyAudio.unlock();
  uiAudio.play('ui_tap');
  if (!arena.agitate()) return;
  registerPlayerAction();
  screens.updateAgitation(arena.getAgitationState());
  screens.addTicker('Dish agitated: lifeforms are mixing.');
  canvas.classList.remove('dish-shake');
  void canvas.offsetWidth;
  canvas.classList.add('dish-shake');
});
screens.onEndEpoch(() => {
  if (!arena || run.getState().phase !== 'arena') return;
  ecologyAudio.unlock();
  uiAudio.play('ui_tap');
  const status = arena.endEpochNow();
  resolveArenaStatus(status);
});
screens.setEggOptions(EGG_ARCHETYPES.map((archetype) => ({
  archetype,
  ...ARCHETYPE_INFO[archetype],
})));
applyDiscoveryProgressionUi();
screens.onEggSelect((archetype) => {
  if (!isUnlockedEggArchetype(archetype)) return;
  uiAudio.play('ui_select');
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
  screens.hide('notebook');
  screens.hide('hud');
  overlayState.notebookOpen = false;
  const state = run.getState();
  if (overlayState.presentationMode && state.phase !== 'arena') {
    setPresentationMode(false);
  }
  if (state.phase === 'title') {
    updateButtonHint();
    screens.show('title');
  } else if (state.phase === 'arena') {
    screens.show('hud');
    updateButtonHint();
    // arena was started by startNewFight(); HUD updates in loop.
  } else if (state.phase === 'upgrade_pick') {
    updateButtonHint();
    const choices = state.pendingPickChoices.map((id) => ({ id, def: getUpgradeDef(id)! }));
    screens.setPickChoices(choices, (id) => {
      uiAudio.play('ui_select');
      fx.playWipe();
      run.pickUpgrade(id);
      startNewFight();
    });
    screens.show('pick');
  } else if (state.phase === 'run_end') {
    updateButtonHint();
    screens.updateEnd({
      outcome: state.outcome ?? 'lost',
      fightReached: state.fightIndex + 1,
      totalFights: 0,  // open-ended run
      objectivesCompleted: state.epochResults.filter((result) => result === 'completed').length,
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
  const runState = run.getState();
  const useOnboardingDish = shouldUseOnboardingDishForCurrentStage(runState.fightIndex, false);
  const enemies = useOnboardingDish ? run.getOnboardingSpawnList() : run.getEpochSpawnList();
  arena = createArena({
    LX,
    LY,
    seed: (Date.now() & 0xffffffff) ^ (runState.fightIndex * 2654435761),
    player: playerCfg,
    enemies,
    wrap: false,
    mode: 'ecosystem',
    includeControlSample: !useOnboardingDish,
    objective: run.getObjective(),
    fightIndex: runState.fightIndex,
  });
  renderer = createRenderer(canvas, PALETTE_SIZE);
  tickCount = 0;
  tickerState = createTickerState();
  heardDishEventIds = new Set<number>();
  didAnnounceCompletion = false;
  lastOpeningBloomCreated = false;
  didPlaceEggThisEpoch = false;
  lastActionTick = 0;
  nudgeCountThisEpoch = 0;
  applyDiscoveryProgressionUi();
  screens.setEpochComplete(false);
  screens.clearTicker();
  screens.setPickResearchBrief([]);
  const objective = run.getObjective();
  screens.addTicker(`Objective received: ${objective.name}.`);
  replayPendingResearchBrief();
  if (!uiAudio.isMuted()) uiAudio.startAmbience();
  uiAudio.play('epoch_begin');
  fx.showEpochBanner(
    `Epoch ${runState.fightIndex + 1}`,
    objective.name,
    objective.description,
  );
  // First epoch of a run: bring up the onboarding coach (first run only).
  if (runState.fightIndex === 0) {
    coach.onOnboardingComplete = () => {
      // Auto-end Epoch 1 when bloom is discovered.
      if (arena) {
        persistArenaDiscoveries(arena);
        awardCompletionResearchGrant();
      }
      uiAudio.play('epoch_win');
      fx.playWipe();
      run.completeEpoch();
      showPhase();
    };
    coach.beginRun();
  }
  screens.updateToolCharges(arena.getToolStates());
  screens.updateAgitation(arena.getAgitationState());
  updateButtonHint();
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

  const currentOpeningBloomCreated = openingBloomCreatedInCurrentDish();
  if (currentOpeningBloomCreated !== lastOpeningBloomCreated) {
    lastOpeningBloomCreated = currentOpeningBloomCreated;
    if (currentOpeningBloomCreated) {
      advanceDiscoveryProgression(arena.getEcology().discoveries);
      coach.report('bloom-discovered');
    }
    applyDiscoveryProgressionUi();
    refreshArenaToolUi();
    updateButtonHint();
  }

  // HUD update.
  if (player) {
    const runState = run.getState();
    const ecology = arena.getEcology();
    const objective = arena.getObjectiveProgress();
    screens.updateHud({
      fightIndex: runState.fightIndex,
      totalFights: 0,  // open-ended run
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
      worldEvents: ecology.worldEvents,
      dominant: ecology.dominant,
      crisis: ecology.crisis,
      objectiveName: objective.def.name,
      objectiveSummary: objective.summary,
      objectiveHint: objective.def.hint ?? '',
      objectiveComplete: objective.complete,
      upgrades: runState.upgrades.map((u) => {
        const def = getUpgradeDef(u.id);
        if (!def) return u.id;
        return u.stacks > 1 ? `${def.name} x${u.stacks}` : def.name;
      }),
    });
    screens.updateToolCharges(arena.getToolStates());
    screens.updateAgitation(arena.getAgitationState());
    screens.setEpochComplete(objective.complete);
    updateButtonHint();
    announceEpochCompletion(objective.complete, objective.def.name);
    maybeNudgeIdlePlayer(objective.complete, objective.def.hint);
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

  // Track peak biodiversity for lab report.
  const livingBreeds = new Set<string>();
  for (const [cellId, cell] of arena.state.cells) {
    if (cell.vol <= 0) continue;
    const spawn = arena.archetypes.get(cellId);
    if (spawn) livingBreeds.add(spawn.breedId ?? spawn.archetype);
  }
  if (livingBreeds.size > peakBiodiversity) peakBiodiversity = livingBreeds.size;

  // Homeostasis check: if equilibrium achieved, end the run as won.
  if (!isOnboardingEpoch(run.getState().fightIndex) && arena.isHomeostasisAchieved()) {
    persistArenaDiscoveries(arena);
    awardCompletionResearchGrant();
    bankRunStrains();
    uiAudio.play('epoch_win');
    fx.playWipe();
    run.achieveHomeostasis();
    uiAudio.stopAmbience();
    showPhase();
    return;
  }

  // Ecosystem collapse check: if all cells dead past onboarding, end run.
  if (!isOnboardingEpoch(run.getState().fightIndex) && arena.isEcosystemCollapsed() && tickCount > 120) {
    bankRunStrains();
    uiAudio.play('epoch_fail');
    fx.playWipe();
    run.failEpoch();
    uiAudio.stopAmbience();
    showPhase();
    return;
  }

  // Status check: did this tick end the fight?
  if (resolveArenaStatus(arena.getStatus())) return;

  scheduleLoop();
}

function bankRunStrains(): void {
  for (const breedId of discoveredBreedsThisRun) {
    strainLibrary.bankStrain(breedId);
  }
  strainLibrary.incrementRunCount();
  strainLibrary.save();
}

function resolveArenaStatus(status: ArenaStatus): boolean {
  if (status === 'won') {
    if (arena) {
      persistArenaDiscoveries(arena);
      awardCompletionResearchGrant();
    }
    uiAudio.play('epoch_win');
    fx.playWipe();
    run.completeEpoch();
    if (run.getState().phase === 'run_end') uiAudio.stopAmbience();
    showPhase();
    return true;
  }
  if (status === 'lost') {
    // Playful-discovery model: a missed objective doesn't end the run — the
    // player moves on to the next epoch (still gets an upgrade pick). Only the
    // final epoch closes the run.
    uiAudio.play('epoch_fail');
    fx.playWipe();
    fx.showToast('catalyst', 'Objective Lapsed', 'Moving to the next ecosystem');
    run.skipEpoch();
    if (run.getState().phase === 'run_end') uiAudio.stopAmbience();
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
  advanceDiscoveryProgression(discoveries);
}

function awardCompletionResearchGrant(): void {
  const previousTools = discoveryProgression.unlockedTools;
  const previousLifeforms = discoveryProgression.unlockedLifeforms;
  const result = applyCompletionResearchGrant(discoveryProgression);
  if (!result) {
    pendingResearchBrief = [];
    screens.setPickResearchBrief([]);
    return;
  }

  discoveryProgression = result.progression;
  applyDiscoveryProgressionUi();
  announceUnlocks(previousTools, previousLifeforms, discoveryProgression);
  pendingResearchBrief = researchBriefForGrant(result.grant);
  screens.setPickResearchBrief(pendingResearchBrief);
  saveRuntimeDiscoveryState();
  debug.updateDiscoveries(discoveryDebugInfo());
}

function replayPendingResearchBrief(): void {
  if (pendingResearchBrief.length === 0) return;
  for (const line of pendingResearchBrief) {
    screens.addTicker(line.message, line.tone);
  }
  pendingResearchBrief = [];
}

function advanceDiscoveryProgression(delta: DiscoveryDelta): boolean {
  const previousProgression = discoveryProgression;
  const previousTools = previousProgression.unlockedTools;
  const previousLifeforms = previousProgression.unlockedLifeforms;
  const nextProgression = updateDiscoveryProgression(previousProgression, delta);
  const changed = previousTools.join('|') !== nextProgression.unlockedTools.join('|')
    || previousLifeforms.join('|') !== nextProgression.unlockedLifeforms.join('|')
    || previousProgression.discoveredBreedIds.join('|') !== nextProgression.discoveredBreedIds.join('|')
    || previousProgression.discoveredNoteIds.join('|') !== nextProgression.discoveredNoteIds.join('|');
  if (!changed) return false;

  discoveryProgression = nextProgression;
  // Track discoveries for this run (for lab report and strain banking).
  for (const breedId of nextProgression.discoveredBreedIds) {
    if (!previousProgression.discoveredBreedIds.includes(breedId)) {
      discoveredBreedsThisRun.add(breedId);
      const def = BREED_DEFS[breedId as BreedId];
      if (def?.parents) discoveredHybridsThisRun.add(breedId);
    }
  }
  applyDiscoveryProgressionUi();
  announceDiscoveryProgressionChange(previousProgression, nextProgression);
  announceUnlocks(previousTools, previousLifeforms, discoveryProgression);
  saveRuntimeDiscoveryState();
  debug.updateDiscoveries(discoveryDebugInfo());
  return true;
}

function discoveryDebugInfo(): {
  persistenceEnabled: boolean;
  discoveredCount: number;
  discoveredCatalysts: string[];
  discoveredLifeforms: string[];
  revealAll: boolean;
} {
  return {
    persistenceEnabled: discoverySave.persistenceEnabled,
    discoveredCount: unique([
      ...discoveryProgression.discoveredBreedIds,
      ...discoveryProgression.discoveredNoteIds,
    ]).length,
    discoveredCatalysts: discoveryProgression.discoveredNoteIds
      .filter((noteId) => noteId.startsWith('recipe_'))
      .map((noteId) => DISCOVERY_NOTES[noteId].title),
    discoveredLifeforms: discoveryProgression.discoveredBreedIds
      .map((breedId) => BREED_DEFS[breedId].name),
    revealAll: discoveryProgression.revealAll,
  };
}

function saveRuntimeDiscoveryState(): void {
  if (!discoverySave.persistenceEnabled) return;
  discoverySave = saveDiscoveryState(discoveryStorage, {
    ...discoverySave,
    discoveredBreedIds: discoveryProgression.discoveredBreedIds,
    discoveredNoteIds: discoveryProgression.discoveredNoteIds,
    breedDiscoveryRecords: discoveryProgression.breedDiscoveryRecords,
    noteDiscoveryRecords: discoveryProgression.noteDiscoveryRecords,
    revealAll: discoveryProgression.revealAll,
  });
}

function applyDiscoveryProgressionUi(): void {
  const unlockedTools = currentToolUnlocks();
  const unlockedLifeforms = currentLifeformUnlocks();
  screens.setToolUnlocks(unlockedTools);
  screens.setAgitateUnlocked(!shouldUseOnboardingDishForCurrentStage(
    run.getState().fightIndex,
    openingBloomCreatedInCurrentDish(),
  ));
  screens.setLifeformUnlocks(unlockedLifeforms);
  refreshNotebook();

  if (!unlockedTools.includes(selectedTool)) {
    selectedTool = 'egg';
  }
  if (!isUnlockedEggArchetype(selectedEggArchetype)) {
    selectedEggArchetype = 'swarmlet';
  }

  screens.setTool(selectedTool);
  screens.setEggArchetype(selectedEggArchetype);
  if (
    !overlayState.selectedLifeformId
    || !unlockedLifeforms.includes(overlayState.selectedLifeformId as ProgressionLifeformId)
  ) {
    overlayState.selectedLifeformId = selectedEggArchetype;
  }
  screens.setSelectedLifeform(overlayState.selectedLifeformId);
}

function currentToolUnlocks(): readonly ToolId[] {
  return toolUnlocksForCurrentStage(
    discoveryProgression,
    run.getState().fightIndex,
    openingBloomCreatedInCurrentDish(),
  );
}

function currentLifeformUnlocks(): readonly ProgressionLifeformId[] {
  return lifeformUnlocksForCurrentStage(
    discoveryProgression,
    run.getState().fightIndex,
    openingBloomCreatedInCurrentDish(),
  );
}

function openingBloomCreatedInCurrentDish(): boolean {
  return arena?.getEcology().discoveries.breedIds.includes('bloom_mass') === true;
}

function updateButtonHint(): void {
  const state = run.getState();
  if (state.phase !== 'arena' || !arena) {
    screens.setButtonHint(null);
    return;
  }

  if (arena.getObjectiveProgress().complete) {
    screens.setButtonHint(null);
    return;
  }

  if (shouldUseOnboardingDishForCurrentStage(state.fightIndex, openingBloomCreatedInCurrentDish())) {
    if (!didPlaceEggThisEpoch) {
      screens.setButtonHint('egg', 'hint');
    } else {
      screens.setButtonHint('nutrient', 'hint');
    }
    return;
  }

  screens.setButtonHint(null);
}

function refreshArenaToolUi(): void {
  if (!arena) return;
  screens.updateToolCharges(arena.getToolStates());
  screens.updateAgitation(arena.getAgitationState());
}

function isUnlockedEggArchetype(archetype: EnemyArchetype): boolean {
  return currentLifeformUnlocks().includes(archetype);
}

function announceDiscoveryProgressionChange(
  previous: DiscoveryProgressionState,
  next: DiscoveryProgressionState,
): void {
  for (const announcement of discoveryAnnouncementsForProgressionChange(previous, next)) {
    screens.addTicker(announcement.message, announcement.tone);
  }
}

function announceUnlocks(
  previousTools: readonly ToolId[],
  previousLifeforms: readonly ProgressionLifeformId[],
  next: { unlockedTools: readonly ToolId[]; unlockedLifeforms: readonly ProgressionLifeformId[] },
): void {
  for (const tool of next.unlockedTools) {
    if (previousTools.includes(tool)) continue;
    screens.showcaseToolUnlock(tool);
    screens.addTicker(`Research unlocked: ${capitalize(tool)} reagent available.`, 'discovery');
    fx.showToast('catalyst', 'Reagent Unlocked', `${capitalize(tool)} now available`);
  }
  // A breed unlock is the headline moment; if several things unlock at once,
  // the breed banner wins the center screen over a plain strain banner.
  let bannerBreed: string | null = null;
  let bannerStrain: string | null = null;
  for (const lifeform of next.unlockedLifeforms) {
    if (previousLifeforms.includes(lifeform)) continue;
    screens.showcaseLifeformUnlock(lifeform);
    if (isBaseArchetype(lifeform)) {
      screens.addTicker(`Research unlocked: ${ARCHETYPE_INFO[lifeform].name} eggs available.`, 'discovery');
      fx.showToast('discovery', 'Strain Unlocked', `${ARCHETYPE_INFO[lifeform].name} eggs`);
      bannerStrain ??= ARCHETYPE_INFO[lifeform].name;
    } else if (lifeform in BREED_DEFS) {
      screens.addTicker(`New lifeform catalogued: ${BREED_DEFS[lifeform].name}.`, 'discovery');
      fx.showToast('lifeform', 'New Lifeform', BREED_DEFS[lifeform].name);
      bannerBreed ??= BREED_DEFS[lifeform].name;
    }
  }
  if (bannerBreed) {
    fx.showUnlockBanner('Breed Unlocked', bannerBreed, 'Catalogued in the Notebook', 'violet');
  } else if (bannerStrain) {
    fx.showUnlockBanner('Strain Unlocked', bannerStrain, 'New egg available', 'bio');
  }
}

// Gentle idle nudge: if the player hasn't touched the dish for a while and the
// objective isn't complete, surface its authored hint ("Lab Assistant" voice).
// Capped per epoch and suppressed while the tutorial coach is active, so it
// helps a stuck player without ever nagging an engaged one.
const NUDGE_IDLE_TICKS = 60 * 22;
const MAX_NUDGES_PER_EPOCH = 2;

function maybeNudgeIdlePlayer(objectiveComplete: boolean, hint: string | undefined): void {
  if (nudgeCountThisEpoch >= MAX_NUDGES_PER_EPOCH) return;
  if (tickCount - lastActionTick < NUDGE_IDLE_TICKS) return;
  const nudge = onboardingIdleNudge({
    objectiveComplete,
    tutorialActive: coach.isActive(),
    objectiveHint: hint,
  });
  nudgeCountThisEpoch += 1;
  lastActionTick = tickCount; // another full idle stretch before the next one
  coach.showNudge(
    nudge.title,
    nudge.body,
    { interruptTutorial: nudge.interruptTutorial },
  );
}

// Fire a one-time "experiment complete" signpost the first moment the dish
// satisfies its objective, so the player knows they can finish (or keep
// cultivating). Latched objectives stay complete; balance objectives can flip
// back to incomplete, so we re-arm the announcement if completion is lost.
function announceEpochCompletion(complete: boolean, objectiveName: string): void {
  if (complete && !didAnnounceCompletion) {
    didAnnounceCompletion = true;
    uiAudio.play('experiment_ready');
    fx.showToast('discovery', 'Experiment Complete', `${objectiveName} — finish when ready`);
    screens.addTicker('Experiment complete: press End to finish, or keep cultivating.', 'discovery');
    coach.report('objective-complete');
  } else if (!complete && didAnnounceCompletion) {
    didAnnounceCompletion = false;
  }
}

function isBaseArchetype(id: ProgressionLifeformId): id is EnemyArchetype {
  return (EGG_ARCHETYPES as readonly string[]).includes(id);
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function applyOverlayState(): void {
  layout.classList.toggle('debug-open', overlayState.debugOpen);
  layout.classList.toggle('menu-open', overlayState.menuOpen);
  layout.classList.toggle('presentation-mode', overlayState.presentationMode);
}

function refreshNotebook(): void {
  screens.updateNotebook(notebookViewForProgression(discoveryProgression));
  screens.updateAtlas(atlasViewForProgression(discoveryProgression));
}

function openNotebook(): void {
  // Render with fresh-discovery badges first, then acknowledge them so the
  // NEW markers show this open and clear (persistently) for the next one.
  refreshNotebook();
  const acknowledged = acknowledgeNotebookDiscoveries(discoveryProgression);
  if (acknowledged !== discoveryProgression) {
    discoveryProgression = acknowledged;
    saveRuntimeDiscoveryState();
    debug.updateDiscoveries(discoveryDebugInfo());
  }
  overlayState.notebookOpen = true;
  overlayState.menuOpen = false;
  overlayState.debugOpen = false;
  screens.show('notebook');
  applyOverlayState();
}

function closeNotebook(): void {
  overlayState.notebookOpen = false;
  // Let the tablet slide out before hiding; reduced-motion closes instantly.
  const notebookScreen = document.getElementById('screen-notebook');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (notebookScreen && !reduceMotion && notebookScreen.classList.contains('visible')) {
    notebookScreen.classList.add('notebook-screen-closing');
    window.setTimeout(() => {
      notebookScreen.classList.remove('notebook-screen-closing');
      screens.hide('notebook');
    }, 210);
  } else {
    screens.hide('notebook');
  }
  applyOverlayState();
}

function setPresentationMode(enabled: boolean): void {
  overlayState.presentationMode = enabled;
  screens.setFullscreenActive(enabled);
  if (enabled) {
    overlayState.menuOpen = false;
    overlayState.debugOpen = false;
    closeNotebook();
  }
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
    screens.addTicker(signal, toneForTickerSignal(signal));
  }

  const controlSampleBand = controlSampleVol <= 35 ? 'critical' : controlSampleVol <= 140 ? 'thin' : controlSampleVol >= 650 ? 'surging' : 'stable';
  if (controlSampleBand !== tickerState.lastControlSampleBand) {
    tickerState.lastControlSampleBand = controlSampleBand;
    if (controlSampleBand === 'critical') screens.addTicker('Control sample is near collapse.', 'critical');
    else if (controlSampleBand === 'thin') screens.addTicker('Control sample is destabilizing.', 'caution');
    else if (controlSampleBand === 'surging') screens.addTicker('Control sample is overgrowing the dish.', 'caution');
  }

  const lifeformBand = livingLifeforms === 0 ? 'extinct' : livingLifeforms < 3 ? 'thin' : livingLifeforms >= 7 ? 'blooming' : 'stable';
  if (lifeformBand !== tickerState.lastLifeformBand) {
    tickerState.lastLifeformBand = lifeformBand;
    if (lifeformBand === 'extinct') screens.addTicker('Lifeforms have vanished from the dish.', 'critical');
    else if (lifeformBand === 'thin') screens.addTicker('Lifeform diversity is under threat.', 'caution');
    else if (lifeformBand === 'blooming') screens.addTicker('Lifeforms are blooming.', 'discovery');
  }

  const coverageBand = coverage <= 0.08 ? 'sterile' : coverage >= 0.42 ? 'bloom' : 'normal';
  if (coverageBand !== tickerState.lastCoverageBand) {
    tickerState.lastCoverageBand = coverageBand;
    if (coverageBand === 'sterile') screens.addTicker('Dish is approaching sterility.', 'critical');
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
    screens.addTicker(`${capitalize(toolPressure.type)} pressure is reshaping local movement.`, 'caution');
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
    screens.addTicker('Deadline pressure is rising.', 'caution');
  } else if (!tickerState.didWarnCritical && objective.urgency === 'critical') {
    tickerState.didWarnCritical = true;
    screens.addTicker('Final seconds: finish the objective now.', 'critical');
  }
}

function toneForTickerSignal(signal: string): 'normal' | 'discovery' | 'caution' | 'critical' {
  if (signal.startsWith('NEW LIFEFORM CREATED')) return 'discovery';
  if (signal.startsWith('NEW BREED DISCOVERED')) return 'discovery';
  if (signal.startsWith('CATALYTIC FLARE') || signal.startsWith('FOLDING FAULT') || signal.startsWith('Crisis')) {
    return 'critical';
  }
  if (signal.startsWith('CATALYTIC') || signal.startsWith('Lab accident') || signal.startsWith('CAUTION')) {
    return 'caution';
  }
  if (signal.startsWith('Lab note') || signal.includes('mutation') || signal.includes('cultured')) return 'discovery';
  return 'normal';
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
  events: SoundEventId[];
} {
  let eating = 0;
  let fighting = 0;
  let reactions = 0;
  let mutations = 0;
  let hatches = 0;
  const events: SoundEventId[] = [];
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
  if (hatches > 0) events.push('hatch');
  for (const event of ar.getDishEvents()) {
    if (heardDishEventIds.has(event.id)) continue;
    heardDishEventIds.add(event.id);
    const sound = soundEventForDishSignal(event.kind, event.label);
    if (sound) events.push(sound);
  }
  return { eating, fighting, reactions, mutations, hatches, events };
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

  // Glowing leading marker at the paste cursor while drawing a trail.
  if (pasteCursor && !reduceMotionPref) {
    const cx = (pasteCursor[0] + 0.5) * sx;
    const cy = (pasteCursor[1] + 0.5) * sy;
    const pulse = 0.5 + 0.5 * Math.sin(tickCount * 0.25);
    const baseR = PASTE_CURSOR_RADIUS * ((sx + sy) / 2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR);
    grad.addColorStop(0, `rgba(182, 227, 106, ${0.34 + 0.18 * pulse})`);
    grad.addColorStop(0.6, 'rgba(120, 190, 90, 0.12)');
    grad.addColorStop(1, 'rgba(120, 190, 90, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(214, 255, 170, ${0.5 + 0.3 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, baseR * (0.5 + 0.16 * pulse), 0, Math.PI * 2);
    ctx.stroke();
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
