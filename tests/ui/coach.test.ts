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
    expect(coachSource).toContain("advanceOn: 'paste-drawn'");
    expect(coachSource).toContain("advanceOn: 'objective-complete'");
    expect(mainSource).toContain("coach.report('egg-placed')");
    expect(mainSource).toContain("coach.report('nutrient-used')");
    expect(mainSource).toContain("coach.report('paste-drawn')");
    expect(mainSource).toContain("coach.report('objective-complete')");
  });

  it('shows on the first epoch of a first run only, persisted via localStorage', () => {
    expect(coachSource).toContain("const SEEN_KEY = 'cdm.coach.seen'");
    expect(coachSource).toContain('if (seen()) { active = false; hide(); return; }');
    expect(mainSource).toContain('if (run.getState().fightIndex === 0) coach.beginRun()');
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
