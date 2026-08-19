// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');
const styles = readFileSync('src/styles.css', 'utf8');
const mergeLabSource = readFileSync('src/ui/mergeLabExperience.ts', 'utf8');
const packageJson = readFileSync('package.json', 'utf8');

describe('Merge Lab CrazyGames route', () => {
  it('marks Merge Lab launch before the app bundle renders the title screen', () => {
    expect(html).toContain("document.documentElement.dataset.launch = 'merge-lab'");
    expect(html).toContain("if (document.documentElement.dataset.launch !== 'merge-lab')");
    expect(html).toContain('fonts.googleapis.com');
    expect(styles).toContain('html[data-launch="merge-lab"] .screen-title-screen');
  });

  it('keeps the existing route as default and launches Merge Lab only through the route gate', () => {
    expect(mainSource.indexOf('shouldLaunchMergeLab(window.location, runtimeStorage)'))
      .toBeLessThan(mainSource.indexOf('const run = createRun'));
    expect(mainSource).toContain('shouldLaunchMergeLab(window.location, runtimeStorage)');
    expect(mainSource).toContain("namespace: 'cellular-death-match.cg.v1'");
    expect(mainSource).toContain('startMergeLabExperience({');
  });

  it('supports phone-friendly onboarding reset before Merge Lab route selection', () => {
    expect(mainSource.indexOf('shouldResetOnboardingFromLocation(window.location)'))
      .toBeLessThan(mainSource.indexOf('shouldLaunchMergeLab(window.location, runtimeStorage)'));
    expect(mainSource).toContain('stripOnboardingResetParamsFromUrl(new URL(window.location.href))');
  });

  it('renders the required first playable HUD language', () => {
    expect(mergeLabSource).toContain('Merge cells.');
    expect(mergeLabSource).toContain('Feed it.');
    expect(mergeLabSource).toContain('Atlas');
    expect(mergeLabSource).not.toContain('Incubator locked');
  });

  it('records the first-frame and first-reward funnel events', () => {
    expect(mergeLabSource).toContain("options.analytics.record('first_frame'");
    expect(mergeLabSource).toContain("options.analytics.record('gameplay_start'");
    expect(readFileSync('src/game/mergeLab.ts', 'utf8')).toContain("analytics.record('first_reward'");
  });

  it('has a repeatable browser QA gate for the CrazyGames route', () => {
    expect(packageJson).toContain('"qa:merge-lab": "node scripts/qa-merge-lab.mjs"');
    expect(readFileSync('scripts/qa-merge-lab.mjs', 'utf8')).toContain('fonts.googleapis.com');
    expect(readFileSync('scripts/qa-merge-lab.mjs', 'utf8')).toContain('cellular-death-match.cg.v1.save');
  });

  it('suppresses classic debug, fullscreen, and options UI in Merge Lab mode', () => {
    expect(mergeLabSource).toContain("'.fullscreen-button'");
    expect(mergeLabSource).toContain("'.options-button'");
    expect(mergeLabSource).toContain("'.options-panel'");
    expect(styles).toContain('.layout.merge-lab-active .fullscreen-button');
    expect(styles).toContain('.layout.merge-lab-active .options-button');
  });
});
