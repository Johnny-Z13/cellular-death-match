import { describe, expect, it } from 'vitest';
import { DISH_LAYOUT_TUNING, dishGridFor, dishLayoutFor } from '../../src/ui/dishShape';

describe('dish shape and layout', () => {
  it('fills desktops, laptops and landscape tablets with the wide dish', () => {
    expect(dishLayoutFor(1440, 900)).toBe('wide');
    expect(dishLayoutFor(1280, 720)).toBe('wide');
    expect(dishLayoutFor(1280, 800)).toBe('wide');
    expect(dishLayoutFor(1024, 768)).toBe('wide');
  });

  it('keeps portrait screens and phones on their side in the classic layout', () => {
    expect(dishLayoutFor(390, 844)).toBe('classic');
    expect(dishLayoutFor(768, 1024)).toBe('classic');
    expect(dishLayoutFor(844, 390)).toBe('classic');
    expect(dishLayoutFor(814, 756)).toBe('classic');
  });

  it('lets ?layout force either layout', () => {
    expect(dishLayoutFor(390, 844, 'wide')).toBe('wide');
    expect(dishLayoutFor(1440, 900, 'classic')).toBe('classic');
    expect(dishLayoutFor(1440, 900, 'nonsense')).toBe('wide');
  });

  it('keeps the wide dish within one percent of the square dish\'s site count', () => {
    const square = DISH_LAYOUT_TUNING.square.LX * DISH_LAYOUT_TUNING.square.LY;
    const wide = DISH_LAYOUT_TUNING.wide.LX * DISH_LAYOUT_TUNING.wide.LY;
    expect(Math.abs(wide / square - 1)).toBeLessThan(0.01);
    expect(dishGridFor('wide')).toEqual({ LX: 213, LY: 120 });
    expect(dishGridFor('classic')).toEqual({ LX: 160, LY: 160 });
  });
});
