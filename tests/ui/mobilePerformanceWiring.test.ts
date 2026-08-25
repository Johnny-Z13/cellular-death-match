// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mainSource = readFileSync('src/main.ts', 'utf8');
const renderSource = readFileSync('src/ui/render.ts', 'utf8');
const titleSource = readFileSync('src/ui/titleAutomata.ts', 'utf8');

describe('mobile performance wiring', () => {
  it('keeps fixed simulation ticks while pacing presentation frames', () => {
    expect(mainSource).toContain('shouldRenderFrame(lastRenderAt, now, visualProfile.targetRenderFps)');
    expect(mainSource).toContain('const ticksToRun = holdingForFirstEgg ? 0 : simClock.consumeTicks(now);');
    expect(mainSource).toContain('additiveBloom: visualProfile.additiveBloom');
    expect(renderSource).toContain('if (additiveBloom) {');
  });

  it('resets wall-clock time and ambience when the page is backgrounded', () => {
    expect(mainSource).toContain("document.addEventListener('visibilitychange'");
    expect(mainSource).toContain('if (document.hidden) {');
    expect(mainSource).toContain('simClock.reset(performance.now())');
    expect(mainSource).toContain('uiAudio.stopAmbience()');
  });

  it('caps title animation drawing on mobile and skips hidden work', () => {
    expect(titleSource).toContain("window.matchMedia('(max-width: 899px)').matches");
    expect(titleSource).toContain('&& !document.hidden');
    expect(titleSource).toContain('1000 / 30');
  });
});
