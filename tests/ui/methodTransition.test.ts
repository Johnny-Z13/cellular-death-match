// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');
const screensSource = readFileSync('src/ui/screens.ts', 'utf8');
const css = readFileSync('src/styles.css', 'utf8');

describe('between-trial Method transition', () => {
  it('uses the full-screen Dr. E surface for one meaningful autonomy handoff', () => {
    expect(html).toContain('id="screen-method-intro"');
    expect(html).toContain('role="dialog" aria-modal="true" aria-labelledby="method-intro-title"');
    expect(html).toContain('Right. You’re on your own now.');
    expect(html).toContain('I’ll check in from time to time.');
    expect(html).not.toContain('Well done.');
    expect(html).toContain('id="method-intro-continue"');
    expect(html).toContain('Choose a Method ›');
    expect(css).toContain('.method-intro-screen {');
    expect(css).toContain('calc(22px + env(safe-area-inset-bottom))');
  });

  it('shows the autonomy handoff only at the exact-to-hypothesis boundary', () => {
    expect(mainSource).toContain("const AUTONOMY_HANDOFF_TRIAL_INDEX = 1;");
    expect(mainSource).toContain("state.phase === 'upgrade_pick'");
    expect(mainSource).toContain('state.fightIndex === AUTONOMY_HANDOFF_TRIAL_INDEX');
    expect(mainSource).toContain("screens.show(shouldShowAutonomyHandoff() ? 'method-intro' : 'pick');");
    expect(mainSource).toContain('screens.onMethodIntroContinue(() => {');
    expect(mainSource).toContain('acknowledgeAutonomyHandoff();\n  uiAudio.play');
    expect(mainSource).not.toContain('pendingMethodIntroduction');
    expect(screensSource).toContain("name === 'method-intro'");
    expect(screensSource).toContain('? methodIntroContinue');
  });

  it('keeps the Method chooser concise and action-led', () => {
    expect(html).toContain('<h2 id="pick-title" class="screen-title">Choose a Method</h2>');
    expect(html).toContain('<p class="method-sub">Pick one lasting adjustment.</p>');
    expect(html).not.toContain('Back at the lab bench');
    expect(html).not.toContain('Your next trial starts immediately');
    expect(html).not.toContain('id="method-handoff"');
    expect(screensSource).toContain("action.textContent = 'Choose';");
    expect(screensSource).not.toContain("kind.textContent = 'Method bonus';");
    expect(screensSource).not.toContain("action.textContent = 'Choose this method';");
  });
});
