// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const screensSource = readFileSync('src/ui/screens.ts', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');
const css = readFileSync('src/styles.css', 'utf8');

describe('button hint pulse', () => {
  it('exposes a reusable button hint API and pulse styles', () => {
    expect(screensSource).toContain("export type ButtonHintTarget = ToolId | 'notebook';");
    expect(screensSource).toContain("setButtonHint(target: ButtonHintTarget | null, level?: ButtonHintLevel): void;");
    expect(screensSource).toContain('setAgitateUnlocked(unlocked: boolean): void;');
    expect(screensSource).toContain("button.classList.toggle('button-hint-pulse'");
    expect(screensSource).toContain("button.classList.toggle('button-ready-pulse'");
    expect(css).toContain('.button-hint-pulse');
    expect(css).toContain('@keyframes button-hint-breathe');
    expect(css).toContain('@keyframes button-hint-sheen');
    expect(css).toContain('.button-ready-pulse');
  });

  it('drives each Professor-directed tool hint from the current precise beat', () => {
    expect(mainSource).toContain('const coachButtonHint = coach.getCurrentButtonHint();');
    expect(mainSource).toContain("screens.setButtonHint(coachButtonHint as ToolId, 'hint');");
    expect(mainSource).toContain('screens.setAgitateUnlocked(run.getState().fightIndex >= 3);');
    expect(mainSource).toContain('updateButtonHint();');
    expect(mainSource).toContain('coach.report(`${tool}-selected`)');
    expect(mainSource).toContain('coach.report(`${selectedTool}-used`)');
  });
});
