import { describe, expect, it } from 'vitest';
import { normalizeLine, plan } from '../../src/audio/mumble';
import { revealLengthAt } from '../../src/ui/speechReveal';

describe('speech reveal', () => {
  it('shows each word, its punctuation and space from the moment it is spoken', () => {
    const text = 'Oh! A visitor!';
    const p = plan(normalizeLine(text));
    expect(revealLengthAt(text, p, 0)).toBe(0);
    expect(revealLengthAt(text, p, p.words[0]!.start)).toBe('Oh! '.length);
    expect(revealLengthAt(text, p, p.words[1]!.start)).toBe('Oh! A '.length);
    expect(revealLengthAt(text, p, p.duration)).toBe(text.length);
  });

  it('keeps the displayed ellipsis while the voice pauses on it', () => {
    const text = 'Closer… closer… hold it!';
    const p = plan(normalizeLine(text));
    expect(revealLengthAt(text, p, p.words[0]!.start)).toBe('Closer… '.length);
    expect(revealLengthAt(text, p, p.words[1]!.start - 0.001)).toBe('Closer… '.length);
    expect(p.words[1]!.start - p.words[0]!.end).toBeGreaterThan(0.4);
  });

  it('never splits an emoji and skips it in the voice', () => {
    const text = 'Hi 🧫 friend!';
    const p = plan(normalizeLine(text));
    expect(p.words.map((w) => w.text)).toEqual(['Hi', 'friend']);
    expect(text.slice(0, revealLengthAt(text, p, p.words[1]!.start - 0.001))).toBe('Hi 🧫 ');
  });
});
