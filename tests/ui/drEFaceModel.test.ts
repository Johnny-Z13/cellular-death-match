import { describe, expect, it } from 'vitest';
import { DR_E_FACE, FACE_DIRECTIONS, FACE_EXPRESSIONS } from '../../src/content/drETuning';
import { BODY_CELL_BASE, PART, blendFace, rasterizeFace, speechLevelAt } from '../../src/ui/drEFace/faceModel';

const N = DR_E_FACE.gridSize;
const count = (grid: Uint8Array, test: (part: number) => boolean) => grid.reduce((n, part) => n + (test(part) ? 1 : 0), 0);
const neutral = FACE_EXPRESSIONS.neutral;

describe('Dr. E face model', () => {
  it('draws a body of roughly the configured area', () => {
    const grid = rasterizeFace(FACE_DIRECTIONS.blob, neutral, DR_E_FACE, 0, true);
    expect(grid.length).toBe(N * N);
    const area = Math.PI * (neutral.bodyRadius * N) ** 2;
    const filled = count(grid, (p) => p !== PART.empty);
    expect(filled).toBeGreaterThan(area * 0.85);
    expect(filled).toBeLessThan(area * 1.15);
  });

  it('shuts the eyes when eyeOpen is 0', () => {
    const grid = rasterizeFace(FACE_DIRECTIONS.blob, { ...neutral, eyeOpen: 0 }, DR_E_FACE, 0, true);
    expect(count(grid, (p) => p === PART.eye)).toBe(0);
    expect(count(grid, (p) => p === PART.pupil)).toBeGreaterThan(0);
  });

  it('opens the mouth wider as mouthOpen rises', () => {
    const closed = rasterizeFace(FACE_DIRECTIONS.blob, neutral, DR_E_FACE, 0, true);
    const open = rasterizeFace(FACE_DIRECTIONS.blob, { ...neutral, mouthOpen: 1 }, DR_E_FACE, 0, true);
    // The tongue is part of an open mouth.
    const mouth = (p: number) => p === PART.mouth || p === PART.tongue;
    expect(count(open, mouth)).toBeGreaterThan(3 * count(closed, mouth));
  });

  it('is deterministic for the same inputs and time', () => {
    const a = rasterizeFace(FACE_DIRECTIONS.merge, FACE_EXPRESSIONS.happy, DR_E_FACE, 1234, false);
    const b = rasterizeFace(FACE_DIRECTIONS.merge, FACE_EXPRESSIONS.happy, DR_E_FACE, 1234, false);
    expect(a).toEqual(b);
  });

  it('holds the membrane still under reduced motion', () => {
    const a = rasterizeFace(FACE_DIRECTIONS.blob, neutral, DR_E_FACE, 0, true);
    const b = rasterizeFace(FACE_DIRECTIONS.blob, neutral, DR_E_FACE, 5000, true);
    expect(a).toEqual(b);
  });

  it('flickers only at the membrane, never the features', () => {
    const a = rasterizeFace(FACE_DIRECTIONS.blob, neutral, DR_E_FACE, 0, false);
    const b = rasterizeFace(FACE_DIRECTIONS.blob, neutral, DR_E_FACE, 900, false);
    const changed = a.reduce((n, part, i) => n + (part !== b[i] ? 1 : 0), 0);
    const body = count(a, (p) => p === PART.body);
    expect(changed).toBeGreaterThan(0);
    expect(changed).toBeLessThan(body * 0.25);
    const features = (g: Uint8Array) => count(g, (p) => p === PART.eye || p === PART.pupil || p === PART.mouth);
    expect(features(b)).toBe(features(a));
  });

  it('gives the loupe direction a lens ring and the blob none', () => {
    const loupe = rasterizeFace(FACE_DIRECTIONS.loupe, neutral, DR_E_FACE, 0, true);
    const blob = rasterizeFace(FACE_DIRECTIONS.blob, neutral, DR_E_FACE, 0, true);
    expect(count(loupe, (p) => p === PART.lens)).toBeGreaterThan(0);
    expect(count(blob, (p) => p === PART.lens)).toBe(0);
  });

  it('splits the colony body into its sub-cells', () => {
    const grid = rasterizeFace(FACE_DIRECTIONS.colony, neutral, DR_E_FACE, 0, true);
    const ids = new Set([...grid].filter((p) => p >= BODY_CELL_BASE));
    expect(ids.size).toBe(FACE_DIRECTIONS.colony.bodyCells);
  });

  it('opens the mouth with each syllable and closes between them', () => {
    const speech = { events: [{ start: 1, duration: 0.5, amplitude: 1 }, { start: 2, duration: 0.5, amplitude: 1.2 }] };
    expect(speechLevelAt(speech, 0.9)).toBe(0);
    expect(speechLevelAt(speech, 1.2)).toBeGreaterThan(0.99);
    expect(speechLevelAt(speech, 1.6)).toBe(0);
    expect(speechLevelAt(speech, 2.2)).toBe(1);
  });

  it('blends between expressions', () => {
    const mid = blendFace(FACE_EXPRESSIONS.neutral, FACE_EXPRESSIONS.surprised, 0.5);
    expect(mid.browLift).toBeCloseTo(0.5);
    expect(blendFace(FACE_EXPRESSIONS.neutral, FACE_EXPRESSIONS.surprised, 1)).toEqual(FACE_EXPRESSIONS.surprised);
  });
});
