// First-run onboarding coach. Dr. E. Mergent speaks from a shallow transmission
// rail above the dish, gives one instruction, then clears the playfield while
// the exact pointer remains. Trial 1 is only: place one egg, feed it, succeed.

import { ONBOARDING_BEATS, TRIAL_ONBOARDING_BEATS, type OnboardingBeat } from '../game/onboardingStage';

export type CoachEvent = string;

export interface Coach {
  isActive(): boolean;
  isPresentingSuccess(): boolean;
  hasSeenTutorial(): boolean;
  beginRun(): void;
  beginTrial(trialIndex: number): void;
  report(event: CoachEvent): void;
  dismiss(): void;
  getBeatIndex(): number;
  getCurrentButtonHint(): string | undefined;
  getCurrentPointerTarget(): string | undefined;
  shouldAutoSpawn(): boolean;
  onOnboardingComplete: ((trialIndex: number) => void) | null;
  showNudge(title: string, body: string, opts?: { interruptTutorial?: boolean }): void;
  hideNudge(): void;
}

const SEEN_KEY = 'cdm.coach.seen.v8';
const SEEN_TRIALS_KEY = 'cdm.coach.trials.v1';
const PROMPT_HOLD_MS = 3000;
const SUCCESS_HOLD_MS = 3600;
const SLIDE_OUT_MS = 520;

