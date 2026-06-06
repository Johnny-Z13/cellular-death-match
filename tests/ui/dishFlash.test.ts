import { describe, expect, it } from 'vitest';
import { dishEventMarkerVisual, dishFlashForEvents } from '../../src/ui/render';
import type { DishEventMarker } from '../../src/game/arena';

function event(
  kind: DishEventMarker['kind'],
  ttl = 80,
  maxTtl = 100,
  label: string = kind,
): DishEventMarker {
  return {
    id: 1,
    kind,
    label,
    pos: [20, 20],
    radius: 12,
    ttl,
    maxTtl,
    color: kind === 'fold'
      ? 'violet'
      : kind === 'critical'
        ? 'red'
        : kind === 'discovery'
          ? 'cyan'
          : kind === 'mutation'
            ? 'amber'
            : kind === 'caution'
              ? 'amber'
              : 'green',
  };
}

describe('dish event flash', () => {
  it('flashes the dish for fresh critical and fold events', () => {
    expect(dishFlashForEvents([event('critical')], false)?.alpha).toBeGreaterThan(0.05);
    expect(dishFlashForEvents([event('fold')], false)?.color).toBe('#b771ff');
  });

  it('soft flashes the dish for fresh discoveries and visible mutations', () => {
    const discovery = dishFlashForEvents([event('discovery')], false)!;
    const mutation = dishFlashForEvents([event('mutation')], false)!;
    const critical = dishFlashForEvents([event('critical')], false)!;

    expect(discovery.color).toBe('#7ee6ff');
    expect(mutation.color).toBe('#f6d365');
    expect(discovery.alpha).toBeGreaterThan(0.02);
    expect(mutation.alpha).toBeGreaterThan(0.02);
    expect(discovery.alpha).toBeLessThan(critical.alpha);
    expect(mutation.alpha).toBeLessThan(critical.alpha);
  });

  it('subtly flashes fresh caution events for volatile discoveries', () => {
    const caution = dishFlashForEvents([event('caution')], false)!;
    const discovery = dishFlashForEvents([event('discovery')], false)!;

    expect(caution.color).toBe('#f6d365');
    expect(caution.alpha).toBeGreaterThan(0.015);
    expect(caution.alpha).toBeLessThan(discovery.alpha);
  });

  it('does not flash stable events or reduced-motion displays', () => {
    expect(dishFlashForEvents([event('stabilize')], false)).toBeNull();
    expect(dishFlashForEvents([event('critical')], true)).toBeNull();
  });

  it('fades the flash as the event ages', () => {
    const fresh = dishFlashForEvents([event('critical', 100, 100)], false)!;
    const old = dishFlashForEvents([event('critical', 18, 100)], false)!;

    expect(fresh.alpha).toBeGreaterThan(old.alpha);
    expect(old.alpha).toBeGreaterThan(0);
  });

  it('boosts explicit flash markers above ordinary critical events', () => {
    const ordinary = dishFlashForEvents([event('critical')], false)!;
    const flash = dishFlashForEvents([event('critical', 80, 100, 'CATALYTIC FLARE FLASH')], false)!;

    expect(flash.color).toBe('#ffffff');
    expect(flash.alpha).toBeGreaterThan(ordinary.alpha);
  });

  it('draws explicit flash markers as brighter thicker rings', () => {
    const ordinary = dishEventMarkerVisual(event('critical'), 0, false);
    const flash = dishEventMarkerVisual(event('critical', 80, 100, 'CATALYTIC FLARE FLASH'), 0, false);

    expect(flash.strokeStyle).toBe('#ffffff');
    expect(flash.globalAlpha).toBeGreaterThan(ordinary.globalAlpha);
    expect(flash.lineWidth).toBeGreaterThan(ordinary.lineWidth);
    expect(flash.radiusExpansion).toBeGreaterThan(ordinary.radiusExpansion);
  });
});
