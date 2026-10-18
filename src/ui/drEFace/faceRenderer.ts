// Draws Dr. E into a canvas: blends expressions, blinks, breathes and moves
// his mouth with a speech plan, then paints the face grid through the dish's
// bloom so he is made of the same light as the cultures.
import {
  DR_E_FACE, FACE_DIRECTIONS, FACE_EXPRESSIONS,
  type DrEFaceTuning, type FaceDirection, type FaceDirectionId, type FaceExpressionId, type FaceParams,
} from '../../content/drETuning';
import { drawBloomLayers } from '../render';
import { BODY_CELL_BASE, PART, blendFace, hash01, rasterizeFace, speechLevelAt, type SpeechEnvelope } from './faceModel';

export interface DrEFaceOptions {
  direction: FaceDirectionId;
  size: number; // CSS pixels across
  expression?: FaceExpressionId;
  tuning?: DrEFaceTuning;
  /** Milliseconds; defaults to performance.now. Stills pass a fixed clock. */
  now?: () => number;
  reducedMotion?: boolean;
  additiveBloom?: boolean;
  /** CSS sizes the canvas (the game's slots); setSize then only sets the
   *  backing resolution. Default false: setSize also sets the CSS size. */
  cssSized?: boolean;
}

export interface DrEFace {
  setExpression(id: FaceExpressionId): void;
  setDirection(id: FaceDirectionId): void;
  setSize(cssPx: number): void;
  /** Move the mouth with `speech`, whose time 0 is `startMs` on the face's clock. */
  speak(speech: SpeechEnvelope, startMs: number): void;
  stopSpeaking(): void;
  /** Rolling average paint time in milliseconds (spec budget: under 1 ms). */
  paintMs(): number;
  destroy(): void;
}

type Rgb = readonly [number, number, number];

function shade(colour: Rgb, k: number): Rgb {
  const target = k >= 0 ? 255 : 0;
  const a = Math.abs(k);
  return [colour[0] + (target - colour[0]) * a, colour[1] + (target - colour[1]) * a, colour[2] + (target - colour[2]) * a];
}

function partColour(direction: FaceDirection, part: number): Rgb | null {
  if (part === PART.empty) return null;
  if (part >= BODY_CELL_BASE) {
    const index = part - BODY_CELL_BASE;
    const palette = direction.bodyPalette;
    return palette ? palette[index % palette.length]! : shade(direction.body, ((index % 3) - 1) * 0.12);
  }
  switch (part) {
    case PART.eye: return direction.eye;
    case PART.pupil: return direction.pupil;
    case PART.mouth: return direction.mouth;
    case PART.brow: return direction.brow ?? direction.body;
    case PART.cheek: return direction.cheek;
    case PART.lens: return direction.lens ?? direction.eye;
    case PART.glint: return [255, 255, 255];
    case PART.tongue: return shade(direction.cheek, -0.25);
    default: return direction.body;
  }
}

// On screen and visible: display:none, visibility:hidden and zero-size slots
// all skip painting.
function isShown(canvas: HTMLCanvasElement): boolean {
  if (typeof canvas.checkVisibility === 'function') return canvas.checkVisibility({ visibilityProperty: true });
  return canvas.getClientRects().length > 0;
}

