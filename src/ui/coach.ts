// First-run onboarding coach. Dr. E. Mergent arrives as a large, transient
// character beat, gives one instruction, then clears the dish before the
// player acts. Trial 1 is intentionally only: place one egg, feed it, succeed.

import { ONBOARDING_BEATS } from '../game/onboardingStage';

export type CoachEvent =
  | 'arena-start'
  | 'egg-placed'
  | 'nutrient-used'
  | 'paste-drawn'
  | 'objective-complete'
  | 'bloom-discovered';

export interface Coach {
  isActive(): boolean;
  hasSeenTutorial(): boolean;
  beginRun(): void;
  report(event: CoachEvent): void;
  dismiss(): void;
  getBeatIndex(): number;
  getCurrentButtonHint(): string | undefined;
  shouldAutoSpawn(): boolean;
  onOnboardingComplete: (() => void) | null;
  showNudge(title: string, body: string, opts?: { interruptTutorial?: boolean }): void;
  hideNudge(): void;
}

const SEEN_KEY = 'cdm.coach.seen.v7';
const PROMPT_HOLD_MS = 3000;
const SUCCESS_HOLD_MS = 4800;
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
  let awaitingBloom = false;
  let beatIndex = 0;
  let mode: 'tutorial' | 'nudge' | 'success' = 'tutorial';
  let nudgeTimer = 0;
  let presentationTimer = 0;
  let exitTimer = 0;
  let autoSpawnTriggered = false;

  function seen(): boolean {
    try { return window.localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
  }

  function markSeen(): void {
    try { window.localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
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
    awaitingBloom = false;
    markSeen();
    hide();
  }

  function render(): void {
    if (!root || !kickerEl || !titleEl || !bodyEl || !stepEl) return;
    const beat = ONBOARDING_BEATS[beatIndex];
    if (!beat) { hidePresentation(); return; }
    mode = 'tutorial';
    clearPresentationTimers();
    clearPresentationClasses();
    const isIntroduction = beat.id === 'place-egg';
    root.classList.add(isIntroduction ? 'coach-intro' : 'coach-prompt');
    layout?.classList.add(isIntroduction ? 'coach-intro-active' : 'coach-prompt-active');
    kickerEl.textContent = isIntroduction
      ? 'Trial director · Dr. E. Mergent'
      : 'Dr. E. Mergent · Next action';
    titleEl.textContent = beat.title;
    bodyEl.textContent = beat.body;
    stepEl.textContent = `${beatIndex + 1} / ${ONBOARDING_BEATS.length}`;
    if (actionEl) {
      actionEl.textContent = isIntroduction
        ? 'Egg armed · Tap the dish'
        : 'Nutrient ready · Feed the egg';
    }
    if (skipBtn) skipBtn.textContent = 'Let me experiment';
    show();
    scheduleSlideOut(PROMPT_HOLD_MS);
  }

  function celebrateSuccess(coach: Coach): void {
    if (!root || !kickerEl || !titleEl || !bodyEl || !stepEl) return;
    active = false;
    awaitingBloom = false;
    mode = 'success';
    clearPresentationTimers();
    clearPresentationClasses();
    root.classList.add('coach-prompt');
    root.classList.add('coach-success');
    layout?.classList.add('coach-prompt-active');
    layout?.classList.add('coach-success-active');
    kickerEl.textContent = 'Trial 01 · Success';
    titleEl.textContent = 'Excellent work. It changed.';
    bodyEl.textContent = 'One egg. One feed. One new form. That was the easy part — ahead are competing strains, unstable reagents, and a much larger experiment.';
    stepEl.textContent = 'Complete';
    if (actionEl) actionEl.textContent = 'Culture logged · The real work begins';
    if (skipBtn) skipBtn.textContent = 'Continue';
    show();
    scheduleSlideOut(SUCCESS_HOLD_MS, () => {
      finish();
      coach.onOnboardingComplete?.();
    });
  }

  function hideNudgeNow(): void {
    window.clearTimeout(nudgeTimer);
    if (mode !== 'nudge') return;
    if (active && !awaitingBloom) render();
    else hidePresentation();
  }

  const coach: Coach = {
    onOnboardingComplete: null,

    isActive() {
      return active;
    },
    hasSeenTutorial() {
      return seen();
    },
    getBeatIndex() {
      return beatIndex;
    },
    getCurrentButtonHint() {
      if (!active || awaitingBloom) return undefined;
      return ONBOARDING_BEATS[beatIndex]?.buttonHint;
    },
    shouldAutoSpawn() {
      if (!awaitingBloom || autoSpawnTriggered) return false;
      autoSpawnTriggered = true;
      return true;
    },
    beginRun() {
      if (seen()) { active = false; hide(); return; }
      active = true;
      awaitingBloom = false;
      beatIndex = 0;
      autoSpawnTriggered = false;
      render();
    },
    report(event) {
      if (!active) return;
      if (awaitingBloom) {
        if (event === 'bloom-discovered') celebrateSuccess(coach);
        return;
      }
      const beat = ONBOARDING_BEATS[beatIndex];
      if (!beat || beat.trigger !== event) return;
      beatIndex += 1;
      if (beatIndex >= ONBOARDING_BEATS.length) {
        awaitingBloom = true;
        autoSpawnTriggered = false;
        slideOut();
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
      else finish();
    });
  }

  return coach;
}
