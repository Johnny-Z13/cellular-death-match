// Transient tactile feedback: tap ripples, life/death/discovery particle
// bursts, and dish shake. Pure presentation — reads sim state, never writes.
// This core (store + visual math) is DOM-free so it unit-tests in node;
// createJuice (added separately) wraps it with canvas drawing.
import type { ToolId } from './screens';

export type BurstKind = 'birth' | 'death' | 'discovery';
export type ShakeIntensity = 'soft' | 'hard';

export interface Ripple {
  x: number;
  y: number;
  tool: ToolId;
  start: number;
  duration: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rgb: [number, number, number];
  start: number;
  duration: number;
  size: number;
}

export interface JuiceStore {
  ripples: Ripple[];
  particles: Particle[];
}

export const MAX_PARTICLES = 200;
export const MAX_RIPPLES = 24;

// Tool-tinted ripple colors, matched to the reagent identity hues used by
// the tool-effect overlay and dish-event palettes.
export const RIPPLE_COLORS: Record<ToolId, string> = {
  egg: '#7ee6ff',
  nutrient: '#f6d365',
  toxin: '#b771ff',
  paste: '#b6e36a',
  water: '#5ad8ff',
  salt: '#d2fff5',
  acid: '#83ff55',
};

// speed is grid units per second; duration in ms; size in grid units.
const BURST_TUNING: Record<BurstKind, { count: number; speed: number; duration: number; size: number }> = {
  birth: { count: 12, speed: 6, duration: 700, size: 1.2 },
  death: { count: 10, speed: 3, duration: 900, size: 1.0 },
  discovery: { count: 26, speed: 10, duration: 1100, size: 1.6 },
};

export function createJuiceStore(): JuiceStore {
  return { ripples: [], particles: [] };
}

export function spawnRipple(
  store: JuiceStore,
  pos: [number, number],
  tool: ToolId,
  now: number,
): void {
  store.ripples.push({ x: pos[0], y: pos[1], tool, start: now, duration: 450 });
  while (store.ripples.length > MAX_RIPPLES) store.ripples.shift();
}

export function spawnBurst(
  store: JuiceStore,
  pos: [number, number],
  rgb: [number, number, number],
  kind: BurstKind,
  now: number,
  rand: () => number = Math.random,
): void {
  const tune = BURST_TUNING[kind];
  // Death reads as a dark dissolving puff of the culture's own hue.
  const color: [number, number, number] = kind === 'death'
    ? [rgb[0] * 0.35, rgb[1] * 0.35, rgb[2] * 0.35]
    : rgb;
  for (let i = 0; i < tune.count; i++) {
    const angle = rand() * Math.PI * 2;
    const speed = tune.speed * (0.4 + 0.6 * rand());
    store.particles.push({
      x: pos[0],
      y: pos[1],
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rgb: color,
      start: now,
      duration: tune.duration * (0.7 + 0.3 * rand()),
      size: tune.size,
    });
  }
  while (store.particles.length > MAX_PARTICLES) store.particles.shift();
}

export function stepJuice(store: JuiceStore, now: number): void {
  store.ripples = store.ripples.filter((r) => now - r.start < r.duration);
  store.particles = store.particles.filter((p) => now - p.start < p.duration);
}

export interface RippleFrame {
  radius: number;
  alpha: number;
  lineWidth: number;
  color: string;
}

export function rippleVisual(r: Ripple, now: number): RippleFrame | null {
  const t = (now - r.start) / r.duration;
  if (t < 0 || t >= 1) return null;
  return {
    radius: 2 + t * 10,
    alpha: 0.55 * (1 - t),
    lineWidth: 1 + 2 * (1 - t),
    color: RIPPLE_COLORS[r.tool],
  };
}

// Reduced motion: one faint non-expanding ring still confirms the tap.
export function staticRippleVisual(r: Ripple, now: number): RippleFrame | null {
  const t = (now - r.start) / r.duration;
  if (t < 0 || t >= 1) return null;
  return { radius: 6, alpha: 0.4, lineWidth: 1.5, color: RIPPLE_COLORS[r.tool] };
}

export interface ParticleFrame {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

export function particleVisual(p: Particle, now: number): ParticleFrame | null {
  const t = (now - p.start) / p.duration;
  if (t < 0 || t >= 1) return null;
  // Decelerating drift: fast burst, gentle settle.
  const ease = 1 - (1 - t) * (1 - t);
  const travel = (p.duration / 1000) * ease;
  return {
    x: p.x + p.vx * travel,
    y: p.y + p.vy * travel,
    alpha: 0.9 * (1 - t),
    size: p.size,
  };
}

export interface Juice {
  ripple(pos: [number, number], tool: ToolId): void;
  burst(pos: [number, number], rgb: [number, number, number], kind: BurstKind): void;
  shake(intensity: ShakeIntensity): void;
  draw(): void;
}

export function createJuice(canvas: HTMLCanvasElement, LX: number, LY: number): Juice {
  const store = createJuiceStore();
  const reduceMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    ripple(pos, tool) {
      spawnRipple(store, pos, tool, performance.now());
    },
    burst(pos, rgb, kind) {
      if (reduceMotion) return;
      spawnBurst(store, pos, rgb, kind, performance.now());
    },
    shake(intensity) {
      if (reduceMotion) return;
      const cls = intensity === 'hard' ? 'dish-shake' : 'dish-shake-soft';
      canvas.classList.remove('dish-shake', 'dish-shake-soft');
      void canvas.offsetWidth;
      canvas.classList.add(cls);
    },
    draw() {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const now = performance.now();
      stepJuice(store, now);
      const sx = canvas.width / LX;
      const sy = canvas.height / LY;
      const rs = (sx + sy) / 2;
      ctx.save();
      for (const r of store.ripples) {
        const v = reduceMotion ? staticRippleVisual(r, now) : rippleVisual(r, now);
        if (!v) continue;
        ctx.globalAlpha = v.alpha;
        ctx.strokeStyle = v.color;
        ctx.lineWidth = v.lineWidth;
        ctx.beginPath();
        ctx.arc(r.x * sx, r.y * sy, v.radius * rs, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'lighter';
      for (const p of store.particles) {
        const v = particleVisual(p, now);
        if (!v) continue;
        ctx.globalAlpha = v.alpha;
        ctx.fillStyle = `rgb(${p.rgb[0] | 0}, ${p.rgb[1] | 0}, ${p.rgb[2] | 0})`;
        ctx.beginPath();
        ctx.arc(v.x * sx, v.y * sy, v.size * rs * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
  };
}
