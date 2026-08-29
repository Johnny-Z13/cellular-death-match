import { createRun } from './game/run';
import { createArena, type Arena, type ArenaStatus } from './game/arena';
import { createRenderer, type Renderer } from './ui/render';
import { createDebugPanel } from './ui/debug';
import { createScreens, type ToolId } from './ui/screens';
import { AGITATION_TUNING, SIM_SPEED_TUNING, TOOL_TUNING } from './content/ecologyTuning';
import { renderLoadoutScreen } from './ui/loadoutScreen';
import { getUpgradeDef } from './content/upgrades';
import { COMMON_COLD_CASE, trialForIndex } from './content/researchCases';
import { loadCaseRecord, recordCompletedTrial } from './game/caseRecord';
import { ARCHETYPE_INFO, EGG_ARCHETYPES, type EnemyArchetype } from './content/enemies';
import { BREED_DEFS, DISCOVERY_NOTES, type BreedId, type DiscoveryNoteId } from './content/catalysis';
import { notebookViewForProgression, atlasViewForProgression } from './content/notebook';
import { researchNotebookView, type ActiveStudySnapshot } from './game/researchNotebook';
import {
  LIFEFORM_IDENTITIES,
  lifeformIdentityForSpawn,
  type LifeformIdentityId,
} from './content/lifeformIdentity';
import { genomeArtFor, type GenomeArtIdentity } from './content/genomeArt';
import { createEcologyAudio } from './audio/ecologyAudio';
import { createUiAudio, DROP_SOUND_FOR_TOOL } from './audio/uiAudio';
import { createFx } from './ui/fx';
import { createCoach } from './ui/coach';
import { createJuice } from './ui/juice';
import { onboardingIdleNudge } from './ui/onboardingHints';
import {
  LIFEFORM_SOUND_IDENTITIES,
  soundEventForDishSignal,
  type SoundEventId,
} from './audio/soundDesign';
import { assembleLabReport, type LabReport } from './game/labReport';
import { createRunTelemetry, type RunTelemetry } from './game/runTelemetry';
import { createRunEndReportInput } from './game/runFlow';
import { finalBreedCountsFor, finalBreedVolumesFor } from './game/runSnapshot';
import {
  clearRunCheckpointVerified,
  loadRunCheckpoint,
  saveRunCheckpoint,
  type RunCheckpoint,
} from './game/runCheckpoint';
import { createFixedStepClock, normalizeSimTicksPerSecond } from './game/simClock';
import { hash2 } from './game/hash';
import { lifeformUnlocksForCurrentRun } from './game/lifeformLoadout';
import {
  appendUniqueGenomeDecodes,
  genomeDecodeEventsForProgressionChange,
} from './game/genomeDiscovery';
import {
  loadDiscoverySave,
  saveDiscoveryStateVerified,
  type DiscoverySaveState,
} from './game/discoverySave';
import {
  acknowledgeNotebookDiscoveries,
  createDiscoveryProgression,
  discoveryAnnouncementsForProgressionChange,
  revealAllDiscoveryProgression,
  ALL_PROGRESSION_LIFEFORMS,
  ALL_PROGRESSION_TOOLS,
  updateDiscoveryProgression,
  type DiscoveryDelta,
  type DiscoveryStageDelta,
  type DiscoveryProgressionState,
  type ProgressionLifeformId,
} from './game/discoveryProgression';
import { applyOnboardingStateReset } from './game/onboardingReset';
import {
  isOnboardingEpoch,
  lifeformUnlocksForCurrentStage,
  shouldUseOnboardingDishForCurrentStage,
  toolUnlocksForCurrentStage,
} from './game/onboardingStage';
import {
  createStrainLibrary,
  loadStrainLibraryState,
  type StrainLibrary,
} from './game/strainLibrary';
import {
  loadResearchArchive,
  recordResearchEvidence,
  researchSealById,
  revealAllResearchArchive,
  saveResearchArchive,
  saveResearchArchiveVerified,
  type ResearchArchiveState,
} from './game/researchArchive';
import { createTitleAutomata } from './ui/titleAutomata';
import { createHaptics } from './ui/haptics';
import {
  applyCanvasProfile,
  browserPerformanceSignals,
  performanceProfileFor,
  shouldRenderFrame,
} from './ui/mobilePerformance';
import {
  executeResearchBank,
  loadPendingResearchBank,
  planResearchBank,
  replayPendingResearchBank,
  type PlannedResearchBank,
  type ResearchBankCommit,
} from './game/researchBank';
import {
  persistResearchOwnershipReconciliation,
  reconcileResearchOwnership,
} from './game/researchOwnership';
import { isObjectiveFeasible, type StudyCapabilities } from './game/objectivePool';
import { dishExitState } from './game/dishExitAction';
import { studyIntroductionRoute } from './ui/studyIntroduction';
import { isCrazyGamesEnvironment } from './platform/crazyGames';

declare const __COMMIT_MESSAGE__: string;

const LX = 160;
const LY = 160;
const PLAYER_ID = 1;
// Epoch ticks now comes from escalation.ts via arena's fightIndex.
const PASTE_CURSOR_RADIUS = 9; // grid units; mirrors TOOL_TUNING.paste.radius for the draw cursor glow
const HOMEOSTASIS_SUSTAIN_TICKS = 60 * 20;
const reduceMotionPref = typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvasMaybe = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvasMaybe) throw new Error('Missing #game canvas');
const canvas: HTMLCanvasElement = canvasMaybe;
const onboardingGuidePointer = document.getElementById('onboarding-guide-pointer');
const layoutMaybe = document.querySelector('.layout');
if (!(layoutMaybe instanceof HTMLElement)) throw new Error('Missing .layout');
const layout: HTMLElement = layoutMaybe;
let visualProfile = performanceProfileFor(browserPerformanceSignals());
applyCanvasProfile(canvas, visualProfile);
layout.dataset.visualQuality = visualProfile.id;
layout.dataset.diagnostics = String(new URLSearchParams(window.location.search).has('physdebug'));
const commitDebug = document.getElementById('commit-debug');
// Build identity readout — lets us confirm a deploy is the latest at a glance.
// Cap to a gist; the full subject can be long.
if (commitDebug) {
  const gist = __COMMIT_MESSAGE__.length > 50
    ? `${__COMMIT_MESSAGE__.slice(0, 50).trimEnd()}…`
    : __COMMIT_MESSAGE__;
  commitDebug.textContent = `build · ${gist}`;
}

const runtimeStorage = window.localStorage;
applyOnboardingStateReset(runtimeStorage);
const startupBankReplay = replayPendingResearchBank(runtimeStorage);
let persistenceUnavailable = startupBankReplay?.status === 'unavailable';
let pendingResearchBank: ResearchBankCommit | null = loadPendingResearchBank(runtimeStorage);
let discoverySave: DiscoverySaveState = loadDiscoverySave(runtimeStorage);
if (!pendingResearchBank) {
  const ownershipRepair = reconcileResearchOwnership(
    discoverySave,
    loadStrainLibraryState(runtimeStorage),
  );
  const ownershipRepairResult = persistResearchOwnershipReconciliation(runtimeStorage, ownershipRepair);
  persistenceUnavailable ||= ownershipRepairResult.status === 'unavailable';
  discoverySave = loadDiscoverySave(runtimeStorage);
}
let activeRunCheckpoint: RunCheckpoint | null = loadRunCheckpoint(runtimeStorage);
let caseRecord = loadCaseRecord(runtimeStorage);
let researchArchive: ResearchArchiveState = loadResearchArchive(runtimeStorage);
const run = createRun(activeRunCheckpoint?.run.seed ?? (Date.now() & 0xffffffff));
const screens = createScreens();
const debug = createDebugPanel();
const customFullscreenAvailable = !isCrazyGamesEnvironment({
  currentUrl: window.location.href,
  referrer: document.referrer,
  ancestorOrigins: Array.from(window.location.ancestorOrigins),
});
layout.dataset.crazygames = String(!customFullscreenAvailable);
screens.setFullscreenAvailable(customFullscreenAvailable);
debug.setPresentationAvailable(customFullscreenAvailable);
const ecologyAudio = createEcologyAudio();
const uiAudio = createUiAudio();
const haptics = createHaptics();
const fx = createFx();
const coach = createCoach();
createTitleAutomata();

// Publish the HUD's live bottom edge so the Professor's transmission rail can
// use the quiet band above the dish without colliding with wrapped status copy.
const hudEl = document.getElementById('hud');
if (hudEl && typeof ResizeObserver === 'function') {
  const publishHudBottom = () => {
    const r = hudEl.getBoundingClientRect();
    const bottom = hudEl.classList.contains('visible') ? r.bottom : 0;
    layout.style.setProperty('--hud-bottom', `${Math.round(bottom)}px`);
  };
  new ResizeObserver(publishHudBottom).observe(hudEl);
  window.addEventListener('resize', publishHudBottom);
  // Class flips (show/hide) don't trigger ResizeObserver; catch them too.
  new MutationObserver(publishHudBottom).observe(hudEl, { attributes: true, attributeFilter: ['class'] });
  publishHudBottom();
}

const simClock = createFixedStepClock({
  ticksPerSecond: loadSimTicksPerSecond(runtimeStorage),
  nowMs: performance.now(),
});
debug.setSimSpeedBounds(
  SIM_SPEED_TUNING.minTicksPerSecond,
  SIM_SPEED_TUNING.maxTicksPerSecond,
  SIM_SPEED_TUNING.ticksPerSecondStep,
);
debug.setSimSpeed(simClock.getTicksPerSecond());
debug.onSimSpeedChange((ticksPerSecond) => {
  const normalized = simClock.setTicksPerSecond(ticksPerSecond);
  saveSimTicksPerSecond(runtimeStorage, normalized);
  debug.setSimSpeed(normalized);
});
document.addEventListener('visibilitychange', () => {
  simClock.reset(performance.now());
  lastRenderAt = Number.NEGATIVE_INFINITY;
  if (document.hidden) {
    uiAudio.stopAmbience();
  } else if (!uiAudio.isMuted() && run.getState().phase === 'arena') {
    uiAudio.startAmbience();
  }
});
window.addEventListener('pagehide', () => uiAudio.stopAmbience());
const discoveryStorage = runtimeStorage;
let discoveryProgression = createDiscoveryProgression(discoverySave);
const strainLibrary: StrainLibrary = createStrainLibrary(discoveryStorage);
let pendingGenomeDecodeIds: LifeformIdentityId[] = [];
// Allow up to PALETTE_SIZE total cell colors for evolving ecosystem spawns.
const PALETTE_SIZE = 32;

