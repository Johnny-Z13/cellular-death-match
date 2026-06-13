// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('src/styles.css', 'utf8');
const coachSource = readFileSync('src/ui/coach.ts', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');

describe('onboarding coach', () => {
  it('ships a skippable coach panel in the HTML', () => {
    expect(html).toContain('id="coach"');
    expect(html).toContain('id="coach-kicker"');
    expect(html).toContain('id="coach-title"');
    expect(html).toContain('id="coach-body"');
    expect(html).toContain('id="coach-step"');
    expect(html).toContain('id="coach-skip"');
  });

  it('advances on real gameplay beats, not timers', () => {
    expect(coachSource).toContain("advanceOn: 'egg-placed'");
    expect(coachSource).toContain("advanceOn: 'nutrient-used'");
    expect(coachSource).toContain("advanceOn: 'objective-complete'");
    expect(coachSource).toContain('Tap open dish space to add another Swarmlet culture.');
    expect(coachSource).toContain('Feed the colony');
    expect(mainSource).toContain("coach.report('egg-placed')");
    expect(mainSource).toContain("coach.report('nutrient-used')");
    expect(mainSource).toContain("coach.report('objective-complete')");
  });

  it('shows on the first epoch of a first run only, persisted via localStorage', () => {
    expect(coachSource).toContain("const SEEN_KEY = 'cdm.coach.seen.v2'");
    expect(coachSource).toContain('hasSeenTutorial(): boolean;');
    expect(coachSource).toContain('if (seen()) { active = false; hide(); return; }');
    expect(mainSource).toContain('if (runState.fightIndex === 0) coach.beginRun()');
    expect(mainSource).toContain('shouldUseOnboardingDishForCurrentStage(runState.fightIndex, false)');
    expect(mainSource).toContain('run.getOnboardingSpawnList()');
  });

  it('nudges idle players with the objective hint, capped and dismissible', () => {
    // The nudge reuses the coach card in a second mode: "Got it" dismisses
    // just the nudge, never marking the tutorial as seen.
    expect(coachSource).toContain('showNudge(title: string, body: string): void;');
    expect(coachSource).toContain("if (mode === 'nudge') hideNudgeNow();");
    expect(coachSource).toContain("kickerEl.textContent = 'Lab Assistant';");
    expect(mainSource).toContain('const NUDGE_IDLE_TICKS = 60 * 22;');
    expect(mainSource).toContain('const MAX_NUDGES_PER_EPOCH = 2;');
    expect(mainSource).toContain('function maybeNudgeIdlePlayer(');
    expect(mainSource).toContain('if (objectiveComplete || coach.isActive()) return;');
    expect(mainSource).toContain('function registerPlayerAction(): void {');
    expect(mainSource).toContain('coach.hideNudge();');
  });

  it('never blocks interactive panels and hides in presentation mode', () => {
    // Bottom-centre on desktop (over the non-interactive log zone); under the
    // HUD on phones. Hidden in presentation mode like other chrome.
    expect(css).toContain('.coach {');
    expect(css).toContain('.coach.coach-show');
    expect(css).toContain('.presentation-mode .coach');
    const mobileBlockStart = css.indexOf('@media (max-width: 899px)');
    expect(css.indexOf('top: calc(92px + env(safe-area-inset-top))')).toBeGreaterThan(mobileBlockStart);
  });
});
