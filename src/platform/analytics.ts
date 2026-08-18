export interface AnalyticsEvent {
  name: string;
  atMs: number;
  data?: Record<string, string | number | boolean | null>;
}

export interface Analytics {
  record(name: string, data?: AnalyticsEvent['data']): void;
  events(): readonly AnalyticsEvent[];
  clear(): void;
}

export interface AnalyticsOptions {
  nowMs?: () => number;
  sink?: (event: AnalyticsEvent) => void;
  maxEvents?: number;
}

export function createAnalytics(options: AnalyticsOptions = {}): Analytics {
  const nowMs = options.nowMs ?? defaultNowMs;
  const maxEvents = options.maxEvents ?? 200;
  const recorded: AnalyticsEvent[] = [];

  return {
    record(name, data) {
      const event: AnalyticsEvent = { name, atMs: nowMs() };
      if (data) event.data = data;
      recorded.push(event);
      if (recorded.length > maxEvents) recorded.splice(0, recorded.length - maxEvents);
      options.sink?.(event);
    },
    events() {
      return [...recorded];
    },
    clear() {
      recorded.length = 0;
    },
  };
}

function defaultNowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}