let arena: Arena | null = null;
let renderer: Renderer | null = null;
let lastRenderAt = Number.NEGATIVE_INFINITY;
let selectedTool: ToolId = 'egg';
let selectedEggArchetype: EnemyArchetype = 'swarmlet';
let currentRunLoadout = new Set<string>(['swarmlet']);
// When a discovered breed is the active lifeform, the egg hatches that breed.
let selectedBreedId: BreedId | null = null;
let displayedFps = 0;
let framesSinceTick = 0;
let lastFpsTick = performance.now();
let tickCount = 0;
let tickerState = createTickerState();
let didAnnounceCompletion = false;
let didAnnounceEquilibrium = false;
// Idle-nudge bookkeeping: last tick the player acted, and how many nudges this
// epoch (capped so the assistant never nags).
let lastActionTick = 0;
let nudgeCountThisEpoch = 0;
let heardDishEventIds = new Set<number>();
let lastOpeningBloomCreated = false;
let onboardingDishGuidePos: [number, number] = [LX * 0.58, LY * 0.52];
let onboardingDishGuideTracksLastEgg = false;
let discoveredBreedsThisRun = new Set<string>();
let stabilizedBreedsThisRun = new Set<string>();
let lastArenaEvidenceSignature = '';
let peakBiodiversity = 0;
let longestStabilityStreak = 0;
let runTelemetry: RunTelemetry = createRunTelemetry({
  startedAtMs: performance.now(),
  runNumber: strainLibrary.getRunCount() + 1,
});
let newStrainsBankedThisRun: string[] = [];
let notebookEntryCountAtRunStart = notebookViewForProgression(discoveryProgression).discoveredCount;
let finalLabReport: LabReport | null = null;
let newBiomeThisRun = false;
let observedNotesAtDishStart = new Set<DiscoveryNoteId>();
let pendingBankPlan: PlannedResearchBank | null = null;
let pendingMethodIntroduction = false;
let abandonArmedUntilMs = 0;
let abandonConfirmationTimer = 0;

let performanceResizeFrame = 0;
function refreshVisualPerformanceProfile(): void {
  const next = performanceProfileFor(browserPerformanceSignals());
  const profileChanged = next.id !== visualProfile.id;
  visualProfile = next;
  layout.dataset.visualQuality = next.id;
  const canvasChanged = applyCanvasProfile(canvas, next);
  if ((profileChanged || canvasChanged) && arena) {
    renderer = createRenderer(canvas, PALETTE_SIZE, {
      additiveBloom: next.additiveBloom,
    });
  }
  if (profileChanged || canvasChanged) lastRenderAt = Number.NEGATIVE_INFINITY;
}

function schedulePerformanceProfileRefresh(): void {
  window.cancelAnimationFrame(performanceResizeFrame);
  performanceResizeFrame = window.requestAnimationFrame(() => {
    refreshVisualPerformanceProfile();
    syncOnboardingPointer();
  });
}

window.addEventListener('resize', schedulePerformanceProfileRefresh);
window.visualViewport?.addEventListener('resize', schedulePerformanceProfileRefresh);

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

debug.onClearDiscoveries(() => {
  openDeleteDataDialog();
});
document.getElementById('delete-data-confirm')?.addEventListener('click', () => {
  try {
    runtimeStorage.clear();
  } finally {
    window.location.reload();
  }
});
debug.onRevealDiscoveries(() => {
  discoveryProgression = revealAllDiscoveryProgression(discoveryProgression);
  researchArchive = saveResearchArchive(
    discoveryStorage,
    revealAllResearchArchive(researchArchive),
  );
  for (const trial of COMMON_COLD_CASE.trials) {
    caseRecord = recordCompletedTrial(runtimeStorage, caseRecord, trial.id);
  }
  currentRunLoadout = new Set(ALL_PROGRESSION_LIFEFORMS);
  run.startLateGamePreview();
  saveRuntimeDiscoveryState();
  applyDiscoveryProgressionUi();
  refreshArenaToolUi();
  debug.updateDiscoveries(discoveryDebugInfo());
  setOptionsMenuOpen(false);
  fx.playWipe();
  fx.showToast('discovery', 'Genome Archive', 'All genomes decoded');
  showPhase();
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

screens.onOptionsOpen(() => {
  uiAudio.unlock();
  uiAudio.play('ui_tap');
  setOptionsMenuOpen(true);
});
screens.onOptionsClose(() => {
  uiAudio.play('ui_tap');
  setOptionsMenuOpen(false);
});

screens.onAudioToggle(() => {
  uiAudio.unlock();
  const nowMuted = uiAudio.toggleMuted();
  ecologyAudio.setMuted(nowMuted);
  screens.setAudioMuted(nowMuted);
  if (!nowMuted) {
    uiAudio.play('ui_select');
    if (run.getState().phase === 'arena') uiAudio.startAmbience();
  }
});
screens.setAudioMuted(uiAudio.isMuted());
ecologyAudio.setMuted(uiAudio.isMuted());
screens.onHapticsToggle(() => {
  const enabled = haptics.toggle();
  screens.setHapticsEnabled(enabled);
  if (enabled) haptics.play('impact');
});
screens.setHapticsAvailable(haptics.isSupported());
screens.setHapticsEnabled(haptics.isEnabled());

screens.onLifeformSelect((id) => {
  if (!isSeedableLifeformId(id)) return;
  clearAbandonConfirmation();
  coach.report(`lifeform:${id}`);
  // Choosing a specimen is also a semantic Egg selection. This keeps the
  // first lesson synchronized when a curious player enters through Eggs
  // instead of pressing the already-active Egg tool.
  coach.report('egg-selected');
  setEggLifeformSelection(id);
  screens.setSelectedLifeform(id);
  // Picking any lifeform arms the egg tool so the player can drop it straight
  // away. A discovered breed hatches as that breed; a base strain as its egg.
  selectedTool = 'egg';
  screens.setTool('egg');
  screens.closeMobileDrawers();
  updateButtonHint();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Tab' && overlayState.menuOpen) {
    trapOptionsFocus(event);
    return;
  }
  if (event.key === 'Tab' && overlayState.notebookOpen) {
    trapNotebookFocus(event);
    return;
  }
  if (event.key !== 'Escape') return;
  if (overlayState.presentationMode) {
    event.preventDefault();
    setPresentationMode(false);
    return;
  }
  if (overlayState.notebookOpen) {
    event.preventDefault();
    closeNotebook();
    return;
  }
  if (overlayState.menuOpen) {
    event.preventDefault();
    setOptionsMenuOpen(false);
    return;
  }
  screens.closeMobileDrawers();
});

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && overlayState.presentationMode) {
    setPresentationMode(false);
  }
});

canvas.addEventListener('animationend', () => {
  canvas.classList.remove('dish-shake', 'dish-shake-soft');
});
const juice = createJuice(canvas, LX, LY);
let pasteStrokeActive = false;
let lastPasteSoundAt = 0;
let pasteCursor: [number, number] | null = null;

// Any deliberate dish action re-arms the idle nudge and clears a visible one.
function registerPlayerAction(): void {
  lastActionTick = tickCount;
  coach.hideNudge();
  clearAbandonConfirmation();
}

function applySelectedToolAt(pos: [number, number]): boolean {
  if (!arena || run.getState().phase !== 'arena' || pendingBankPlan) return false;
  ecologyAudio.unlock();
  if (selectedTool === 'paste') {
    if (arena.applyTool('paste', pos)) {
      uiAudio.play('drop_paste');
      juice.ripple(pos, 'paste');
      screens.updateToolCharges(arena.getToolStates());
      coach.report('paste-drawn');
      screens.closeMobileDrawers();
      registerPlayerAction();
      return true;
    }
    return false;
  }
  if (arena.applyTool(selectedTool, pos, {
    eggArchetype: selectedEggArchetype,
    eggBreedId: selectedBreedId ?? undefined,
  })) {
    // Egg keeps the soft UI tap; reagents get their own bespoke drop sound.
    uiAudio.play(DROP_SOUND_FOR_TOOL[selectedTool] ?? 'ui_tap');
    juice.ripple(pos, selectedTool);
    screens.updateToolCharges(arena.getToolStates());
    // A successful placement proves that Egg was armed even if the player
    // tapped the dish before explicitly pressing the already-selected tool.
    if (selectedTool === 'egg') coach.report('egg-selected');
    coach.report(`${selectedTool}-used`);
    if (selectedTool === 'egg') {
      onboardingDishGuideTracksLastEgg = true;
      setOnboardingDishPointerTarget(arena.getLastEggCellPos() ?? pos, true);
    } else {
      // Once the first reagent lands, subsequent "same spot" instructions
      // follow that field rather than chasing a moving organism.
      onboardingDishGuideTracksLastEgg = false;
      setOnboardingDishPointerTarget(pos);
    }
    updateButtonHint();
    screens.closeMobileDrawers();
    registerPlayerAction();
    return true;
  }
  return false;
}

canvas.addEventListener('pointerdown', (event) => {
  if (!arena || run.getState().phase !== 'arena' || pendingBankPlan) return;
  const pos = canvasEventToGridPos(event);
  if (selectedTool === 'paste') {
    // Begin a drawn stroke; subsequent pointermove events lay the trail.
    pasteStrokeActive = true;
    pasteCursor = pos;
    canvas.setPointerCapture(event.pointerId);
  }
  applySelectedToolAt(pos);
});

canvas.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  if (!applySelectedToolAt([LX / 2, LY / 2])) return;
  // Keyboard Paste places one deliberate stamp rather than entering a drag
  // state that cannot be completed without a pointer.
  if (selectedTool === 'paste') arena?.endPasteStroke();
});