export function createDrEFace(canvas: HTMLCanvasElement, options: DrEFaceOptions): DrEFace {
  const tuning = options.tuning ?? DR_E_FACE;
  const now = options.now ?? (() => performance.now());
  const reducedMotion = options.reducedMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const additive = options.additiveBloom !== false;
  const N = tuning.gridSize;
  const ctx = canvas.getContext('2d')!;
  const grid = document.createElement('canvas');
  grid.width = N;
  grid.height = N;
  const gridCtx = grid.getContext('2d')!;
  const image = gridCtx.createImageData(N, N);

  let direction = FACE_DIRECTIONS[options.direction];
  let from: FaceParams = FACE_EXPRESSIONS[options.expression ?? 'neutral'];
  let to: FaceParams = from;
  let blendStart = now();
  let speech: SpeechEnvelope | null = null;
  let speechStart = 0;
  let blinkSeed = 1;
  let blinkStart = Number.NEGATIVE_INFINITY;
  let nextBlink = now() + tuning.blinkMinMs;
  let averagePaint = 0;
  let raf = 0;
  let lastPaintAt = Number.NEGATIVE_INFINITY;

  const setSize = (cssPx: number): void => {
    const pxPerCell = Math.min(tuning.maxPxPerCell, Math.max(1, Math.round((cssPx * (window.devicePixelRatio || 1)) / N)));
    if (canvas.width !== N * pxPerCell) {
      canvas.width = N * pxPerCell;
      canvas.height = N * pxPerCell;
    }
    if (options.cssSized) return;
    canvas.style.width = `${cssPx}px`;
    canvas.style.height = `${cssPx}px`;
  };

  const paint = (cells: Uint8Array, t: number, bodyRadius: number): void => {
    const data = image.data;
    const c = (N - 1) / 2;
    const bodyR = Math.max(1, bodyRadius * N);
    const step = Math.floor(t / tuning.flickerMs);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        const part = cells[i]!;
        const colour = partColour(direction, part);
        const o = i * 4;
        if (!colour) {
          data[o + 3] = 0;
          continue;
        }
        const neighbours = [
          x > 0 ? cells[i - 1]! : PART.empty, x < N - 1 ? cells[i + 1]! : PART.empty,
          y > 0 ? cells[i - N]! : PART.empty, y < N - 1 ? cells[i + N]! : PART.empty,
        ];
        let rgb: Rgb = colour;
        if (part === PART.body || part >= BODY_CELL_BASE) {
          // A culture: darker at its core, lit at its membrane, with a seam
          // where two fused cells meet, and a slow shimmer inside.
          const r = Math.min(1, Math.hypot(x - c, y - c) / bodyR);
          rgb = shade(rgb, -tuning.coreShade * (1 - r) ** 1.3);
          if (neighbours.includes(PART.empty)) rgb = shade(colour, tuning.membraneLight);
          else if (neighbours.some((n) => n !== part && (n === PART.body || n >= BODY_CELL_BASE))) rgb = shade(rgb, tuning.seamLight);
          else if (!reducedMotion) rgb = shade(rgb, -tuning.shimmer * hash01(x, y, step));
        } else if (part === PART.eye || part === PART.cheek || part === PART.lens) {
          // Features are cells too, but only light ones get a membrane; dark
          // pupils, mouths and brows stay crisp.
          if (neighbours.some((n) => n !== part)) rgb = shade(colour, part === PART.eye ? -0.12 : 0.25);
        }
        data[o] = rgb[0];
        data[o + 1] = rgb[1];
        data[o + 2] = rgb[2];
        data[o + 3] = 255;
      }
    }
    gridCtx.putImageData(image, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBloomLayers(ctx, grid, canvas.width, canvas.height, additive);
    canvas.dataset.drawn = '1';
  };

  const frame = (): void => {
    raf = requestAnimationFrame(frame);
    // Hidden tabs and slots that are not on screen cost nothing.
    if (document.hidden || !isShown(canvas)) return;
    const wall = performance.now();
    if (wall - lastPaintAt < 1000 / tuning.fps - 2) return;
    lastPaintAt = wall;
    const began = performance.now();
    const t = now();
    const p = { ...blendFace(from, to, (t - blendStart) / tuning.blendMs) };
    if (!reducedMotion) p.squash += tuning.breathSquash * Math.sin((2 * Math.PI * tuning.breathHz * t) / 1000);
    if (t >= nextBlink) {
      blinkStart = t;
      blinkSeed += 1;
      nextBlink = t + tuning.blinkMinMs + hash01(blinkSeed, 7, 3) * (tuning.blinkMaxMs - tuning.blinkMinMs);
    }
    const blink = (t - blinkStart) / tuning.blinkMs;
    if (blink >= 0 && blink < 1) p.eyeOpen *= Math.abs(1 - 2 * blink);
    if (speech) {
      const level = speechLevelAt(speech, (t - speechStart) / 1000);
      p.mouthOpen = Math.min(1, p.mouthOpen + tuning.talkMouthGain * level);
      if (!reducedMotion) p.squash += tuning.talkBounce * level;
    }
    paint(rasterizeFace(direction, p, tuning, t, reducedMotion), t, p.bodyRadius);
    averagePaint = averagePaint * 0.9 + (performance.now() - began) * 0.1;
  };

  setSize(options.size);
  raf = requestAnimationFrame(frame);

  return {
    setExpression(id) {
      const t = now();
      from = blendFace(from, to, (t - blendStart) / tuning.blendMs);
      to = FACE_EXPRESSIONS[id];
      blendStart = t;
    },
    setDirection(id) {
      direction = FACE_DIRECTIONS[id];
    },
    setSize,
    speak(next, startMs) {
      speech = next;
      speechStart = startMs;
    },
    stopSpeaking() {
      speech = null;
    },
    paintMs: () => averagePaint,
    destroy() {
      cancelAnimationFrame(raf);
    },
  };
}
