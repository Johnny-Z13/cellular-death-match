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

const SEEN_KEY = 'cdm.coach.seen.v5';
const PROMPT_HOLD_MS = 2600;

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
  let beatIndex = 0;
  // 'tutorial' = the first-run lesson; 'nudge' = a transient idle hint.
  let mode: 'tutorial' | 'nudge' = 'tutorial';
  let nudgeTimer = 0;
  let promptTimer = 0;
  let autoSpawnTriggered = false;

  function seen(): boolean {
    try { return window.localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
  }

  function markSeen(): void {
    try { window.localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
  }

  function clearPromptPresentation(): void {
    window.clearTimeout(promptTimer);
    root?.classList.remove('coach-prompt');
    layout?.classList.remove('coach-prompt-active');
  }

  function render(): void {
    if (!root || !kickerEl || !titleEl || !bodyEl || !stepEl) return;
    const beat = ONBOARDING_BEATS[beatIndex];
    if (!beat) { hide(); return; }
    mode = 'tutorial';
    const isIntroduction = beat.id === 'place-egg';
    clearPromptPresentation();
    root.classList.remove('coach-intro');
    layout?.classList.remove('coach-intro-active');
    if (isIntroduction) {
      root.classList.add('coach-intro');
      layout?.classList.add('coach-intro-active');
    } else {
      root.classList.add('coach-prompt');
      layout?.classList.add('coach-prompt-active');
    }
    kickerEl.textContent = isIntroduction
      ? 'Trial director · Dr. E. Mergent'
      : `Dr. E. Mergent’s hypothesis · ${beatIndex + 1}`;
    titleEl.textContent = beat.title;
    bodyEl.textContent = beat.body;
    stepEl.textContent = `${beatIndex + 1} / ${ONBOARDING_BEATS.length}`;
    if (actionEl) {
      actionEl.textContent = isIntroduction
        ? 'Egg armed · Tap the dish'
        : beat.id === 'feed-colony'
          ? 'Nutrient ready · Feed the culture'
          : 'Observe · New form approaching';
    }
    if (skipBtn) skipBtn.textContent = 'Let me experiment';
    show();
    if (!isIntroduction) {
      promptTimer = window.setTimeout(() => {
        clearPromptPresentation();
        publishCoachBottom();
      }, PROMPT_HOLD_MS);
    }
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
    root.classList.add('coach-show');
    root.setAttribute('aria-hidden', 'false');
    layout?.classList.add('coach-active');
    publishCoachBottom();
  }

  function hide(): void {
    if (!root) return;
    clearPromptPresentation();
    root.classList.remove('coach-show');
    root.classList.remove('coach-intro');
    root.setAttribute('aria-hidden', 'true');
    layout?.classList.remove('coach-active');
    layout?.classList.remove('coach-intro-active');
    publishCoachBottom();
  }

  if (root && typeof ResizeObserver === 'function') {
    new ResizeObserver(publishCoachBottom).observe(root);
    window.addEventListener('resize', publishCoachBottom);
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
          clearPromptPresentation();
          kickerEl.textContent = 'Professor’s result';
          titleEl.textContent = 'Extraordinary. Or deeply concerning.';
          bodyEl.textContent = 'Bloom Mass logged. The first hypothesis is sealed in the Lab.';
          stepEl.textContent = `${ONBOARDING_BEATS.length} / ${ONBOARDING_BEATS.length}`;
          show();
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
      clearPromptPresentation();
      root.classList.remove('coach-intro');
      layout?.classList.remove('coach-intro-active');
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

  return coach;
}
