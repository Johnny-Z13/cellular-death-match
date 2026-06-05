import { describe, expect, it } from 'vitest';
import { OBJECTIVES, objectiveForEpoch } from '../../src/content/objectives';

describe('OBJECTIVES', () => {
  it('defines ecology-first objective kinds', () => {
    expect(OBJECTIVES.map((objective) => objective.kind)).toEqual([
      'preserve_grazers',
      'breed_archetype',
      'controlled_reaction',
      'balanced_ecology',
      'dominant_archetype',
    ]);
  });

  it('does not expose color-team language in player-facing copy', () => {
    const forbidden = /\b(red|blue|lineage|lineages)\b/i;
    for (const objective of OBJECTIVES) {
      expect(objective.name).not.toMatch(forbidden);
      expect(objective.description).not.toMatch(forbidden);
      expect(objective.target).not.toMatch(forbidden);
    }
  });

  it('cycles objectives by epoch index', () => {
    expect(objectiveForEpoch(0)).toBe(OBJECTIVES[0]);
    expect(objectiveForEpoch(OBJECTIVES.length)).toBe(OBJECTIVES[0]);
  });
});
