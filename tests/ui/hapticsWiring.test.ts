// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mainSource = readFileSync('src/main.ts', 'utf8');

describe('haptic event wiring', () => {
  it('uses semantic cues for important game moments', () => {
    expect(mainSource).toContain("haptics.play('impact')");
    expect(mainSource).toContain("haptics.play('discovery')");
    expect(mainSource).toContain("haptics.play('success')");
    expect(mainSource).toContain("haptics.play('warning')");
    expect(mainSource).toContain("haptics.play(succeeded ? 'success' : 'failure')");
  });
});
