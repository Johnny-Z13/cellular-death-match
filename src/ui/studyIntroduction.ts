export interface StudyIntroductionInput {
  guidanceTier: 'exact' | 'hypothesis';
  openLab: boolean;
  compactViewport: boolean;
}

export interface StudyIntroductionRoute {
  owner: 'coach' | 'director';
  kind: 'trial' | 'study';
  showCentralBanner: boolean;
}

/** Keep ordinary assignments in a single top rail while the dish stays live. */
export function studyIntroductionRoute(input: StudyIntroductionInput): StudyIntroductionRoute {
  return {
    owner: input.guidanceTier === 'exact' ? 'coach' : 'director',
    kind: input.openLab ? 'study' : 'trial',
    // The director rail is coherent at every supported viewport; using it on
    // desktop too prevents duplicate banner + rail announcements.
    showCentralBanner: false,
  };
}
