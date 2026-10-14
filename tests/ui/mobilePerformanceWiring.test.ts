// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mainSource = readFileSync('src/main.ts', 'utf8');
const renderSource = readFileSync('src/ui/render.ts', 'utf8');
const titleSource = readFileSync('src/ui/titleDish.ts', 'utf8');

describe('mobile performance wiring', () => {
  it('keeps fixed simulation ticks while pacing presentation frames', () => {
    expect(mainSource).toContain('shouldRenderFrame(lastRenderAt, now, visualProfile.targetRenderFps)');
    expect(mainSource).toContain('const ticksToRun = holdingForFirstInstruction ? 0 : simClock.consumeTicks(now);');
    expect(mainSource).toContain('additiveBloom: visualProfile.additiveBloom');
    expect(renderSource).toContain('if (additiveBloom) {');
  });

  it('resets wall-clock time and ambience when the page is backgrounded', () => {
    expect(mainSource).toContain("document.addEventListener('visibilitychange'");
    expect(mainSource).toContain('if (document.hidden) {');
    expect(mainSource).toContain('simClock.reset(performance.now())');
    expect(mainSource).toContain('uiAudio.stopAmbience()');
  });

  it('runs the title dish at half pace on a fixed clock and skips hidden work', () => {
    expect(titleSource).toContain('ticksPerSecond: 30');
    expect(titleSource).toContain('createFixedStepClock({ ticksPerSecond: T.ticksPerSecond');
    expect(titleSource).toContain("if (!screen.classList.contains('visible') || document.hidden)");
    expect(titleSource).toContain('additiveBloom: profile.additiveBloom');
  });
});