canvas.addEventListener('pointermove', (event) => {
  if (!pasteStrokeActive || !arena || run.getState().phase !== 'arena' || pendingBankPlan) return;
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
  if (pendingResearchBank) {
    const replay = replayPendingResearchBank(runtimeStorage);
    if (replay?.status === 'unavailable') {
      persistenceUnavailable = true;
      haptics.play('warning');
      fx.showToast('catalyst', 'Save unavailable', 'Your result is still waiting to be banked');
      return;
    }
    pendingResearchBank = loadPendingResearchBank(runtimeStorage);
    persistenceUnavailable = pendingResearchBank !== null;
    window.location.reload();
    return;
  }
  if (activeRunCheckpoint) {
    resumeRunFromCheckpoint();
    return;
  }
  if (caseIsSealed() && strainLibrary.getAvailableStrains().length > 1) {
    showLoadoutPicker();
    return;
  }
  beginRunWithCurrentLoadout();
});
screens.onMethodIntroContinue(() => {
  pendingMethodIntroduction = false;
  uiAudio.play('ui_select');
  fx.playWipe();
  showPhase();
});
screens.onEndRestart(() => {
  uiAudio.play('ui_select');
  fx.playWipe();
  pendingMethodIntroduction = false;
  discardActiveRunCheckpoint();
  run.restart();
  finalLabReport = null;
  screens.updateLabReport(null);
  currentRunLoadout = new Set(strainLibrary.getPlayableLoadout());
  showPhase();
});
screens.onToolSelect((tool) => {
  if (!currentToolUnlocks().includes(tool)) return;
  clearAbandonConfirmation();
  coach.report(`${tool}-selected`);
  uiAudio.play('ui_select');
  selectedTool = tool;
  screens.setTool(tool);
  if (tool === 'egg') screens.openMobileLifeformsDrawer();
  else screens.closeMobileDrawers();
  updateButtonHint();
});
screens.onToolboxReveal(() => {
  if (coach.isMobileToolboxLessonActive() && !screens.isToolVisibleInToolbox('water')) {
    window.requestAnimationFrame(syncOnboardingPointer);
    return;
  }
  coach.report('toolbox-scrolled');
  window.requestAnimationFrame(syncOnboardingPointer);
});
screens.onAgitate(() => {
  if (!arena || run.getState().phase !== 'arena' || pendingBankPlan) return;
  ecologyAudio.unlock();
  uiAudio.play('ui_tap');
  if (!arena.agitate()) return;
  haptics.play('impact');
  registerPlayerAction();
  screens.closeMobileDrawers();
  screens.updateAgitation(arena.getAgitationState());
  screens.addTicker('Dish agitated: lifeforms are mixing.');
  canvas.classList.remove('dish-shake');
  void canvas.offsetWidth;
  canvas.classList.add('dish-shake');
});
screens.onEndEpoch(() => {
  if (!arena || run.getState().phase !== 'arena') return;
  ecologyAudio.unlock();
  if (pendingBankPlan) {
    uiAudio.play('ui_tap');
    completeResearchBankBoundary(pendingBankPlan);
    return;
  }
  const objectiveComplete = arena.getObjectiveProgress().complete;
  const equilibriumComplete = !isOnboardingEpoch(run.getState().fightIndex)
    && arena.getEquilibrium().achieved;
  const taughtSequenceIncomplete = isOnboardingEpoch(run.getState().fightIndex)
    && coach.isActive()
    && !coach.isPresentingSuccess();
  // Trial 1 is the interaction tutorial. End cannot act as an accidental
  // escape hatch before the player has completed the taught sequence.
  if (isOnboardingEpoch(run.getState().fightIndex) && (!objectiveComplete || taughtSequenceIncomplete)) {
    uiAudio.play('ui_tap');
    haptics.play('warning');
    return;
  }
  if (!objectiveComplete && !equilibriumComplete) {
    const nowMs = performance.now();
    if (abandonArmedUntilMs <= nowMs) {
      abandonArmedUntilMs = nowMs + 4_000;
      window.clearTimeout(abandonConfirmationTimer);
      abandonConfirmationTimer = window.setTimeout(() => {
        abandonArmedUntilMs = 0;
        updateDishExitAction();
      }, 4_050);
      haptics.play('warning');
      updateDishExitAction();
      return;
    }
    abandonCurrentDish();
    return;
  }
  uiAudio.play('ui_tap');
  coach.report('end-experiment');
  // The End control is the canonical phase boundary. If the player banks the
  // dish before the success card's delayed animation arrives, retire the
  // coach immediately so it cannot cover the Method/Objective screens.
  coach.leaveArena(objectiveComplete);
  const equilibriumCanEndRun = !isOnboardingEpoch(run.getState().fightIndex);
  if (equilibriumCanEndRun && arena.getEquilibrium().achieved) {
    bankCompletedStudy('won');
    return;
  }
  const status = arena.endEpochNow();
  pendingMethodIntroduction = status === 'won';
  resolveArenaStatus(status);
});

function updateDishExitAction(): void {
  if (!arena || run.getState().phase !== 'arena') return;
  const objectiveComplete = arena.getObjectiveProgress().complete;
  const equilibriumComplete = !isOnboardingEpoch(run.getState().fightIndex)
    && arena.getEquilibrium().achieved;
  const taughtSequenceIncomplete = isOnboardingEpoch(run.getState().fightIndex)
    && coach.isActive()
    && !coach.isPresentingSuccess();
  screens.setDishExitState(dishExitState({
    complete: !taughtSequenceIncomplete && (objectiveComplete || equilibriumComplete),
    firstTrial: isOnboardingEpoch(run.getState().fightIndex),
    openLab: run.getState().fightIndex >= COMMON_COLD_CASE.trials.length,
    saveBlocked: pendingBankPlan !== null,
    armedUntilMs: abandonArmedUntilMs,
    nowMs: performance.now(),
  }));
}

function clearAbandonConfirmation(update = true): void {
  if (abandonArmedUntilMs === 0 && abandonConfirmationTimer === 0) return;
  abandonArmedUntilMs = 0;
  window.clearTimeout(abandonConfirmationTimer);
  abandonConfirmationTimer = 0;
  if (update) updateDishExitAction();
}

function abandonCurrentDish(): void {
  if (!arena) return;
  clearAbandonConfirmation(false);
  persistArenaDiscoveries(arena);
  coach.leaveArena(false);
  discardActiveRunCheckpoint();
  pendingBankPlan = null;
  pendingResearchBank = null;
  run.restart();
  arena = null;
  renderer = null;
  finalLabReport = null;
  uiAudio.stopAmbience();
  uiAudio.play('ui_select');
  fx.playWipe();
  showPhase();
}
screens.setEggOptions(EGG_ARCHETYPES.map((archetype) => ({
  archetype,
  ...ARCHETYPE_INFO[archetype],
})));
applyDiscoveryProgressionUi();
screens.onEggSelect((archetype) => {
  if (!isUnlockedEggArchetype(archetype)) return;
  clearAbandonConfirmation();
  uiAudio.play('ui_select');
  setEggLifeformSelection(archetype);
  selectedTool = 'egg';
  screens.setTool(selectedTool);
  screens.setEggArchetype(archetype);
  screens.setSelectedLifeform(archetype);
  screens.closeMobileDrawers();
  updateButtonHint();
});
screens.setTool(selectedTool);
screens.setEggArchetype(selectedEggArchetype);
screens.setSelectedLifeform(selectedEggArchetype);

showPhase();

