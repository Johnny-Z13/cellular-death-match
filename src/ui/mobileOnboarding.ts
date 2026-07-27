export const MOBILE_DRAWER_QUERY = '(max-width: 899px)';

export function isMobileViewport(win: Pick<Window, 'matchMedia'> = window): boolean {
  return typeof win.matchMedia === 'function'
    && win.matchMedia(MOBILE_DRAWER_QUERY).matches;
}

export function shouldOpenLifeformsForNewPlayer({
  hasSeenTutorial,
  isMobileViewport,
  viewportHeight,
}: {
  hasSeenTutorial: boolean;
  isMobileViewport: boolean;
  viewportHeight: number;
}): boolean {
  return isMobileViewport && !hasSeenTutorial && viewportHeight > 700;
}
