import { SIM_SPEED_TUNING } from '../content/ecologyTuning';

const CLOCK_EPSILON_MS = 1e-7;

export interface FixedStepClock {
  consumeTicks(nowMs: number): number;
  getTicksPerSecond(): number;
  reset(nowMs: number): void;
  setTicksPerSecond(value: unknown): number;
}

export interface FixedStepClockOpts {
  ticksPerSecond?: unknown;
  nowMs?: number;
  maxFrameDeltaMs?: number;
  maxTicksPerFrame?: number;
}

export function normalizeSimTicksPerSecond(
  value: unknown,
  fallback: number = SIM_SPEED_TUNING.defaultTicksPerSecond,
): number {
  const numeric = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value)
      : Number.NaN;
  const ticksPerSecond = Number.isFinite(numeric) ? numeric : fallback;
  return clamp(
    Math.round(ticksPerSecond),
    SIM_SPEED_TUNING.minTicksPerSecond,
    SIM_SPEED_TUNING.maxTicksPerSecond,
  );
}

export function createFixedStepClock(opts: FixedStepClockOpts = {}): FixedStepClock {
  const maxFrameDeltaMs = opts.maxFrameDeltaMs ?? SIM_SPEED_TUNING.maxFrameDeltaMs;
  const maxTicksPerFrame = opts.maxTicksPerFrame ?? SIM_SPEED_TUNING.maxTicksPerFrame;
  let ticksPerSecond = normalizeSimTicksPerSecond(opts.ticksPerSecond);
  let lastNowMs = opts.nowMs ?? 0;
  let accumulatorMs = 0;

  function stepMs(): number {
    return 1000 / ticksPerSecond;
  }

  return {
    consumeTicks(nowMs) {
      const elapsedMs = Math.max(0, Math.min(nowMs - lastNowMs, maxFrameDeltaMs));
      lastNowMs = nowMs;
      accumulatorMs += elapsedMs;

      const fixedStepMs = stepMs();
      const dueTicks = Math.floor((accumulatorMs + CLOCK_EPSILON_MS) / fixedStepMs);
      const ticks = Math.min(dueTicks, maxTicksPerFrame);
      accumulatorMs -= ticks * fixedStepMs;
      if (Math.abs(accumulatorMs) < CLOCK_EPSILON_MS) accumulatorMs = 0;

      const maxCarryMs = fixedStepMs * maxTicksPerFrame;
      if (accumulatorMs > maxCarryMs) accumulatorMs = maxCarryMs;

      return ticks;
    },
    getTicksPerSecond() {
      return ticksPerSecond;
    },
    reset(nowMs) {
      lastNowMs = nowMs;
      accumulatorMs = 0;
    },
    setTicksPerSecond(value) {
      ticksPerSecond = normalizeSimTicksPerSecond(value, ticksPerSecond);
      const maxCarryMs = stepMs() * maxTicksPerFrame;
      if (accumulatorMs > maxCarryMs) accumulatorMs = maxCarryMs;
      return ticksPerSecond;
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
