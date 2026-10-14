// The dish's grid shape and the layout around it. Landscape screens tall
// enough for floating menus get the wide layout: a 16:9 dish filling the
// screen under glass menus. It has the same number of sites as the 160 x 160
// square, so a trial's pace and balance carry over. Other screens keep the
// square dish and the classic layout. A dish keeps its shape for its whole
// life; only its framing follows the window.
export interface DishGrid {
  readonly LX: number;
  readonly LY: number;
}

export type DishLayout = 'wide' | 'classic';

export const DISH_LAYOUT_TUNING = {
  square: { LX: 160, LY: 160 } as DishGrid,
  wide: { LX: 213, LY: 120 } as DishGrid,
  // Phones on their side keep the side-rail layout: below this height the
  // floating bars leave too little dish.
  wideMinHeightPx: 520,
  // Nearly square windows keep the square dish, which fills them better.
  wideMinAspect: 1.25,
};

/** `override` comes from `?layout=wide|classic`, for comparing the two. */
export function dishLayoutFor(width: number, height: number, override?: string | null): DishLayout {
  if (override === 'wide' || override === 'classic') return override;
  const T = DISH_LAYOUT_TUNING;
  return width >= height * T.wideMinAspect && height >= T.wideMinHeightPx ? 'wide' : 'classic';
}

export function dishGridFor(layout: DishLayout): DishGrid {
  return layout === 'wide' ? DISH_LAYOUT_TUNING.wide : DISH_LAYOUT_TUNING.square;
}