export function createCoach(): Coach {
  const root = document.getElementById('coach');
  const layout = typeof document.querySelector === 'function'
    ? document.querySelector<HTMLElement>('.layout')
    : null;
  const kickerEl = document.getElementById('coach-kicker');
  const titleEl = document.getElementById('coach-title');
  const bodyEl = document.getElementById('coach-body');
  const stepEl = document.getElementById('coach-step');
  const actionEl = document.getElementById('coach-action');
  const skipBtn = document.getElementById('coach-skip');

  let active = false;
  let awaitingObjective = false;
  let objectiveObserved = false;
  let beatIndex = 0;
  let currentTrialIndex = 0;
  let currentBeats: readonly OnboardingBeat[] = ONBOARDING_BEATS;
  let mode: 'tutorial' | 'nudge' | 'success' = 'tutorial';
  let nudgeTimer = 0;
  let presentationTimer = 0;
  let exitTimer = 0;
  let autoSpawnTriggered = false;
  let presentingSuccess = false;

  function seen(): boolean {
    return seenTrials().has(0) || (() => {
      try { return window.localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
    })();
  }

  function seenTrials(): Set<number> {
    try {
      const value = JSON.parse(window.localStorage.getItem(SEEN_TRIALS_KEY) ?? '[]');
      return new Set(Array.isArray(value) ? value.filter(Number.isInteger) : []);
    } catch {
      return new Set();
    }
  }

  function markSeen(trialIndex: number): void {
    try {
      const trials = seenTrials();
      trials.add(trialIndex);
      window.localStorage.setItem(SEEN_TRIALS_KEY, JSON.stringify([...trials]));
      if (trialIndex === 0) window.localStorage.setItem(SEEN_KEY, '1');
    } catch { /* ignore */ }
  }

  function clearPresentationTimers(): void {
    window.clearTimeout(presentationTimer);
    window.clearTimeout(exitTimer);
  }

  function clearPresentationClasses(): void {
    root?.classList.remove('coach-intro');
    root?.classList.remove('coach-prompt');
    root?.classList.remove('coach-success');
    root?.classList.remove('coach-exit');
    layout?.classList.remove('coach-intro-active');
    layout?.classList.remove('coach-prompt-active');
    layout?.classList.remove('coach-success-active');
  }

  function publishCoachBottom(): void {
    if (!root || !layout) return;
    const bottom = root.classList.contains('coach-show') && typeof root.getBoundingClientRect === 'function'
      ? Math.round(root.getBoundingClientRect().bottom)
      : 0;
    layout.style.setProperty('--coach-bottom', `${bottom}px`);
  }

  function show(): void {
    if (!root) return;
    root.classList.remove('coach-exit');
    root.classList.add('coach-show');
    root.setAttribute('aria-hidden', 'false');
    layout?.classList.add('coach-active');
    publishCoachBottom();
  }

  function hidePresentation(): void {
    if (!root) return;
    clearPresentationTimers();
    root.classList.remove('coach-show');
    root.setAttribute('aria-hidden', 'true');
    clearPresentationClasses();
    layout?.classList.remove('coach-active');
    publishCoachBottom();
  }

  function slideOut(after?: () => void): void {
    if (!root?.classList.contains('coach-show')) {
      hidePresentation();
      after?.();
      return;
    }
    root.classList.add('coach-exit');
    exitTimer = window.setTimeout(() => {
      hidePresentation();
      after?.();
    }, SLIDE_OUT_MS);
  }

  function scheduleSlideOut(holdMs: number, after?: () => void): void {
    clearPresentationTimers();
    presentationTimer = window.setTimeout(() => slideOut(after), holdMs);
  }

  function hide(): void {
    hidePresentation();
  }

  if (root && typeof ResizeObserver === 'function') {
    new ResizeObserver(publishCoachBottom).observe(root);
    window.addEventListener('resize', publishCoachBottom);
  }

  function finish(): void {
    active = false;
    presentingSuccess = false;
    awaitingObjective = false;
    objectiveObserved = false;
    markSeen(currentTrialIndex);
    hide();
  }

  function render(): void {
    if (!root || !kickerEl || !titleEl || !bodyEl || !stepEl) return;
    const beat = currentBeats[beatIndex];
    if (!beat) { hidePresentation(); return; }
    mode = 'tutorial';
    clearPresentationTimers();
    clearPresentationClasses();
    const isIntroduction = currentTrialIndex === 0 && beatIndex === 0;
    root.classList.add(isIntroduction ? 'coach-intro' : 'coach-prompt');
    layout?.classList.add(isIntroduction ? 'coach-intro-active' : 'coach-prompt-active');
    kickerEl.textContent = isIntroduction
      ? 'Dr. E · First instruction'
      : 'Dr. E · Next instruction';
    titleEl.textContent = beat.title;
    bodyEl.textContent = beat.body;
    stepEl.textContent = `${beatIndex + 1} / ${currentBeats.length}`;
    if (actionEl) actionEl.textContent = beat.action;
    if (skipBtn) skipBtn.textContent = 'Skip';
    show();
    scheduleSlideOut(PROMPT_HOLD_MS);
  }

  function celebrateSuccess(coach: Coach): void {
    if (!root || !kickerEl || !titleEl || !bodyEl || !stepEl) return;
    active = false;
    presentingSuccess = true;
    awaitingObjective = false;
    mode = 'success';
    clearPresentationTimers();
    clearPresentationClasses();
    root.classList.add('coach-prompt');
    root.classList.add('coach-success');
    layout?.classList.add('coach-prompt-active');
    layout?.classList.add('coach-success-active');
    kickerEl.textContent = `Trial ${String(currentTrialIndex + 1).padStart(2, '0')} · Success`;
    const success = trialSuccessCopy(currentTrialIndex);
    titleEl.textContent = success.title;
    bodyEl.textContent = success.body;
    stepEl.textContent = 'Complete';
    if (actionEl) actionEl.textContent = 'Culture logged';
    if (skipBtn) skipBtn.textContent = 'Continue';
    show();
    scheduleSlideOut(SUCCESS_HOLD_MS, () => finishSuccess(coach));
  }

  function finishSuccess(coach: Coach): void {
    const completedTrialIndex = currentTrialIndex;
    finish();
    coach.onOnboardingComplete?.(completedTrialIndex);
  }

  function hideNudgeNow(): void {
    window.clearTimeout(nudgeTimer);
    if (mode !== 'nudge') return;
    if (active && !awaitingObjective) render();
    else hidePresentation();
  }

  const coach: Coach = {
    onOnboardingComplete: null,

    isActive() {
      return active;
    },
    isPresentingSuccess() {
      return presentingSuccess;
    },
    hasSeenTutorial() {
      return seen();
    },
    getBeatIndex() {
      return beatIndex;
    },
    getCurrentButtonHint() {
      if (!active || awaitingObjective) return undefined;
      const target = currentBeats[beatIndex]?.pointerTarget;
      return target?.startsWith('tool:') ? target.slice('tool:'.length) : undefined;
    },
    getCurrentPointerTarget() {
      if (!active || awaitingObjective) return undefined;
      return currentBeats[beatIndex]?.pointerTarget;
    },
    shouldAutoSpawn() {
      if (currentTrialIndex !== 0 || !awaitingObjective || autoSpawnTriggered) return false;
      autoSpawnTriggered = true;
      return true;
    },
    beginRun() {
      coach.beginTrial(0);
    },
    beginTrial(trialIndex) {
      const beats = TRIAL_ONBOARDING_BEATS[trialIndex];
      if (!beats || seenTrials().has(trialIndex) || (trialIndex === 0 && seen())) {
        active = false;
        hide();
        return;
      }
      currentTrialIndex = trialIndex;
      currentBeats = beats;
      active = true;
      awaitingObjective = false;
      objectiveObserved = false;
      beatIndex = 0;
      autoSpawnTriggered = false;
      render();
    },
    report(event) {
      if (!active) return;
      const isCompletionEvent = currentTrialIndex === 0
        ? event === 'bloom-discovered' || event === 'objective-complete'
        : event === 'objective-complete';
      if (isCompletionEvent) objectiveObserved = true;
      if (awaitingObjective) {
        if (objectiveObserved) celebrateSuccess(coach);
        return;
      }
      const beat = currentBeats[beatIndex];
      if (!beat || beat.trigger !== event) return;
      beatIndex += 1;
      if (beatIndex >= currentBeats.length) {
        awaitingObjective = true;
        autoSpawnTriggered = false;
        if (objectiveObserved) celebrateSuccess(coach);
        else slideOut();
        return;
      }
      render();
    },
    dismiss() {
      finish();
    },
    showNudge(title, body, opts = {}) {
      if (active && !opts.interruptTutorial) return;
      if (!root || !kickerEl || !titleEl || !bodyEl || !stepEl) return;
      mode = 'nudge';
      clearPresentationTimers();
      clearPresentationClasses();
      kickerEl.textContent = 'Professor’s note';
      titleEl.textContent = title;
      bodyEl.textContent = body;
      stepEl.textContent = '';
      if (actionEl) actionEl.textContent = '';
      if (skipBtn) skipBtn.textContent = 'Got it';
      show();
      window.clearTimeout(nudgeTimer);
      nudgeTimer = window.setTimeout(() => hideNudgeNow(), 9000);
    },
    hideNudge() {
      hideNudgeNow();
    },
  };

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      if (mode === 'nudge') hideNudgeNow();
      else if (mode === 'success') finishSuccess(coach);
      else finish();
    });
  }

  return coach;
}

function trialSuccessCopy(trialIndex: number): { title: string; body: string } {
  const copy = [
    {
      title: 'Bloom Mass. Logged.',
      body: 'Good. Next we combine strains, reagents, and living systems.',
    },
    {
      title: 'Bitter Bloom. Logged.',
      body: 'Feed, then pressure: a repeatable protocol.',
    },
    {
      title: 'Nutrient Conduit. Logged.',
      body: 'Water carried food through living tissue.',
    },
    {
      title: 'Foam Lightning. Logged.',
      body: 'A second Water pulse discharged the Foam.',
    },
    {
      title: 'Brine Channel. Logged.',
      body: 'Now keep the wider ecosystem alive.',
    },
  ];
  return copy[trialIndex] ?? { title: 'Good work.', body: 'The result is logged.' };
}
