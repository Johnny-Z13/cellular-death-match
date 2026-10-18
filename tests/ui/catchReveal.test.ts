// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATCH_TIMING } from '../../src/ui/catchReveal';

const html = readFileSync('index.html', 'utf8');
const fxSource = readFileSync('src/ui/fx.ts', 'utf8');
const speechSource = readFileSync('src/ui/drESpeech.ts', 'utf8');

describe('the catch reveal', () => {
  it('plays its beats in order: wobbles, crack, burst, name, card, cheer', () => {
    const T = CATCH_TIMING;
    const beats = [...T.wobbleAtMs, T.crackAtMs, T.burstAtMs, T.nameAtMs, T.cardAtMs, T.cheerAtMs];
    expect(beats).toEqual([...beats].sort((a, b) => a - b));
    expect(new Set(beats).size).toBe(beats.length);
  });

  it('gives Dr. E a face and a voiced line on the reveal', () => {
    expect(html).toContain('data-dre-slot="catch"');
    expect(html).toContain('id="catch-line"');
    expect(speechSource).toContain("watch(document.getElementById('catch-line'));");
  });

  it('finishes the sequence on the first tap and only then continues', () => {
    const advance = fxSource.slice(fxSource.indexOf('function advanceGenome'), fxSource.indexOf('function isCompactMobile'));
    expect(advance.indexOf('catchStage.settle()')).toBeGreaterThan(-1);
    expect(advance.indexOf('catchStage.settle()')).toBeLessThan(advance.indexOf('finishActiveGenome?.()'));
  });
});
