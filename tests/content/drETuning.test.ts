import { describe, expect, it } from 'vitest';
import { DR_E_FACE, DR_E_VOICE, FACE_DIRECTIONS, FACE_EXPRESSIONS } from '../../src/content/drETuning';

describe('Dr. E tuning', () => {
  it('keeps the voice inside the mumble engine ranges', () => {
    expect(['bog', 'glass', 'rust', 'bubble']).toContain(DR_E_VOICE.voice);
    expect(DR_E_VOICE.pitch).toBeGreaterThanOrEqual(-12);
    expect(DR_E_VOICE.pitch).toBeLessThanOrEqual(12);
    expect(DR_E_VOICE.pace).toBeGreaterThanOrEqual(0.65);
    expect(DR_E_VOICE.pace).toBeLessThanOrEqual(1.5);
    expect(DR_E_VOICE.weird).toBeGreaterThanOrEqual(0);
    expect(DR_E_VOICE.weird).toBeLessThanOrEqual(1);
    expect(DR_E_VOICE.gain).toBeGreaterThanOrEqual(0);
    expect(DR_E_VOICE.gain).toBeLessThanOrEqual(1);
  });

  it('defines the six v1 expressions with finite face parameters', () => {
    expect(Object.keys(FACE_EXPRESSIONS).sort()).toEqual(['delighted', 'happy', 'neutral', 'surprised', 'thinking', 'worried']);
    for (const params of Object.values(FACE_EXPRESSIONS)) {
      for (const value of Object.values(params)) expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('defines four look-test directions with valid colours', () => {
    expect(Object.keys(FACE_DIRECTIONS).sort()).toEqual(['blob', 'colony', 'loupe', 'merge']);
    for (const [id, direction] of Object.entries(FACE_DIRECTIONS)) {
      expect(direction.id).toBe(id);
      const colours = [direction.body, direction.eye, direction.pupil, direction.mouth, direction.cheek, direction.brow, direction.lens];
      for (const colour of colours) {
        if (colour === null) continue;
        for (const channel of colour) expect(channel >= 0 && channel <= 255).toBe(true);
      }
    }
  });

  it('keeps blink and grid settings sane', () => {
    expect(DR_E_FACE.gridSize).toBeGreaterThanOrEqual(24);
    expect(DR_E_FACE.blinkMinMs).toBeLessThan(DR_E_FACE.blinkMaxMs);
  });
});
