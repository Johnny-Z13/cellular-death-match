import { describe, expect, it } from 'vitest';
import { OBJECTIVES, objectiveForEpoch } from '../../src/content/objectives';

describe('OBJECTIVES', () => {
  it('defines ecology-first objective kinds', () => {
    expect(OBJECTIVES.map((objective) => objective.kind)).toEqual([
      'discover_breed',
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
      expect(objective.hint ?? '').not.toMatch(forbidden);
    }
  });

  it('gives every objective a player-facing hint', () => {
    for (const objective of OBJECTIVES) {
      expect(objective.hint ?? '').toMatch(/\S/);
    }
  });

  it('gives the opening dish both a breed recipe and a volatile catalyst clue', () => {
    const opening = objectiveForEpoch(0);

    expect(opening.kind).toBe('discover_breed');
    expect(opening.hint).toContain('Swarmlet and Splitter');
    expect(opening.hint).toContain('Nutrient');
    expect(opening.hint).toContain('Toxin');
    expect(opening.hint).toContain('egg');
  });

  it('cycles objectives by epoch index', () => {
    expect(objectiveForEpoch(0)).toBe(OBJECTIVES[0]);
    expect(objectiveForEpoch(OBJECTIVES.length)).toBe(OBJECTIVES[0]);
  });
});
