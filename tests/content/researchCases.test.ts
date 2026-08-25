import { describe, expect, it } from 'vitest';
import { OBJECTIVES } from '../../src/content/objectives';
import { COMMON_COLD_CASE, trialForIndex } from '../../src/content/researchCases';

describe('Common Cold research Case', () => {
  it('defines five sequential Petri-dish Trials', () => {
    expect(COMMON_COLD_CASE.trials).toHaveLength(5);
    expect(COMMON_COLD_CASE.trials.map((trial) => trial.number)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(COMMON_COLD_CASE.trials.map((trial) => trial.id)).size).toBe(5);
  });

  it('keeps authored Trial metadata aligned with the fixed objective sequence', () => {
    for (const [index, trial] of COMMON_COLD_CASE.trials.entries()) {
      expect(OBJECTIVES[index]?.kind).toBe(trial.objectiveKind);
      expect(OBJECTIVES[index]?.name).toBe(trial.name);
      expect(trial.hypothesis.length).toBeGreaterThan(20);
      expect(trial.introducedFeature.length).toBeGreaterThan(0);
    }
    expect(OBJECTIVES[1]?.sustainTicks).toBe(60 * 12);
  });

  it('clamps UI lookups to an authored Trial', () => {
    expect(trialForIndex(-1).id).toBe('culture-shock');
    expect(trialForIndex(99).id).toBe('cure-ish');
  });
});
