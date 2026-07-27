import { describe, expect, it } from 'vitest';
import {
  applyCanvasProfile,
  performanceProfileFor,
  shouldRenderFrame,
} from '../../src/ui/mobilePerformance';

describe('mobile visual performance profiles', () => {
  it('leaves desktop rendering at full quality', () => {
    expect(performanceProfileFor({
      viewportWidth: 1280,
      coarsePointer: false,
      deviceMemoryGb: 8,
      hardwareConcurrency: 8,
    })).toMatchObject({
      id: 'desktop',
      canvasSize: 800,
      targetRenderFps: 60,
      additiveBloom: true,
    });
  });

  it('uses a balanced phone profile without changing simulation speed', () => {
    expect(performanceProfileFor({
      viewportWidth: 390,
      coarsePointer: true,
      deviceMemoryGb: 8,
      hardwareConcurrency: 8,
    })).toMatchObject({
      id: 'mobile-balanced',
      canvasSize: 640,
      targetRenderFps: 45,
      additiveBloom: true,
    });
  });

  it('reduces presentation cost on constrained mobile hardware', () => {
    expect(performanceProfileFor({
      viewportWidth: 390,
      coarsePointer: true,
      deviceMemoryGb: 4,
      hardwareConcurrency: 4,
    })).toMatchObject({
      id: 'mobile-economy',
      canvasSize: 480,
      targetRenderFps: 30,
      additiveBloom: false,
    });
  });

  it('paces visual frames independently from the fixed-tick simulation', () => {
    expect(shouldRenderFrame(Number.NEGATIVE_INFINITY, 1000, 30)).toBe(true);
    expect(shouldRenderFrame(1000, 1020, 30)).toBe(false);
    expect(shouldRenderFrame(1000, 1034, 30)).toBe(true);
  });

  it('only resizes the backing store when the profile changes it', () => {
    const canvas = { width: 800, height: 800 } as HTMLCanvasElement;
    const profile = performanceProfileFor({
      viewportWidth: 390,
      coarsePointer: true,
      hardwareConcurrency: 8,
    });

    expect(applyCanvasProfile(canvas, profile)).toBe(true);
    expect([canvas.width, canvas.height]).toEqual([640, 640]);
    expect(applyCanvasProfile(canvas, profile)).toBe(false);
  });
});
