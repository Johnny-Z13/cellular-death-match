// First-run onboarding coach. A small, skippable, deep-lab-voiced guide that
// advances as it observes the player's real actions, never as a blocking modal.
// First run only, persisted via localStorage; a Skip control dismisses it for good.

export type CoachEvent =
  | 'arena-start'
  | 'egg-placed'
  | 'nutrient-used'
  | 'paste-drawn'
  | 'objective-complete';

interface CoachStep {
  id: string;
  // The beat that advances FROM this step to the next.
  advanceOn: CoachEvent;
  kicker: string;
  title: string;
  body: string;
}

export interface CoachCard {
  kicker: string;
  title: string;
  body: string;
  stepText: string;
  skipLabel: string;
  onSkip: () => void;
}

export interface CoachView {
  setTutorialCard(card: CoachCard | null): void;
}

const SEEN_KEY = 'cdm.coach.seen.v2';

// The opening lesson: seed once, feed the hidden starter pairing, then hand off
// to the objective HUD, button hints, and idle nudges.
const STEPS: readonly CoachStep[] = [
  {
    id: 'egg',
    advanceOn: 'egg-placed',
    kicker: 'Specimen 01 · Seed',
    title: 'Place one egg',
    body: 'Tap open dish space to add another Swarmlet culture.',
  },
  {
    id: 'feed',
    advanceOn: 'nutrient-used',
    kicker: 'Specimen 01 · Feeding',
    title: 'Feed the colony',
    body: 'Pick Nutrient from the rack, then tap near the living cultures. Watch for a new lifeform.',
  },
];

export interface Coach {
  isActive(): boolean;
  hasSeenTutorial(): boolean;
  beginRun(): void;
  report(event: CoachEvent): void;
  dismiss(): void;
  // Idle nudge: a one-off contextual hint reusing the same card. Auto-hides;
  // "Got it" dismisses just this nudge (never marks the tutorial seen).
  showNudge(title: string, body: string, opts?: { interruptTutorial?: boolean }): void;
  hideNudge(): void;
}

export function createCoach(view?: CoachView): Coach {
  const root = document.getElementById('coach');
  const kickerEl = document.getElementById('coach-kicker');
  const titleEl = document.getElementById('coach-title');
  const bodyEl = document.getElementById('coach-body');
  const stepEl = document.getElementById('coach-step');
  const skipBtn = document.getElementById('coach-skip');

  let active = false;
  let stepIndex = 0;
  // 'tutorial' = the first-run lesson; 'nudge' = a transient idle hint.
  let mode: 'tutorial' | 'nudge' = 'tutorial';
  let nudgeTimer = 0;

  function seen(): boolean {
    try { return window.localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
  }

  function markSeen(): void {
    try { window.localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
  }

  function render(): void {
    const step = STEPS[stepIndex];
    if (!step) { hide(); return; }
    mode = 'tutorial';
    if (view) {
      view.setTutorialCard({
        kicker: step.kicker,
        title: step.title,
        body: step.body,
        stepText: `${stepIndex + 1} / ${STEPS.length}`,
        skipLabel: 'Skip tutorial',
        onSkip: finish,
      });
      return;
    }
    if (!root || !kickerEl || !titleEl || !bodyEl || !stepEl) return;
    kickerEl.textContent = step.kicker;
    titleEl.textContent = step.title;
    bodyEl.textContent = step.body;
    stepEl.textContent = `${stepIndex + 1} / ${STEPS.length}`;
    if (skipBtn) skipBtn.textContent = 'Skip tutorial';
    root.classList.add('coach-show');
    root.setAttribute('aria-hidden', 'false');
  }

  function hide(): void {
    view?.setTutorialCard(null);
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
      // A nudge's "Got it" only dismisses that nudge; the tutorial's skip
      // retires the whole lesson permanently.
      if (mode === 'nudge') hideNudgeNow();
      else finish();
    });
  }

  return {
    isActive() {
      return active;
    },
    hasSeenTutorial() {
      return seen();
    },
    beginRun() {
      if (seen()) { active = false; hide(); return; }
      active = true;
      stepIndex = 0;
      render();
    },
    report(event) {
      if (!active) return;
      const step = STEPS[stepIndex];
      if (!step || step.advanceOn !== event) return;
      stepIndex += 1;
      if (stepIndex >= STEPS.length) {
        // Final beat done: celebrate briefly, then retire the coach.
        if (view) {
          view.setTutorialCard({
            kicker: 'Onboarding complete',
            title: 'You have the basics',
            body: 'Seed, feed, steer, and discover. The Notebook logs every breed you find.',
            stepText: `${STEPS.length} / ${STEPS.length}`,
            skipLabel: 'Skip tutorial',
            onSkip: finish,
          });
        }
        if (titleEl && bodyEl && kickerEl && stepEl && root) {
          kickerEl.textContent = 'Onboarding complete';
          titleEl.textContent = 'You have the basics';
          bodyEl.textContent = 'Seed, feed, steer, and discover. The Notebook logs every breed you find.';
          stepEl.textContent = `${STEPS.length} / ${STEPS.length}`;
          root.classList.add('coach-show');
          root.setAttribute('aria-hidden', 'false');
        }
        window.setTimeout(() => finish(), 4200);
        active = false;
        return;
      }
      render();
    },
    dismiss() {
      finish();
    },
    showNudge(title, body, opts = {}) {
      // Regular nudges are for players past the tutorial. Onboarding rescue
      // nudges can temporarily interrupt and then restore the tutorial card.
      if (active && !opts.interruptTutorial) return;
      if (view) {
        mode = 'nudge';
        view.setTutorialCard({
          kicker: 'Lab Assistant',
          title,
          body,
          stepText: '',
          skipLabel: 'Got it',
          onSkip: hideNudgeNow,
        });
        window.clearTimeout(nudgeTimer);
        nudgeTimer = window.setTimeout(() => hideNudgeNow(), 9000);
        return;
      }
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
}