function showPhase() {
  // Hide every overlay; show the one for the current phase.
  screens.hide('title');
  screens.hide('loadout');
  screens.hide('method-intro');
  screens.hide('pick');
  screens.hide('objective');
  screens.hide('end');
  screens.hide('notebook');
  screens.hide('hud');
  overlayState.notebookOpen = false;
  const state = run.getState();
  if (state.phase !== 'arena') {
    clearAbandonConfirmation(false);
    screens.clearStudyStartAnnouncement();
  }
  if (state.phase !== 'arena') fx.clearPhaseVisuals();
  const resumeState = state.phase === 'title' ? activeRunCheckpoint?.run : undefined;
  const resumeFightIndex = resumeState?.phase === 'upgrade_pick'
    ? resumeState.fightIndex + 1
    : resumeState?.fightIndex;
  const activeTrialIndex = Math.min(
    resumeFightIndex ?? (state.phase === 'title' ? consecutiveCompletedCaseTrialCount() : state.fightIndex),
    COMMON_COLD_CASE.trials.length - 1,
  );
  const recordedResults = COMMON_COLD_CASE.trials.map((trial) => (
    caseRecord.completedTrialIds.includes(trial.id) ? 'completed' as const : undefined
  ));
  const currentResults = state.epochResults.map((result, index) => (
    result === 'completed' || recordedResults[index] !== 'completed' ? result : 'completed'
  ));
  screens.updateCaseProgress({
    caseDef: COMMON_COLD_CASE,
    activeTrial: trialForIndex(activeTrialIndex),
    activeTrialIndex,
    completedResults: state.phase === 'title' ? recordedResults : currentResults,
    openLabUnlocked: caseIsSealed(),
    resumeAvailable: state.phase === 'title' && activeRunCheckpoint !== null,
    resumePhase: state.phase !== 'title' || !activeRunCheckpoint
      ? null
      : activeRunCheckpoint.run.phase === 'arena'
        ? 'dish-restart'
        : activeRunCheckpoint.run.phase === 'upgrade_pick'
          ? 'method-choice'
          : 'study-choice',
    saveAvailable: !persistenceUnavailable,
    pendingBank: pendingResearchBank !== null,
    archive: notebookViewForProgression(discoveryProgression).archive,
  });
  if (overlayState.presentationMode && state.phase !== 'arena') {
    setPresentationMode(false);
  }
  if (state.phase === 'title') {
    screens.updateLabReport(null);
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
      saveActiveRunCheckpoint();
      if (run.getState().phase === 'objective_pick') {
        showPhase();
      } else {
        startNewFight();
      }
    });
    screens.show(pendingMethodIntroduction ? 'method-intro' : 'pick');
  } else if (state.phase === 'objective_pick') {
    updateButtonHint();
    const choices = run.getObjectiveChoices(currentStudyCapabilityInput());
    screens.setObjectiveChoices(choices, (objective) => {
      uiAudio.play('ui_select');
      run.setChosenObjective(objective);
      saveActiveRunCheckpoint();
      startNewFight();
    });
    screens.show('objective');
  } else if (state.phase === 'run_end') {
    updateButtonHint();
    screens.updateLabReport(labReportForRunEnd());
    screens.updateEnd({
      outcome: state.outcome ?? 'lost',
      fightReached: state.fightIndex + 1,
      totalFights: COMMON_COLD_CASE.trials.length,
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

function showPhaseAfterGenomeReveals(): void {
  if (run.getState().phase === 'arena' || pendingGenomeDecodeIds.length === 0) {
    showPhase();
    return;
  }
  const queued = [...pendingGenomeDecodeIds];
  pendingGenomeDecodeIds = [];
  const genomes = queued.map((id) => genomeArtFor(id));
  screens.closeMobileDrawers();
  // The reveal delays the normal phase screen, so clear any pointer left by
  // the final onboarding instruction before the translucent overlay appears.
  syncOnboardingPointer();
  playGenomeDecodeSounds(genomes);
  fx.showGenomeDecode(
    genomes.map(genomeRevealInfo),
    finishGenomeReveal,
  );
}

function playGenomeDecodeSounds(genomes: readonly GenomeArtIdentity[]): void {
  const events = unique(genomes.flatMap((genome): SoundEventId[] => {
    const identity = LIFEFORM_SOUND_IDENTITIES[genome.soundId];
    return identity ? [identity.eventId] : [];
  }));
  if (events.length === 0) return;
  ecologyAudio.update({ eating: 0, fighting: 0, reactions: 0, mutations: 0, hatches: 0, events });
}

function finishGenomeReveal(): void {
  saveActiveRunCheckpoint();
  showPhase();
  window.requestAnimationFrame(() => {
    const selector = run.getState().phase === 'upgrade_pick'
      ? '.pick-card'
      : run.getState().phase === 'objective_pick'
        ? '.objective-card'
        : run.getState().phase === 'run_end'
          ? '#end-restart'
          : null;
    if (!selector) return;
    document.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  });
}

function genomeRevealInfo(genome: GenomeArtIdentity) {
  const archive = notebookViewForProgression(discoveryProgression).archive;
  return {
    id: genome.id,
    name: genome.name,
    asset: genome.asset,
    alt: genome.alt,
    primary: genome.primary,
    archivePosition: `${archive.decodedGenomes} / ${archive.totalGenomes} GENOMES DECODED`,
  };
}

function showLoadoutPicker(): void {
  screens.setLoadoutScreen(renderLoadoutScreen(
    strainLibrary,
    (loadout) => {
      uiAudio.play('ui_select');
      fx.playWipe();
      beginRunWithCurrentLoadout(loadout);
    },
    { labelForStrain, descriptionForStrain, colorForStrain, artForStrain },
  ));
  screens.hide('title');
  screens.show('loadout');
}

function beginRunWithCurrentLoadout(loadout = strainLibrary.getPlayableLoadout()): void {
  pendingMethodIntroduction = false;
  const playableLoadout = playableLifeformIds(loadout);
  currentRunLoadout = new Set(playableLoadout);
  setEggLifeformSelection(playableLoadout[0] ?? 'swarmlet');
  resetRunTelemetry();
  if (caseIsSealed()) {
    run.startLateGamePreview();
    saveActiveRunCheckpoint();
    showPhaseAfterGenomeReveals();
  } else {
    const completedTrialCount = consecutiveCompletedCaseTrialCount();
    if (completedTrialCount > 0) {
      run.restore({
        phase: 'arena',
        fightIndex: completedTrialCount,
        upgrades: [],
        outcome: null,
        pendingPickChoices: [],
        seed: run.getState().seed,
        epochResults: Array.from({ length: completedTrialCount }, () => 'completed' as const),
      });
    } else {
      run.start();
    }
    startNewFight();
  }
}

function resumeRunFromCheckpoint(): void {
  const checkpoint = activeRunCheckpoint;
  if (!checkpoint) return;
  run.restore(checkpoint.run);
  const playableLoadout = playableLifeformIds(checkpoint.loadout);
  currentRunLoadout = new Set(playableLoadout);
  setEggLifeformSelection(playableLoadout[0] ?? 'swarmlet');
  pendingGenomeDecodeIds = checkpoint.pendingGenomeDecodeIds.filter(isProgressionLifeformId);
  resetRunTelemetry();
  stabilizedBreedsThisRun = new Set(checkpoint.runStabilizedBreedIds);
  const restoredState = run.getState();
  if (
    restoredState.phase === 'arena'
    && restoredState.chosenObjective
    && !isObjectiveFeasible(restoredState.chosenObjective, {
      ...currentStudyCapabilityInput(),
      epochIndex: restoredState.fightIndex,
      seed: restoredState.seed + restoredState.fightIndex,
    })
  ) {
    run.restore({
      ...restoredState,
      phase: 'objective_pick',
      chosenObjective: undefined,
    });
    saveActiveRunCheckpoint();
    fx.showToast('catalyst', 'Study refreshed', 'The saved Method could not reproduce that Study');
    showPhase();
    return;
  }
  if (run.getState().phase === 'arena') startNewFight();
  else showPhaseAfterGenomeReveals();
}

function saveActiveRunCheckpoint(): void {
  const state = run.getState();
  if (state.phase !== 'arena' && state.phase !== 'upgrade_pick' && state.phase !== 'objective_pick') return;
  const saved = saveRunCheckpoint(runtimeStorage, {
    run: state,
    loadout: [...currentRunLoadout],
    pendingGenomeDecodeIds,
    runStabilizedBreedIds: [...stabilizedBreedsThisRun].filter(isBreedId),
  });
  if (saved) {
    activeRunCheckpoint = saved;
  } else {
    persistenceUnavailable = true;
  }
}

function discardActiveRunCheckpoint(): void {
  const cleared = clearRunCheckpointVerified(runtimeStorage);
  // Honour the user's in-session discard even when this browser cannot make
  // the removal durable. The save status warns that a reload may recover it.
  activeRunCheckpoint = null;
  if (cleared.status !== 'saved') {
    persistenceUnavailable = true;
  }
}

function consecutiveCompletedCaseTrialCount(): number {
  let completed = 0;
  for (const trial of COMMON_COLD_CASE.trials) {
    if (!caseRecord.completedTrialIds.includes(trial.id)) break;
    completed += 1;
  }
  return completed;
}

function caseIsSealed(): boolean {
  return COMMON_COLD_CASE.trials.every((trial) => caseRecord.completedTrialIds.includes(trial.id));
}

function playableLifeformIds(loadout: readonly string[]): ProgressionLifeformId[] {
  const ids = unique(loadout).filter(isProgressionLifeformId);
  return ids.length > 0 ? ids : ['swarmlet'];
}

function setEggLifeformSelection(id: ProgressionLifeformId): void {
  overlayState.selectedLifeformId = id;
  if (isBreedId(id)) {
    selectedBreedId = id;
    selectedEggArchetype = BREED_DEFS[id].baseArchetype;
  } else {
    selectedBreedId = null;
    selectedEggArchetype = id;
  }
}

function resetRunTelemetry(): void {
  discoveredBreedsThisRun = new Set();
  stabilizedBreedsThisRun = new Set();
  peakBiodiversity = 0;
  longestStabilityStreak = 0;
  newStrainsBankedThisRun = [];
  finalLabReport = null;
  newBiomeThisRun = false;
  notebookEntryCountAtRunStart = notebookViewForProgression(discoveryProgression).discoveredCount;
  runTelemetry = createRunTelemetry({
    startedAtMs: performance.now(),
    runNumber: strainLibrary.getRunCount() + 1,
  });
  screens.updateLabReport(null);
}

function labReportForRunEnd(): LabReport {
  if (finalLabReport) return finalLabReport;

  const state = run.getState();
  const notebookView = notebookViewForProgression(discoveryProgression);
  const finalBreedCounts = finalBreedCountsFor(arena);
  const finalBreedVolumes = finalBreedVolumesFor(arena);
  finalLabReport = assembleLabReport(createRunEndReportInput({
    telemetry: runTelemetry,
    endedAtMs: performance.now(),
    outcome: state.outcome ?? 'lost',
    fightIndex: state.fightIndex,
    epochResults: state.epochResults,
    newBiome: newBiomeThisRun,
    finalBreedCounts,
    finalBreedVolumes,
    peakBiodiversity,
    longestStabilityStreak,
    newStrainsBanked: newStrainsBankedThisRun,
    totalStrainsDiscovered: strainLibrary.getAvailableStrains().length,
    totalStrainsAvailable: totalStrainsAvailableForReport(),
    notebookDiscoveredCount: notebookView.discoveredCount,
    notebookTotalCount: notebookView.totalCount,
    notebookEntryCountAtRunStart,
    equilibriumBiomeName: arena?.getEquilibrium().biomeName,
  }));
  return finalLabReport;
}

function totalStrainsAvailableForReport(): number {
  return unique([
    ...EGG_ARCHETYPES,
    ...Object.keys(BREED_DEFS),
  ]).length;
}

function startNewFight() {
  screens.clearStudyStartAnnouncement();
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
    knownBreedIds: new Set(discoveryProgression.discoveredBreedIds),
  });
  renderer = createRenderer(canvas, PALETTE_SIZE, {
    additiveBloom: visualProfile.additiveBloom,
  });
  lastRenderAt = Number.NEGATIVE_INFINITY;
  tickCount = 0;
  tickerState = createTickerState();
  cellFxTracker = createCellFxTracker();
  heardDishEventIds = new Set<number>();
  lastArenaEvidenceSignature = '';
  observedNotesAtDishStart = new Set(
    discoveryProgression.noteDiscoveryRecords
      .filter((record) => record.stage === 'observed')
      .map((record) => record.id),
  );
  didAnnounceCompletion = false;
  didAnnounceEquilibrium = false;
  lastOpeningBloomCreated = false;
  onboardingDishGuidePos = [LX * 0.58, LY * 0.52];
  onboardingDishGuideTracksLastEgg = false;
  lastActionTick = 0;
  nudgeCountThisEpoch = 0;
  applyDiscoveryProgressionUi();
  clearAbandonConfirmation();
  updateDishExitAction();
  screens.clearTicker();
  const objective = run.getObjective();
  screens.addTicker(`Dr. E: ${objective.name}. ${objective.hint ?? objective.description}`);
  if (!uiAudio.isMuted()) uiAudio.startAmbience();
  uiAudio.play('epoch_begin');
  haptics.play('impact');
  const openLabStudy = runState.fightIndex >= COMMON_COLD_CASE.trials.length;
  const authoredTrial = COMMON_COLD_CASE.trials[runState.fightIndex];
  const introduction = studyIntroductionRoute({
    guidanceTier: authoredTrial?.guidanceTier ?? 'hypothesis',
    openLab: openLabStudy,
    compactViewport: window.matchMedia('(max-width: 899px)').matches,
  });
  const directorIntroduction = introduction.owner === 'director'
    ? {
        key: `${runState.seed}:${runState.fightIndex}:${objective.name}`,
        kind: introduction.kind,
        message: `Dr. E. New ${introduction.kind === 'study' ? 'Study' : 'Trial'}: ${objective.name}. ${objective.description}`,
      }
    : null;
  const deferDirectorForMobileToolboxLesson = directorIntroduction !== null
    && authoredTrial?.number === 3
    && window.matchMedia('(max-width: 899px)').matches
    && !coach.hasSeenMobileToolboxLesson();
  if (directorIntroduction && !deferDirectorForMobileToolboxLesson) {
    screens.announceStudyStart(directorIntroduction);
  }
  if (introduction.showCentralBanner) {
    fx.showEpochBanner(
      `Case 01 · Trial ${runState.fightIndex + 1}`,
      objective.name,
      objective.description,
    );
  }
  // The lesson is marked complete only after the player uses the newly taught
  // End control. Stabilization is committed by the verified bank boundary.
  coach.onOnboardingComplete = () => {};
  coach.beginTrial(runState.fightIndex);
  saveActiveRunCheckpoint();
  screens.updateToolCharges(arena.getToolStates());
  screens.updateAgitation(arena.getAgitationState());
  updateButtonHint();
  debug.updateDiscoveries(discoveryDebugInfo());
  simClock.reset(performance.now());
  // Update debug panel swatches to match the renderer's palette.
  debug.setSwatch(1, swatchForCellId(1, PALETTE_SIZE));
  for (let i = 0; i < enemies.length; i++) {
    debug.setSwatch(2 + i, swatchForArchetype(enemies[i]!.archetype));
  }
  showPhase();
  focusStudyStart(
    authoredTrial,
    deferDirectorForMobileToolboxLesson && directorIntroduction
      ? () => screens.announceStudyStart(directorIntroduction)
      : undefined,
  );
  loop();
}

function focusStudyStart(
  authoredTrial: (typeof COMMON_COLD_CASE.trials)[number] | undefined,
  announceDeferredDirector?: () => void,
): void {
  // `screens.show('hud')` restores a safe canvas baseline. This later callback
  // refines it for exact guided Trials, after the outgoing Method/Study card
  // has disappeared and the coach has rendered its first actionable step.
  window.requestAnimationFrame(() => {
    const compactViewport = window.matchMedia('(max-width: 899px)').matches;
    if (
      authoredTrial?.number === 3
      && compactViewport
      && !coach.hasSeenMobileToolboxLesson()
      && screens.prepareToolboxRevealLesson('water')
    ) {
      const started = coach.beginMobileToolboxLesson(() => {
        announceDeferredDirector?.();
        document.querySelector<HTMLElement>('[data-tool="water"]')?.focus({ preventScroll: true });
        syncOnboardingPointer();
      });
      if (started) {
        syncOnboardingPointer();
        document.getElementById('toolbox-more')?.focus({ preventScroll: true });
        return;
      }
    }
    announceDeferredDirector?.();
    if (!authoredTrial || authoredTrial.guidanceTier === 'hypothesis') {
      canvas.focus({ preventScroll: true });
      return;
    }

    const coachContinue = document.getElementById('coach-skip') as HTMLButtonElement | null;
    if (authoredTrial.number === 1 && coach.isActive() && coachContinue && !coachContinue.hidden) {
      coachContinue.focus({ preventScroll: true });
      return;
    }

    const exactControl = authoredTrial.number === 2 && compactViewport
      ? document.getElementById('mobile-lifeforms-toggle')
      : authoredTrial.number === 2
        ? document.querySelector<HTMLElement>('[data-lifeform-id="bloom_mass"]')
        : document.querySelector<HTMLElement>('[data-tool="egg"]');
    (exactControl ?? canvas).focus({ preventScroll: true });
  });
}

function blockingOverlayOpen(): boolean {
  if (overlayState.menuOpen || overlayState.notebookOpen) return true;
  if (!window.matchMedia('(max-width: 899px)').matches) return false;
  return layout.dataset.mobileDrawer === 'lifeforms' || layout.dataset.mobileDrawer === 'log';
}

function setCulturePaused(paused: boolean): void {
  layout.classList.toggle('simulation-paused', paused);
  document.getElementById('simulation-paused-badge')?.setAttribute('aria-hidden', String(!paused));
}

function loop() {
  if (!arena || !renderer) return;
  const phase = run.getState().phase;
  if (phase !== 'arena') {
    setCulturePaused(false);
    return;            // stop the loop on any non-arena phase
  }

  const now = performance.now();
  if (pendingBankPlan) {
    // The journal plan is a frozen snapshot. Preserve that exact result while
    // storage is unavailable so Retry cannot overwrite later dish activity.
    simClock.reset(now);
    if (shouldRenderFrame(lastRenderAt, now, visualProfile.targetRenderFps)) {
      renderer.render(arena.state, arena.archetypes, arena.getDishEvents());
      renderToolEffects(arena);
      juice.draw();
      lastRenderAt = now;
    }
    updateDishExitAction();
    scheduleLoop();
    return;
  }
  if (document.hidden) {
    // Browsers normally suspend rAF in the background, but explicitly reset
    // the clock so returning to the tab can never replay hidden wall time.
    simClock.reset(now);
    scheduleLoop();
    return;
  }
  const culturePaused = blockingOverlayOpen();
  setCulturePaused(culturePaused);
  if (culturePaused) {
    // Reset on every paused frame so closing Options never replays accumulated
    // wall-clock time as a burst of simulation ticks.
    simClock.reset(now);
    debug.update(arena.state, {
      fps: displayedFps,
      tick: tickCount,
      status: 'paused',
    });
    scheduleLoop();
    return;
  }
  // The opening Doctor entrance is a reading beat, not free simulation time.
  // It slides away on its own, leaving the live dish ready for the first egg,
  // but the ecosystem does not advance until the player has acted.
  const holdingForFirstInstruction = coach.isActive() && coach.getBeatIndex() === 0;
  if (holdingForFirstInstruction) simClock.reset(now);
  const ticksToRun = holdingForFirstInstruction ? 0 : simClock.consumeTicks(now);
  const player = arena.state.cells.get(PLAYER_ID);

  for (let i = 0; i < ticksToRun; i++) {
    arena.tick({
      moveVec: [0, 0],
      shouldFire: false,
      shouldEngulf: false,
    });
    tickCount++;
  }
  if (ticksToRun > 0) ecologyAudio.update(readAudioFrame(arena));

  updateJuiceEvents(arena);
  if (shouldRenderFrame(lastRenderAt, now, visualProfile.targetRenderFps)) {
    renderer.render(arena.state, arena.archetypes, arena.getDishEvents());
    renderToolEffects(arena);
    juice.draw();
    lastRenderAt = now;
    framesSinceTick++;
  }
  if (now - lastFpsTick > 1000) {
    displayedFps = framesSinceTick;
    framesSinceTick = 0;
    lastFpsTick = now;
  }

  // After the one required feed, seed a helper swarmlet so the promised Bloom
  // success is guaranteed even if the player's first colony died early.
  if (coach.shouldAutoSpawn()) {
    arena.spawnOnboardingSeed();
  }

  const currentOpeningBloomCreated = openingBloomCreatedInCurrentDish();
  if (currentOpeningBloomCreated !== lastOpeningBloomCreated) {
    lastOpeningBloomCreated = currentOpeningBloomCreated;
    if (currentOpeningBloomCreated) {
      advanceDiscoveryProgression(arena.getEcology().discoveries, { breed: 'observed', note: 'observed' });
      coach.report('bloom-discovered');
    }
    applyDiscoveryProgressionUi();
    refreshArenaToolUi();
    updateButtonHint();
  }

  const ecology = arena.getEcology();
  const equilibrium = arena.getEquilibrium();
  const equilibriumCanEndRun = !isOnboardingEpoch(run.getState().fightIndex);
  screens.setEquilibrium(equilibrium);
  sampleRunTelemetryFromArena(arena);

  // HUD update.
  const runState = run.getState();
  const objective = arena.getObjectiveProgress();
  screens.updateHud({
    fightIndex: runState.fightIndex,
    totalFights: runState.fightIndex < COMMON_COLD_CASE.trials.length
      ? COMMON_COLD_CASE.trials.length
      : 0,
    caseTrialCount: COMMON_COLD_CASE.trials.length,
    vol: player?.vol ?? 0,
    targetVol: player?.targetVol ?? 0,
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
    objectiveTimed: objective.def.timed === true,
    upgrades: runState.upgrades.map((u) => {
      const def = getUpgradeDef(u.id);
      if (!def) return u.id;
      return u.stacks > 1 ? `${def.name} x${u.stacks}` : def.name;
    }),
  });
  if (objective.complete || (equilibriumCanEndRun && equilibrium.achieved)) clearAbandonConfirmation(false);
  updateDishExitAction();
  // Tool state (charges + cooldown wipes) refreshes every frame regardless of
  // the control sample — the onboarding dish has no player cell.
  screens.updateToolCharges(arena.getToolStates());
  screens.updateAgitation(arena.getAgitationState());
  updateButtonHint();
  announceEpochCompletion(objective.complete, objective.def.name);
  announceEquilibrium(equilibrium);
  maybeNudgeIdlePlayer(objective.complete, objective.def.hint);
  updateTicker(arena);
  persistArenaDiscoveries(arena);

  // Debug panel.
  debug.update(arena.state, {
    fps: displayedFps,
    tick: tickCount,
    status: arena.getStatus(),
  });
  debug.updateDiscoveries(discoveryDebugInfo());

  // Ecosystem collapse check: if all cells dead past onboarding, end run.
  if (!isOnboardingEpoch(run.getState().fightIndex) && arena.isEcosystemCollapsed() && tickCount > 120) {
    bankCompletedStudy('lost', false);
    return;
  }

  // Status check: did this tick end the fight?
  const arenaStatus = arena.getStatus();
  if (arenaStatus === 'won' && coach.isPresentingSuccess()) {
    scheduleLoop();
    return;
  }
  if (resolveArenaStatus(arenaStatus)) return;

  scheduleLoop();
}

function bankCompletedStudy(
  terminalOutcome?: 'won' | 'lost',
  completedStudy = true,
): boolean {
  if (!arena) return false;
  persistArenaDiscoveries(arena);
  sampleRunTelemetryFromArena(arena);
  const discoveries = arena.getEcology().discoveries;
  const runState = run.getState();
  const completedTrial = completedStudy ? COMMON_COLD_CASE.trials[runState.fightIndex] : undefined;
  const createdAt = new Date().toISOString();
  const plan = planResearchBank({
    id: `study-${runState.seed}-${runState.fightIndex}-${runState.epochResults.length}-${terminalOutcome ?? 'continue'}`,
    createdAt,
    run: runState,
    objective: arena.getObjectiveProgress().def,
    discovery: discoveryProgression,
    strainState: strainLibrary.getState(),
    caseRecord,
    archive: researchArchive,
    discoveredNoteIds: discoveries.noteIds,
    livingBreedIds: completedStudy
      ? livingDiscoveredBreedIds(arena, discoveries.breedIds)
      : [],
    loadout: [...currentRunLoadout],
    pendingGenomeDecodeIds,
    runStabilizedBreedIds: [...stabilizedBreedsThisRun].filter(isBreedId),
    caseTrialId: completedTrial?.id,
    allCaseTrialIds: COMMON_COLD_CASE.trials.map((trial) => trial.id),
    researchEvidence: {
      reactions: arena.getEcology().reactions,
      peakBiodiversity,
      stabilitySeconds: Math.round(longestStabilityStreak / 60),
      biomeName: terminalOutcome === 'won' ? arena.getEquilibrium().biomeName : undefined,
    },
    completedStudy,
    terminalOutcome,
  });
  pendingBankPlan = plan;
  return completeResearchBankBoundary(plan);
}

function completeResearchBankBoundary(plan: PlannedResearchBank): boolean {
  const result = executeResearchBank(runtimeStorage, plan.commit);
  pendingResearchBank = loadPendingResearchBank(runtimeStorage);
  if (result.status === 'unavailable') {
    persistenceUnavailable = true;
    haptics.play('warning');
    updateDishExitAction();
    screens.addTicker('Dr. E: Save unavailable. The dish is preserved — press Retry save.', 'caution');
    fx.showToast('catalyst', 'Save unavailable', 'Dish preserved · retry when ready');
    return false;
  }

  const previousProgression = discoveryProgression;
  const previousAvailability = currentUnlockAvailability();
  const previousStrains = new Set(strainLibrary.getAvailableStrains());
  discoverySave = result.commit.discovery;
  discoveryProgression = plan.progression;
  strainLibrary.replaceState(result.commit.strains);
  caseRecord = result.commit.caseRecord;
  researchArchive = result.commit.archive;
  activeRunCheckpoint = result.commit.checkpoint;
  pendingGenomeDecodeIds = result.commit.checkpoint
    ? result.commit.checkpoint.pendingGenomeDecodeIds.filter(isProgressionLifeformId)
    : unique([
      ...pendingGenomeDecodeIds,
      ...plan.newGenomeDecodeIds.filter(isProgressionLifeformId),
    ]);
  if (result.commit.checkpoint) {
    stabilizedBreedsThisRun = new Set(result.commit.checkpoint.runStabilizedBreedIds);
  }
  newStrainsBankedThisRun = unique([
    ...newStrainsBankedThisRun,
    ...result.commit.strains.availableStrains.filter((id) => !previousStrains.has(id)),
  ]);
  recordNewlyDiscoveredBreeds(previousProgression, discoveryProgression);
  recordNewlyStabilizedBreeds(previousProgression, discoveryProgression);
  run.restore(plan.runAfter);
  if (result.commit.checkpoint) runTelemetry.recordEpochCompleted();
  else if (run.getState().outcome === 'won') runTelemetry.recordEpochCompleted();
  else runTelemetry.recordEpochLapsed();
  newBiomeThisRun ||= plan.newBiome;
  persistenceUnavailable = false;
  pendingResearchBank = null;
  pendingBankPlan = null;

  applyDiscoveryProgressionUi();
  announceDiscoveryProgressionChange(previousProgression, discoveryProgression);
  announceUnlocks(previousAvailability, currentUnlockAvailability());
  for (const sealId of plan.newSealIds) {
    const seal = researchSealById(sealId);
    fx.showToast('discovery', 'Research Seal', seal.title);
    screens.addTicker(`Dr. E: Research seal stamped — ${seal.title}.`, 'discovery');
  }
  debug.updateDiscoveries(discoveryDebugInfo());
  refreshNotebook();

  const succeeded = run.getState().outcome !== 'lost';
  uiAudio.play(succeeded ? 'epoch_win' : 'epoch_fail');
  haptics.play(succeeded ? 'success' : 'failure');
  fx.playWipe();
  if (run.getState().phase === 'run_end') uiAudio.stopAmbience();
  showPhaseAfterGenomeReveals();
  return true;
}

function resolveArenaStatus(status: ArenaStatus): boolean {
  if (status === 'won') {
    bankCompletedStudy();
    return true;
  }
  if (status === 'lost') {
    // Playful-discovery model: a missed objective doesn't end the run — the
    // player moves on to the next epoch (still gets an upgrade pick). Only the
    // final epoch closes the run.
    if (arena) {
      persistArenaDiscoveries(arena);
      sampleRunTelemetryFromArena(arena);
      syncResearchArchive();
    }
    uiAudio.play('epoch_fail');
    haptics.play('warning');
    fx.playWipe();
    fx.showToast('catalyst', 'Objective Lapsed', 'Moving to the next ecosystem');
    runTelemetry.recordEpochLapsed();
    run.skipEpoch();
    saveActiveRunCheckpoint();
    if (run.getState().phase === 'run_end') uiAudio.stopAmbience();
    showPhaseAfterGenomeReveals();
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

function loadSimTicksPerSecond(storage: Storage): number {
  return normalizeSimTicksPerSecond(storage.getItem(SIM_SPEED_TUNING.storageKey));
}

function saveSimTicksPerSecond(storage: Storage, ticksPerSecond: number): void {
  storage.setItem(SIM_SPEED_TUNING.storageKey, String(ticksPerSecond));
}

function persistArenaDiscoveries(ar: Arena, completed = false): void {
  const discoveries = ar.getEcology().discoveries;
  const evidenceSignature = `${discoveries.breedIds.join('|')}::${discoveries.noteIds.join('|')}`;
  if (!completed && evidenceSignature === lastArenaEvidenceSignature) return;
  lastArenaEvidenceSignature = evidenceSignature;
  advanceDiscoveryProgression(discoveries, { breed: 'observed', note: 'observed' });

  // Repeating evidence in a later dish is itself the proof that promotes an
  // observation into an understood protocol. This must not depend on also
  // completing the currently assigned (and possibly unrelated) Study.
  const repeatedRecipeNotes = discoveries.noteIds.filter((noteId) => (
    noteId.startsWith('recipe_') && observedNotesAtDishStart.has(noteId)
  ));
  if (repeatedRecipeNotes.length > 0) {
    advanceDiscoveryProgression({ noteIds: repeatedRecipeNotes }, { note: 'understood' });
  }

  if (!completed) return;

  const objective = ar.getObjectiveProgress().def;
  if (objective.recipeId) {
    const noteId = `recipe_${objective.recipeId}` as DiscoveryNoteId;
    if (discoveries.noteIds.includes(noteId)) {
      advanceDiscoveryProgression({ noteIds: [noteId] }, { note: 'understood' });
    }
  }

  const livingBreedIds = livingDiscoveredBreedIds(ar, discoveries.breedIds);
  if (livingBreedIds.length > 0) {
    advanceDiscoveryProgression({ breedIds: livingBreedIds }, { breed: 'stabilized' });
  }
}

function advanceDiscoveryProgression(
  delta: DiscoveryDelta,
  stages: DiscoveryStageDelta = {},
): boolean {
  const previousProgression = discoveryProgression;
  const previousTools = previousProgression.unlockedTools;
  const previousLifeforms = previousProgression.unlockedLifeforms;
  const previousAvailability = currentUnlockAvailability();
  const nextProgression = updateDiscoveryProgression(previousProgression, delta, new Date().toISOString(), stages);
  const changed = previousTools.join('|') !== nextProgression.unlockedTools.join('|')
    || previousLifeforms.join('|') !== nextProgression.unlockedLifeforms.join('|')
    || previousProgression.discoveredBreedIds.join('|') !== nextProgression.discoveredBreedIds.join('|')
    || previousProgression.discoveredNoteIds.join('|') !== nextProgression.discoveredNoteIds.join('|')
    || progressionStageSignature(previousProgression) !== progressionStageSignature(nextProgression);
  if (!changed) return false;

  pendingGenomeDecodeIds = appendUniqueGenomeDecodes(
    pendingGenomeDecodeIds,
    genomeDecodeEventsForProgressionChange(previousProgression, nextProgression),
  );

  discoveryProgression = nextProgression;
  recordNewlyDiscoveredBreeds(previousProgression, nextProgression);
  recordNewlyStabilizedBreeds(previousProgression, nextProgression);
  applyDiscoveryProgressionUi();
  announceDiscoveryProgressionChange(previousProgression, nextProgression);
  announceUnlocks(previousAvailability, currentUnlockAvailability());
  saveRuntimeDiscoveryState();
  syncResearchArchive();
  debug.updateDiscoveries(discoveryDebugInfo());
  return true;
}

function syncResearchArchive(biomeName?: string | null): void {
  const stabilizedBreedRecords = discoveryProgression.breedDiscoveryRecords.filter(
    (record) => record.stage === 'stabilized',
  );
  const understoodRecipes = discoveryProgression.noteDiscoveryRecords.filter((record) => (
    record.id.startsWith('recipe_') && record.stage !== 'observed'
  ));
  const result = recordResearchEvidence(researchArchive, {
    caseComplete: caseIsSealed(),
    stabilizedBreedCount: stabilizedBreedRecords.length,
    understoodRecipeCount: understoodRecipes.length,
    stabilizedHybridCount: stabilizedBreedRecords.filter((record) => Boolean(BREED_DEFS[record.id].parents)).length,
    reactions: arena?.getEcology().reactions ?? 0,
    peakBiodiversity,
    stabilitySeconds: Math.round(longestStabilityStreak / 60),
    biomeName,
  });
  const archiveSave = saveResearchArchiveVerified(discoveryStorage, result.state);
  if (archiveSave.status !== 'saved') {
    persistenceUnavailable = true;
    return;
  }
  researchArchive = archiveSave.value;
  if (result.newBiome) {
    newBiomeThisRun = true;
    strainLibrary.incrementBiomeCount();
    strainLibrary.save();
  }
  for (const sealId of result.newSealIds) {
    const seal = researchSealById(sealId);
    fx.showToast('discovery', 'Research Seal', seal.title);
    screens.addTicker(`Dr. E: Research seal stamped — ${seal.title}.`, 'discovery');
  }
  if (result.newSealIds.length > 0 || result.newBiome) refreshNotebook();
}

function progressionStageSignature(
  progression: Pick<DiscoveryProgressionState, 'breedDiscoveryRecords' | 'noteDiscoveryRecords'>,
): string {
  return [
    ...progression.breedDiscoveryRecords.map((record) => `${record.id}:${record.stage}`),
    ...progression.noteDiscoveryRecords.map((record) => `${record.id}:${record.stage}`),
  ].join('|');
}

function recordNewlyStabilizedBreeds(
  previous: Pick<DiscoveryProgressionState, 'breedDiscoveryRecords'>,
  next: Pick<DiscoveryProgressionState, 'breedDiscoveryRecords'>,
): void {
  const previousStages = new Map(previous.breedDiscoveryRecords.map((record) => [record.id, record.stage]));
  for (const record of next.breedDiscoveryRecords) {
    if (record.stage !== 'stabilized' || previousStages.get(record.id) === 'stabilized') continue;
    stabilizedBreedsThisRun.add(record.id);
  }
}

function livingDiscoveredBreedIds(ar: Arena, discovered: readonly BreedId[]): BreedId[] {
  const discoveredSet = new Set<BreedId>(discovered);
  const living = new Set<BreedId>();
  for (const [cellId, cell] of ar.state.cells) {
    if (cell.vol <= 0) continue;
    const breedId = ar.archetypes.get(cellId)?.breedId;
    if (breedId && discoveredSet.has(breedId)) living.add(breedId);
  }
  return [...living];
}

function recordNewlyDiscoveredBreeds(
  previous: Pick<DiscoveryProgressionState, 'discoveredBreedIds'>,
  next: Pick<DiscoveryProgressionState, 'discoveredBreedIds'>,
): void {
  const previousBreedIds = new Set(previous.discoveredBreedIds);
  for (const breedId of next.discoveredBreedIds) {
    if (previousBreedIds.has(breedId)) continue;
    discoveredBreedsThisRun.add(breedId);
    const def = BREED_DEFS[breedId];
    runTelemetry.recordDiscovery(breedId, Boolean(def?.parents));
  }
}

function sampleRunTelemetryFromArena(ar: Arena): void {
  const ecology = ar.getEcology();
  runTelemetry.recordReactionCount(ecology.reactions);

  const livingBreeds = new Set<string>();
  for (const [cellId, cell] of ar.state.cells) {
    if (cell.vol <= 0) continue;
    const spawn = ar.archetypes.get(cellId);
    if (spawn) livingBreeds.add(spawn.breedId ?? spawn.archetype);
  }
  if (livingBreeds.size > peakBiodiversity) peakBiodiversity = livingBreeds.size;
  runTelemetry.recordPeakBiodiversity(livingBreeds.size);
  longestStabilityStreak = Math.max(
    longestStabilityStreak,
    Math.round(ar.getHomeostasisProgress() * HOMEOSTASIS_SUSTAIN_TICKS),
  );
}

function discoveryDebugInfo(): {
  discoveredCount: number;
  discoveredCatalysts: string[];
  discoveredLifeforms: string[];
  revealAll: boolean;
} {
  return {
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
  const result = saveDiscoveryStateVerified(discoveryStorage, {
    ...discoverySave,
    discoveredBreedIds: discoveryProgression.discoveredBreedIds,
    discoveredNoteIds: discoveryProgression.discoveredNoteIds,
    breedDiscoveryRecords: discoveryProgression.breedDiscoveryRecords,
    noteDiscoveryRecords: discoveryProgression.noteDiscoveryRecords,
    revealAll: discoveryProgression.revealAll,
  });
  if (result.status === 'saved') {
    discoverySave = result.value;
  }
  saveActiveRunCheckpoint();
  if (result.status !== 'saved') persistenceUnavailable = true;
}

function applyDiscoveryProgressionUi(): void {
  const unlockedCapabilities = currentCapabilityUnlocks();
  const unlockedTools = unlockedCapabilities.filter((tool): tool is ToolId => tool !== 'agitate');
  const unlockedLifeforms = currentLifeformUnlocks();
  screens.setToolUnlocks(unlockedTools);
  // The first Case introduces Agitate only when the reaction Trial needs it.
  screens.setAgitateUnlocked(unlockedCapabilities.includes('agitate'));
  screens.setLifeformUnlocks(unlockedLifeforms);
  refreshNotebook();

  if (!unlockedTools.includes(selectedTool)) {
    selectedTool = 'egg';
  }

  const selectedLifeformId = overlayState.selectedLifeformId;
  if (!selectedLifeformId || !isSeedableLifeformId(selectedLifeformId)) {
    setEggLifeformSelection(unlockedLifeforms[0] ?? 'swarmlet');
  } else {
    setEggLifeformSelection(selectedLifeformId);
  }

  screens.setTool(selectedTool);
  screens.setEggArchetype(selectedEggArchetype);
  screens.setSelectedLifeform(overlayState.selectedLifeformId);
}

function currentToolUnlocks(): readonly ToolId[] {
  return currentCapabilityUnlocks().filter((tool): tool is ToolId => tool !== 'agitate');
}

function currentCapabilityUnlocks(): readonly DiscoveryProgressionState['unlockedTools'][number][] {
  if (discoveryProgression.revealAll) return ALL_PROGRESSION_TOOLS;
  return toolUnlocksForCurrentStage(
    discoveryProgression,
    run.getState().fightIndex,
    openingBloomCreatedInCurrentDish(),
  );
}

function currentLifeformUnlocks(): readonly ProgressionLifeformId[] {
  if (discoveryProgression.revealAll) return ALL_PROGRESSION_LIFEFORMS;
  const stagedLifeforms = lifeformUnlocksForCurrentStage(
    discoveryProgression,
    run.getState().fightIndex,
    openingBloomCreatedInCurrentDish(),
  );
  if (run.getState().fightIndex < COMMON_COLD_CASE.trials.length) return stagedLifeforms;

  // The authored Case has no pre-run loadout screen and can explicitly ask for
  // a previously banked rare specimen (Bloom Mass). Honour stabilized Case
  // specimens across reloads/replays; open-lab runs remain loadout-constrained.
  const availableBreeds = run.getState().fightIndex < COMMON_COLD_CASE.trials.length
    ? discoveryProgression.breedDiscoveryRecords
      .filter((record) => record.stage === 'stabilized')
      .map((record) => record.id)
    : stabilizedBreedsThisRun;

  return lifeformUnlocksForCurrentRun(
    stagedLifeforms,
    currentRunLoadout,
    availableBreeds,
  );
}

function currentStudyCapabilityInput(): Omit<StudyCapabilities, 'epochIndex' | 'seed'> {
  const player = run.getPlayerConfig();
  return {
    knownBreeds: new Set(
      discoveryProgression.breedDiscoveryRecords
        .filter((record) => record.stage === 'stabilized')
        .map((record) => record.id),
    ),
    seedableLifeforms: new Set(currentLifeformUnlocks()),
    unlockedTools: currentCapabilityUnlocks(),
    toolBudget: {
      egg: player.eggCharges ?? TOOL_TUNING.egg.charges,
      nutrient: player.nutrientCharges ?? TOOL_TUNING.nutrient.charges,
      toxin: player.toxinCharges ?? TOOL_TUNING.toxin.charges,
      water: player.waterCharges ?? TOOL_TUNING.water.charges,
      salt: player.saltCharges ?? TOOL_TUNING.salt.charges,
      acid: player.acidCharges ?? TOOL_TUNING.acid.charges,
      paste: player.pasteCharges ?? TOOL_TUNING.paste.charges,
      agitate: player.agitationCharges ?? AGITATION_TUNING.defaultCharges,
    },
  };
}

interface UnlockAvailability {
  readonly tools: readonly ToolId[];
  readonly lifeforms: readonly ProgressionLifeformId[];
}

function currentUnlockAvailability(): UnlockAvailability {
  return {
    tools: currentToolUnlocks(),
    lifeforms: currentLifeformUnlocks(),
  };
}

function openingBloomCreatedInCurrentDish(): boolean {
  return arena?.getEcology().discoveries.breedIds.includes('bloom_mass') === true;
}

function setOnboardingDishPointerTarget(pos: [number, number], besideEgg = false): void {
  const offsetX = besideEgg ? 12 : 0;
  const offsetY = besideEgg ? 8 : 0;
  onboardingDishGuidePos = [
    Math.max(12, Math.min(LX * 0.86, pos[0] + offsetX)),
    Math.max(16, Math.min(LY * 0.86, pos[1] + offsetY)),
  ];
}

function syncOnboardingPointer(): void {
  if (!onboardingGuidePointer) return;
  onboardingGuidePointer.classList.remove('is-visible');
  const state = run.getState();
  if (state.phase !== 'arena' || !arena || !coach.isActive()) return;
  const target = coach.getCurrentPointerTarget();
  if (!target) return;

  let x = 0;
  let y = 0;
  if (target === 'dish') {
    const rect = canvas.getBoundingClientRect();
    const liveEggPos = onboardingDishGuideTracksLastEgg ? arena.getLastEggCellPos() : null;
    const guidePos: [number, number] = liveEggPos
      ? [
        Math.max(12, Math.min(LX * 0.86, liveEggPos[0] + 12)),
        Math.max(16, Math.min(LY * 0.86, liveEggPos[1] + 8)),
      ]
      : onboardingDishGuidePos;
    x = rect.left + (guidePos[0] / LX) * rect.width;
    y = rect.top + (guidePos[1] / LY) * rect.height;
  } else {
    const needsMobileDrawer = target.startsWith('lifeform:')
      && window.matchMedia('(max-width: 899px)').matches
      && layout.dataset.mobileDrawer !== 'lifeforms';
    const selector = needsMobileDrawer
      ? '#mobile-lifeforms-toggle'
      : target === 'rack:more'
        ? '#toolbox-more'
      : target === 'end'
        ? '#end-epoch-button'
      : target.startsWith('tool:')
      ? `[data-tool="${target.slice('tool:'.length)}"]`
      : target.startsWith('lifeform:')
        ? `[data-lifeform-id="${target.slice('lifeform:'.length)}"]`
        : null;
    if (!selector) return;
    const targetElement = document.querySelector<HTMLElement>(selector);
    if (!targetElement || targetElement.hidden) return;
    const rect = targetElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    x = rect.left + rect.width * 0.5;
    y = rect.top + Math.min(18, rect.height * 0.25);
  }
  onboardingGuidePointer.style.left = `${Math.round(x)}px`;
  onboardingGuidePointer.style.top = `${Math.round(y)}px`;
  onboardingGuidePointer.dataset.target = target;
  onboardingGuidePointer.classList.add('is-visible');
}

function updateButtonHint(): void {
  syncOnboardingPointer();
  const state = run.getState();
  if (state.phase !== 'arena' || !arena) {
    screens.setButtonHint(null);
    return;
  }

  if (arena.getObjectiveProgress().complete) {
    screens.setButtonHint(null);
    return;
  }

  const coachButtonHint = coach.getCurrentButtonHint();
  if (coachButtonHint) {
    screens.setButtonHint(coachButtonHint as ToolId, 'hint');
    return;
  }

  screens.setButtonHint(null);
}

document.getElementById('coach-skip')?.addEventListener('click', () => {
  window.requestAnimationFrame(syncOnboardingPointer);
  // The first tap dismisses the full-size welcome before the compact lesson
  // is rendered. Reposition once that cinematic handoff has completed.
  window.setTimeout(syncOnboardingPointer, 560);
});
document.getElementById('mobile-lifeforms-toggle')?.addEventListener('click', () => {
  window.requestAnimationFrame(syncOnboardingPointer);
});
document.querySelector('[data-tool="egg"]')?.addEventListener('click', () => {
  window.requestAnimationFrame(syncOnboardingPointer);
});

function refreshArenaToolUi(): void {
  if (!arena) return;
  screens.updateToolCharges(arena.getToolStates());
  screens.updateAgitation(arena.getAgitationState());
}

function isUnlockedEggArchetype(archetype: EnemyArchetype): boolean {
  return currentLifeformUnlocks().includes(archetype);
}

function isSeedableLifeformId(id: string): id is ProgressionLifeformId {
  return isProgressionLifeformId(id) && currentLifeformUnlocks().includes(id);
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
  previous: UnlockAvailability,
  next: UnlockAvailability,
): void {
  let didUnlock = false;
  for (const tool of next.tools) {
    if (previous.tools.includes(tool)) continue;
    didUnlock = true;
    screens.showcaseToolUnlock(tool);
    screens.addTicker(`Research unlocked: ${capitalize(tool)} reagent available.`, 'discovery');
    fx.showToast('catalyst', 'Reagent Unlocked', `${capitalize(tool)} now available`);
  }
  for (const lifeform of next.lifeforms) {
    if (previous.lifeforms.includes(lifeform)) continue;
    didUnlock = true;
    screens.showcaseLifeformUnlock(lifeform);
    if (isBaseArchetype(lifeform)) {
      screens.addTicker(`Genome decoded: ${ARCHETYPE_INFO[lifeform].name}. Egg synthesis available.`, 'discovery');
    } else if (lifeform in BREED_DEFS) {
      screens.addTicker(`Genome decoded: ${BREED_DEFS[lifeform].name}. Egg synthesis available.`, 'discovery');
    }
  }
  if (didUnlock) haptics.play('discovery');
}

// Gentle idle nudge: if the player hasn't touched the dish for a while and the
// objective isn't complete, surface its authored hint ("Lab Assistant" voice).
// Capped per epoch and suppressed while the tutorial coach is active, so it
// helps a stuck player without ever nagging an engaged one.
const NUDGE_IDLE_TICKS = 60 * 22;
const TAUGHT_RESULT_RECOVERY_TICKS = 60 * 10;
const MAX_NUDGES_PER_EPOCH = 2;

function maybeNudgeIdlePlayer(objectiveComplete: boolean, hint: string | undefined): void {
  const awaitingTaughtResult = coach.isAwaitingObjective();
  // Exact instructions remain authoritative while the player is still acting.
  // Once all taught actions are complete, one bounded rescue is allowed if no
  // result arrives; otherwise “Watch the culture” can look like a soft lock.
  if (coach.isActive() && !awaitingTaughtResult) return;
  if (nudgeCountThisEpoch >= MAX_NUDGES_PER_EPOCH) return;
  if (awaitingTaughtResult && nudgeCountThisEpoch > 0) return;
  const idleThreshold = awaitingTaughtResult ? TAUGHT_RESULT_RECOVERY_TICKS : NUDGE_IDLE_TICKS;
  if (tickCount - lastActionTick < idleThreshold) return;
  const authoredTrial = COMMON_COLD_CASE.trials[run.getState().fightIndex];
  const nudge = onboardingIdleNudge({
    objectiveComplete,
    tutorialActive: coach.isActive(),
    objectiveHint: hint,
    guidanceTier: authoredTrial?.guidanceTier,
    nudgeIndex: nudgeCountThisEpoch,
    recoveryHints: authoredTrial?.recoveryHints,
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
    haptics.play('success');
    fx.showToast('discovery', 'Result Ready', `${objectiveName} — bank when ready`);
    screens.addTicker('Dr. E: Goal complete. Bank the result when you are ready, or keep cultivating.', 'discovery');
    coach.report('objective-complete');
    updateButtonHint();
  } else if (!complete && didAnnounceCompletion) {
    didAnnounceCompletion = false;
  }
}

function announceEquilibrium(info: { achieved: boolean; progress: number; biomeName: string | null }): void {
  if (!info.achieved || didAnnounceEquilibrium || isOnboardingEpoch(run.getState().fightIndex)) return;
  didAnnounceEquilibrium = true;
  uiAudio.play('epoch_win');
  haptics.play('success');
  fx.showToast('discovery', 'Stable Ecosystem', info.biomeName ?? 'Equilibrium');
  screens.addTicker('Equilibrium reached: pressure paused. Bank when ready, or keep observing.', 'discovery');
}

function labelForStrain(strain: string): string {
  if (isBaseArchetype(strain)) return ARCHETYPE_INFO[strain].name;
  if (isBreedId(strain)) return BREED_DEFS[strain].name;
  return strain
    .split('_')
    .filter(Boolean)
    .map((part) => capitalize(part))
    .join(' ');
}

function descriptionForStrain(strain: string): string {
  if (!isProgressionLifeformId(strain)) return 'Archived experimental specimen.';
  const identity = LIFEFORM_IDENTITIES[strain];
  return `${identity.role} · ${identity.behavior}`;
}

function colorForStrain(strain: string): string {
  if (isBaseArchetype(strain)) return cssRgb(ARCHETYPE_INFO[strain].color);
  if (isBreedId(strain)) return cssRgb(BREED_DEFS[strain].tint);
  return 'rgb(91, 233, 214)';
}

function artForStrain(strain: string): { src: string; alt: string } | null {
  if (!isProgressionLifeformId(strain)) return null;
  const genome = genomeArtFor(strain);
  return { src: genome.asset, alt: genome.alt };
}

function cssRgb(color: readonly [number, number, number]): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function isBaseArchetype(id: string): id is EnemyArchetype {
  return (EGG_ARCHETYPES as readonly string[]).includes(id);
}

function isBreedId(id: string): id is BreedId {
  return id in BREED_DEFS;
}

function isProgressionLifeformId(id: string): id is ProgressionLifeformId {
  return isBaseArchetype(id) || isBreedId(id);
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function applyOverlayState(): void {
  layout.classList.toggle('debug-open', overlayState.debugOpen);
  layout.classList.toggle('menu-open', overlayState.menuOpen);
  layout.classList.toggle('presentation-mode', overlayState.presentationMode);
}

let optionsReturnFocus: HTMLElement | null = null;

function openDeleteDataDialog(): void {
  const dialog = document.getElementById('delete-data-dialog');
  if (!(dialog instanceof HTMLDialogElement) || dialog.open) return;
  setOptionsMenuOpen(false);
  dialog.showModal();
  document.getElementById('delete-data-cancel')?.focus();
}

function setOptionsMenuOpen(open: boolean): void {
  const optionsPanel = document.getElementById('debug');
  const optionsButton = document.getElementById('options-button');
  if (open) {
    clearAbandonConfirmation();
    const activeElement = document.activeElement;
    optionsReturnFocus = activeElement instanceof HTMLElement && activeElement !== document.body
      ? activeElement
      : optionsButton;
    screens.closeMobileDrawers();
  }
  overlayState.menuOpen = open;
  overlayState.debugOpen = open;
  simClock.reset(performance.now());
  applyOverlayState();
  // Options becomes the sole interaction plane while open. Clear the authored
  // guide immediately instead of leaving its portrait/pointer under the scrim;
  // closing restores the current target without advancing the tutorial.
  syncOnboardingPointer();
  optionsPanel?.setAttribute('aria-hidden', String(!open));
  optionsButton?.setAttribute('aria-expanded', String(open));
  if (open) {
    document.getElementById('options-close')?.focus();
  } else {
    optionsReturnFocus?.focus();
    optionsReturnFocus = null;
  }
}

function trapOptionsFocus(event: KeyboardEvent): void {
  const optionsPanel = document.getElementById('debug');
  if (!optionsPanel) return;
  const focusable = Array.from(optionsPanel.querySelectorAll<HTMLElement>(
    'button:not([disabled]):not([hidden]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.getClientRects().length > 0);
  if (focusable.length === 0) return;
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function trapNotebookFocus(event: KeyboardEvent): void {
  const notebook = document.getElementById('screen-notebook');
  if (!notebook) return;
  const focusable = Array.from(notebook.querySelectorAll<HTMLElement>(
    'button:not([disabled]):not([hidden]), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.getClientRects().length > 0);
  if (focusable.length === 0) return;
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function refreshNotebook(): void {
  const notebook = notebookViewForProgression(discoveryProgression);
  screens.updateNotebook(notebook);
  screens.updateAtlas(atlasViewForProgression(discoveryProgression));
  screens.updateResearchNotebook(researchNotebookView(notebook, activeStudySnapshot(), researchArchive));
}

function activeStudySnapshot(): ActiveStudySnapshot | null {
  if (!arena || run.getState().phase !== 'arena') return null;
  const objective = arena.getObjectiveProgress();
  const ecology = arena.getEcology();
  const equilibrium = arena.getEquilibrium();
  return {
    objective: objective.def,
    summary: objective.summary,
    complete: objective.complete,
    secondsRemaining: ecology.secondsRemaining,
    livingCultures: ecology.livingEnemies,
    reactions: ecology.reactions,
    equilibriumProgress: equilibrium.progress,
  };
}

function openNotebook(): void {
  clearAbandonConfirmation();
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
  const wasOpen = overlayState.notebookOpen;
  overlayState.notebookOpen = false;
  // Let the tablet slide out before hiding; reduced-motion closes instantly.
  const notebookScreen = document.getElementById('screen-notebook');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (notebookScreen && !reduceMotion && notebookScreen.classList.contains('visible')) {
    notebookScreen.classList.add('notebook-screen-closing');
    window.setTimeout(() => {
      notebookScreen.classList.remove('notebook-screen-closing');
      screens.hide('notebook');
      if (wasOpen) document.getElementById('notebook-button')?.focus({ preventScroll: true });
    }, 210);
  } else {
    screens.hide('notebook');
    if (wasOpen) document.getElementById('notebook-button')?.focus({ preventScroll: true });
  }
  applyOverlayState();
}

function setPresentationMode(enabled: boolean): void {
  if (enabled && (!customFullscreenAvailable || run.getState().phase !== 'arena')) return;
  overlayState.presentationMode = enabled;
  screens.setFullscreenActive(enabled);
  if (enabled) {
    setOptionsMenuOpen(false);
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
  lastTickerUpdateTick: number;
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
  lastObjectiveSummaryTick: number;
  seenSignals: string[];
  didWarnDeadline: boolean;
  didWarnCritical: boolean;
}

// Tracks per-cell life state and consumed dish-event ids so juice can fire
// birth/death/discovery feedback exactly once per event. Reset per arena.
interface CellFxTracker {
  known: Map<number, { vol: number; center: [number, number] }>;
  lastDishEventId: number;
  primed: boolean;
}

function createCellFxTracker(): CellFxTracker {
  return { known: new Map(), lastDishEventId: -1, primed: false };
}

let cellFxTracker: CellFxTracker = createCellFxTracker();

const FALLBACK_BURST_RGB: [number, number, number] = [140, 220, 255];

function burstColorFor(ar: Arena, id: number): [number, number, number] {
  const spawn = ar.archetypes.get(id);
  if (!spawn) return FALLBACK_BURST_RGB;
  const [r, g, b] = lifeformIdentityForSpawn(spawn).colors.primary;
  return [r, g, b];
}

function updateJuiceEvents(ar: Arena): void {
  // First frame of a dish: register everything silently so the initial
  // seeding doesn't read as a burst storm.
  if (!cellFxTracker.primed) {
    cellFxTracker.primed = true;
    for (const [id, cell] of ar.state.cells) {
      if (id === PLAYER_ID) continue;
      cellFxTracker.known.set(id, { vol: cell.vol, center: [cell.center[0], cell.center[1]] });
    }
    let maxSeen = cellFxTracker.lastDishEventId;
    for (const ev of ar.getDishEvents()) if (ev.id > maxSeen) maxSeen = ev.id;
    cellFxTracker.lastDishEventId = maxSeen;
    return;
  }

  // Births and deaths at their dish positions.
  for (const [id, cell] of ar.state.cells) {
    if (id === PLAYER_ID) continue;
    const prev = cellFxTracker.known.get(id);
    const alive = cell.vol > 0;
    if (!prev && alive) {
      juice.burst([cell.center[0], cell.center[1]], burstColorFor(ar, id), 'birth');
      cellFxTracker.known.set(id, { vol: cell.vol, center: [cell.center[0], cell.center[1]] });
    } else if (prev && prev.vol > 0 && !alive) {
      // Use the last live center — a dead cell's center is stale.
      juice.burst(prev.center, burstColorFor(ar, id), 'death');
      cellFxTracker.known.delete(id);
    } else if (prev && alive) {
      prev.vol = cell.vol;
      prev.center = [cell.center[0], cell.center[1]];
    }
  }

  // A cell removed from the map entirely also counts as a death. Dead
  // entries are dropped so the tracker stays bounded over open-ended runs.
  for (const [id, prev] of cellFxTracker.known) {
    if (!ar.state.cells.has(id)) {
      if (prev.vol > 0) juice.burst(prev.center, FALLBACK_BURST_RGB, 'death');
      cellFxTracker.known.delete(id);
    }
  }

  // New dish events: discovery bursts, critical/fold hard shakes.
  let maxId = cellFxTracker.lastDishEventId;
  for (const ev of ar.getDishEvents()) {
    if (ev.id <= cellFxTracker.lastDishEventId) continue;
    if (ev.id > maxId) maxId = ev.id;
    if (ev.kind === 'discovery') {
      juice.burst(ev.pos, [126, 230, 255], 'discovery');
      haptics.play('discovery');
    } else if (ev.kind === 'critical' || ev.kind === 'fold') {
      juice.shake('hard');
      haptics.play('warning');
    }
  }
  cellFxTracker.lastDishEventId = maxId;
}

function createTickerState(): TickerState {
  return {
    lastTickerUpdateTick: -45,
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
    lastObjectiveSummaryTick: -180,
    seenSignals: [],
    didWarnDeadline: false,
    didWarnCritical: false,
  };
}

function updateTicker(ar: Arena): void {
  if (tickCount - tickerState.lastTickerUpdateTick < 45) return;
  tickerState.lastTickerUpdateTick = tickCount;
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
    juice.shake('soft');
    haptics.play('warning');
  }

  if (ecology.mutations > tickerState.lastMutationCount) {
    tickerState.lastMutationCount = ecology.mutations;
    screens.addTicker('Visible mutation: a culture expressed a new trait.', 'discovery');
  }

  if (
    objective.summary !== tickerState.lastObjectiveSummary
    && tickCount - tickerState.lastObjectiveSummaryTick >= 180
  ) {
    tickerState.lastObjectiveSummary = objective.summary;
    tickerState.lastObjectiveSummaryTick = tickCount;
    screens.addTicker(`Objective update: ${objective.summary}.`);
  }

  if (objective.def.timed && !tickerState.didWarnDeadline && objective.urgency === 'warning') {
    tickerState.didWarnDeadline = true;
    screens.addTicker('Deadline pressure is rising.', 'caution');
  } else if (objective.def.timed && !tickerState.didWarnCritical && objective.urgency === 'critical') {
    tickerState.didWarnCritical = true;
    screens.addTicker('Final seconds: finish the objective now.', 'critical');
    haptics.play('warning');
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
