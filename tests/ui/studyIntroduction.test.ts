import { describe, expect, it } from 'vitest';
import { studyIntroductionRoute } from '../../src/ui/studyIntroduction';

describe('dish-first assignment introduction routing', () => {
  it('lets the exact coach own Trials 1–2 without a second banner', () => {
    expect(studyIntroductionRoute({
      guidanceTier: 'exact', openLab: false, compactViewport: true,
    })).toEqual({ owner: 'coach', kind: 'trial', showCentralBanner: false });
  });

  it('routes later Trials and Open Lab Studies through the director rail', () => {
    expect(studyIntroductionRoute({
      guidanceTier: 'hypothesis', openLab: false, compactViewport: true,
    })).toEqual({ owner: 'director', kind: 'trial', showCentralBanner: false });
    expect(studyIntroductionRoute({
      guidanceTier: 'hypothesis', openLab: true, compactViewport: false,
    })).toEqual({ owner: 'director', kind: 'study', showCentralBanner: false });
  });
});
