// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { normalizeLine, plan, synthesize } from '../../src/audio/mumble';

// The engine this game ports, kept verbatim so any drift shows up here.
const requireCjs = createRequire(import.meta.url);
const reference = requireCjs('../fixtures/mumble/prototype-core.cjs') as {
  plan(text: string, pace?: number): unknown;
  synthesize(text: string, settings: object): { samples: Float32Array; peak: number };
};

const LINES = [
  'Oh! A visitor!',
  "I'm Dr. E. I'm a merge.",
  'My friends came apart. Help me find them?',
  'Closer... closer... hold it!',
  'AGNES, Agnes and Agnès.',
  'Hmm. Brr? Tsk tsk.',
  'Swarmlet 42 meets Bloom Mass, twice.',
  'That’s Twin Bloom.\nFriend number one.',
];

describe('mumble engine', () => {
  it('plans every line exactly as the prototype does', () => {
    for (const line of LINES) {
      for (const pace of [0.65, 1, 1.5]) expect(plan(line, pace)).toEqual(reference.plan(line, pace));
    }
  });

  it('renders the same samples as the prototype for every voice', () => {
    for (const voice of ['bog', 'glass', 'rust', 'bubble'] as const) {
      const settings = { voice, weird: 0.55, pitch: 3, pace: 1.1 };
      const mine = synthesize(LINES[0]!, settings);
      const theirs = reference.synthesize(LINES[0]!, settings);
      expect(mine.samples.length).toBe(theirs.samples.length);
      let worst = 0;
      for (let i = 0; i < mine.samples.length; i++) worst = Math.max(worst, Math.abs(mine.samples[i]! - theirs.samples[i]!));
      expect(worst).toBe(0);
      expect(mine.peak).toBe(theirs.peak);
      expect(mine.peak).toBeLessThanOrEqual(0.7);
    }
  });

  it('rejects what the prototype rejects', () => {
    expect(() => plan('')).toThrow('Type a name');
    expect(() => plan('...!?')).toThrow('Type a name');
    expect(() => plan('a'.repeat(181))).toThrow('180');
    expect(() => plan('hello', 2)).toThrow('Pace');
  });

  it('says a name the same way wherever it appears', () => {
    const shape = (events: ReturnType<typeof plan>['events']) => events.map((e) => [e.vowel, e.step, e.seed]);
    const alone = shape(plan('Agnes').events);
    const inLine = shape(plan('Well, hello Agnes').events.filter((e) => e.wordIndex === 2));
    expect(inLine).toEqual(alone);
  });

  it('spells script punctuation the way the engine understands', () => {
    expect(normalizeLine('Closer… closer… hold it!')).toBe('Closer... closer... hold it!');
    expect(normalizeLine('Wait — no – yes')).toBe('Wait , no , yes');
    expect(plan(normalizeLine('Closer… hold it!')).duration).toBeGreaterThan(plan('Closer hold it!').duration);
  });
});
