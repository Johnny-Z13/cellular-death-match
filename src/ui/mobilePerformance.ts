import { DISH_LAYOUT_TUNING, type DishGrid } from './dishShape';

export type VisualQuality = 'desktop' | 'mobile-balanced' | 'mobile-economy';

export interface DevicePerformanceSignals {
  viewportWidth: number;
  coarsePointer: boolean;
  deviceMemoryGb?: number;
  hardwareConcurrency?: number;
  saveData?: boolean;
}

export interface VisualPerformanceProfile {
  id: VisualQuality;
  canvasSize: 480 | 640 | 800;
  targetRenderFps: 30 | 45 | 60;
  additiveBloom: boolean;
}

const DESKTOP_PROFILE: VisualPerformanceProfile = {
  id: 'desktop',
  canvasSize: 800,
  targetRenderFps: 60,
  additiveBloom: true,
};

const MOBILE_BALANCED_PROFILE: VisualPerformanceProfile = {
  id: 'mobile-balanced',
  canvasSize: 640,
  targetRenderFps: 45,
  additiveBloom: true,
};

const MOBILE_ECONOMY_PROFILE: VisualPerformanceProfile = {
  id: 'mobile-economy',
  canvasSize: 480,
  targetRenderFps: 30,
  additiveBloom: false,
};

export function performanceProfileFor(
  signals: DevicePerformanceSignals,
): VisualPerformanceProfile {
  const mobile = signals.viewportWidth < 900 || signals.coarsePointer;
  if (!mobile) return DESKTOP_PROFILE;

  const constrained = signals.saveData === true
    || (signals.deviceMemoryGb !== undefined && signals.deviceMemoryGb <= 4)
    || (signals.hardwareConcurrency !== undefined && signals.hardwareConcurrency <= 4);
  return constrained ? MOBILE_ECONOMY_PROFILE : MOBILE_BALANCED_PROFILE;
}

export function shouldRenderFrame(
  lastRenderAt: number,
  now: number,
  targetRenderFps: number,
): boolean {
  if (!Number.isFinite(lastRenderAt)) return true;
  return now - lastRenderAt >= 1000 / targetRenderFps - 0.5;
}

export function browserPerformanceSignals(): DevicePerformanceSignals {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  return {
    viewportWidth: window.innerWidth,
    coarsePointer: typeof window.matchMedia === 'function'
      && window.matchMedia('(pointer: coarse)').matches,
    deviceMemoryGb: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
    saveData: nav.connection?.saveData,
  };
}

// canvasSize is the backing size of the square 160-site dish; a wide dish
// keeps the same pixels per site.
export function applyCanvasProfile(
  canvas: HTMLCanvasElement,
  profile: VisualPerformanceProfile,
  grid: DishGrid = DISH_LAYOUT_TUNING.square,
): boolean {
  const perSite = profile.canvasSize / DISH_LAYOUT_TUNING.square.LX;
  const width = Math.round(grid.LX * perSite);
  const height = Math.round(grid.LY * perSite);
  if (canvas.width === width && canvas.height === height) return false;
  canvas.width = width;
  canvas.height = height;
  return true;
}
