// First-run onboarding coach. A small, skippable, event-driven guide that
// advances through 3 beats as it observes the player's real actions.
// First run only, persisted via localStorage; a Skip control dismisses it for good.

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
  // Idle nudge: a one-off contextual hint reusing the same card. Auto-hides;
  // "Got it" dismisses just this nudge (never marks the tutorial seen).
  showNudge(title: string, body: string, opts?: { interruptTutorial?: boolean }): void;
  hideNudge(): void;
}

const SEEN_KEY = 'cdm.coach.seen.v3';

export function createCoach(): Coach {
  const root = document.getElementById('coach');
  const kickerEl = document.getElementById('coach-kicker');
  const titleEl = document.getElementById('coach-title');
  const bodyEl = document.getElementById('coach-body');
  const stepEl = document.getElementById('coach-step');
  const skipBtn = document.getElementById('coach-skip');

  let active = false;
  let beatIndex = 0;
  // 'tutorial' = the first-run lesson; 'nudge' = a transient idle hint.
  let mode: 'tutorial' | 'nudge' = 'tutorial';
  let nudgeTimer = 0;
  let autoSpawnTriggered = false;

  function seen(): boolean {
    try { return window.localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
  }

  function markSeen(): void {
    try { window.localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
  }

  function render(): void {
    if (!root || !kickerEl || !titleEl || !bodyEl || !stepEl) return;
    const beat = ONBOARDING_BEATS[beatIndex];
    if (!beat) { hide(); return; }
    mode = 'tutorial';
    kickerEl.textContent = `Lab Induction · Step ${beatIndex + 1}`;
    titleEl.textContent = beat.message;
    bodyEl.textContent = '';
    stepEl.textContent = `${beatIndex + 1} / ${ONBOARDING_BEATS.length}`;
    if (skipBtn) skipBtn.textContent = 'Skip tutorial';
    root.classList.add('coach-show');
    root.setAttribute('aria-hidden', 'false');
  }

  function hide(): void {
    if (!root) return;
    root.classList.remove('coach-show');
    root.setAttribute('aria-hidden', 'true');
  }

  function finish(): void {
    active = false;
    markSeen();
    hide();
  }

  function hideNudgeNow(): void {
    window.clearTimeout(nudgeTimer);
    if (mode !== 'nudge') return;
    if (active) render();
    else hide();
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      if (mode === 'nudge') hideNudgeNow();
      else finish();
    });
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
      if (!active) return undefined;
      const beat = ONBOARDING_BEATS[beatIndex];
      return beat?.buttonHint;
    },
    shouldAutoSpawn() {
      if (autoSpawnTriggered) return false;
      const beat = ONBOARDING_BEATS[beatIndex];
      if (beat?.autoSpawn) {
        autoSpawnTriggered = true;
        return true;
      }
      return false;
    },
    beginRun() {
      if (seen()) { active = false; hide(); return; }
      active = true;
      beatIndex = 0;
      autoSpawnTriggered = false;
      render();
    },
    report(event) {
      if (!active) return;
      const beat = ONBOARDING_BEATS[beatIndex];
      if (!beat || beat.trigger !== event) return;
      beatIndex += 1;
      if (beatIndex >= ONBOARDING_BEATS.length) {
        // Final beat done: celebrate briefly, then retire the coach.
        if (titleEl && bodyEl && kickerEl && stepEl && root) {
          kickerEl.textContent = 'Discovery!';
          titleEl.textContent = 'You created a new lifeform!';
          bodyEl.textContent = 'Your Notebook logs every breed you find. Seed, feed, and discover.';
          stepEl.textContent = `${ONBOARDING_BEATS.length} / ${ONBOARDING_BEATS.length}`;
          root.classList.add('coach-show');
          root.setAttribute('aria-hidden', 'false');
        }
        active = false;
        window.setTimeout(() => {
          finish();
          if (coach.onOnboardingComplete) coach.onOnboardingComplete();
        }, 4200);
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
      kickerEl.textContent = 'Lab Assistant';
      titleEl.textContent = title;
      bodyEl.textContent = body;
      stepEl.textContent = '';
      if (skipBtn) skipBtn.textContent = 'Got it';
      root.classList.add('coach-show');
      root.setAttribute('aria-hidden', 'false');
      window.clearTimeout(nudgeTimer);
      nudgeTimer = window.setTimeout(() => hideNudgeNow(), 9000);
    },
    hideNudge() {
      hideNudgeNow();
    },
  };

  return coach;
}
