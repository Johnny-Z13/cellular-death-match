import { describe, expect, it } from 'vitest';
import { OBJECTIVES, objectiveForEpoch } from '../../src/content/objectives';

describe('OBJECTIVES', () => {
  it('defines ecology-first objective kinds', () => {
    expect(OBJECTIVES.map((objective) => objective.kind)).toEqual([
      'stabilize_breed',
      'understand_recipe',
      'understand_recipe',
      'understand_recipe',
      'apply_recipe',
      'dominant_archetype',
    ]);
  });

  it('does not expose color-team language in player-facing copy', () => {
    const forbidden = /\b(red|blue|lineage|lineages)\b/i;
    for (const objective of OBJECTIVES) {
      expect(objective.name).not.toMatch(forbidden);
      expect(objective.description).not.toMatch(forbidden);
      expect(objective.target).not.toMatch(forbidden);
      expect(objective.hint ?? '').not.toMatch(forbidden);
    }
  });

  it('gives every objective a player-facing hint', () => {
    for (const objective of OBJECTIVES) {
      expect(objective.hint ?? '').toMatch(/\S/);
    }
  });

  it('keeps the opening dish hint focused on egg and nutrient concepts', () => {
    const opening = objectiveForEpoch(0);

    expect(opening.kind).toBe('stabilize_breed');
    expect(opening.hint).toContain('Swarmlet');
    expect(opening.hint).toContain('Nutrient');
    expect(opening.hint).not.toContain('Splitter');
    expect(opening.hint).not.toContain('Toxin');
  });

  it('cycles objectives by epoch index', () => {
    expect(objectiveForEpoch(0)).toBe(OBJECTIVES[0]);
    expect(objectiveForEpoch(OBJECTIVES.length)).toBe(OBJECTIVES[0]);
  });
});
