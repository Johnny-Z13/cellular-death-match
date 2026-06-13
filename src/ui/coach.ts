// First-run onboarding coach. A small, skippable, deep-lab-voiced guide that
// advances as it observes the player's real actions — never a blocking modal.
// Event-driven: main.ts reports gameplay beats (egg placed, reagent used,
// objective complete) and the coach walks its step list, celebrating
// each ("Well done — you discovered X. To use it, do Y."). First run only,
// persisted via localStorage; a Skip control dismisses it for good.

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

const SEEN_KEY = 'cdm.coach.seen';

// The opening lesson: start with Swarmlet, add Splitter, feed the pair, finish.
const STEPS: readonly CoachStep[] = [
  {
    id: 'splitter',
    advanceOn: 'egg-placed',
    kicker: 'Specimen 01 · Pairing',
    title: 'Add a second culture',
    body: 'A Swarmlet is already alive in the dish. Pick Splitter from Lifeforms, then tap near the Swarmlet.',
  },
  {
    id: 'feed',
    advanceOn: 'nutrient-used',
    kicker: 'Specimen 01 · Feeding',
    title: 'Feed the pairing',
    body: 'Pick Nutrient from the rack, then tap between Swarmlet and Splitter. Watch for a new lifeform.',
  },
  {
    id: 'objective',
    advanceOn: 'objective-complete',
    kicker: 'Specimen 01 · Objective',
    title: 'Complete the experiment',
    body: 'Read the objective up top. Combine cultures and reagents to meet it — then press End when ready.',
  },
];

export interface Coach {
  isActive(): boolean;
  hasSeenTutorial(): boolean;
  beginRun(): void;        // call when an arena epoch starts
  report(event: CoachEvent): void;
  dismiss(): void;         // skip for good
  // Idle nudge: a one-off contextual hint reusing the same card. Auto-hides;
  // "Got it" dismisses just this nudge (never marks the tutorial seen).
  showNudge(title: string, body: string): void;
  hideNudge(): void;
}

export function createCoach(): Coach {
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
    if (!root || !kickerEl || !titleEl || !bodyEl || !stepEl) return;
    const step = STEPS[stepIndex];
    if (!step) { hide(); return; }
    mode = 'tutorial';
    kickerEl.textContent = step.kicker;
    titleEl.textContent = step.title;
    bodyEl.textContent = step.body;
    stepEl.textContent = `${stepIndex + 1} / ${STEPS.length}`;
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

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      // A nudge's "Got it" only dismisses that nudge; the tutorial's skip
      // retires the whole lesson permanently.
      if (mode === 'nudge') hideNudgeNow();
      else finish();
    });
  }

  function hideNudgeNow(): void {
    window.clearTimeout(nudgeTimer);
    if (mode === 'nudge') hide();
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
        // Final beat done — celebrate briefly, then retire the coach.
        if (titleEl && bodyEl && kickerEl && stepEl && root) {
          kickerEl.textContent = 'Onboarding complete';
          titleEl.textContent = 'You have the basics';
          bodyEl.textContent = 'Seed, feed, steer, and discover. The Notebook logs every breed you find. Good luck.';
          stepEl.textContent = `${STEPS.length} / ${STEPS.length}`;
          root.classList.add('coach-show');
        }
        window.setTimeout(() => finish(), 4200);
        active = false; // stop accepting further events, but leave the final card up
        return;
      }
      render();
    },
    dismiss() {
      finish();
    },
    showNudge(title, body) {
      // Never interrupt the tutorial; nudges are for players past it.
      if (active || !root || !kickerEl || !titleEl || !bodyEl || !stepEl) return;
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
