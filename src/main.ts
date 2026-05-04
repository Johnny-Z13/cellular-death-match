import { createArena } from './game/arena';
import { addBullet } from './sim/bullets';
import { createRenderer } from './ui/render';
import { createDebugPanel } from './ui/debug';
import { createInput } from './game/input';

const LX = 100;
const LY = 100;
const PLAYER_TARGET_VOL = 300;
const BRUISER_TARGET_VOL = 450;        // +50% per Bruiser archetype spec
const PLAYER_ID = 1;
const BULLET_COST = 5;
const BULLET_MIN_VOL = 20;
const BULLET_SPEED = 2;
const BULLET_SIZE = 3;
const FIRE_COOLDOWN_TICKS = 5;

const canvasMaybe = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvasMaybe) throw new Error('Missing #game canvas');
const canvas: HTMLCanvasElement = canvasMaybe;

const arena = createArena({
  LX,
  LY,
  seed: Date.now() & 0xffffffff,
  playerTargetVol: PLAYER_TARGET_VOL,
  bruiserTargetVol: BRUISER_TARGET_VOL,
  wrap: true,
});

const renderer = createRenderer(canvas, 2);
const input = createInput(window);
const debug = createDebugPanel();
debug.setSwatch(1, cellColorCss(0, 2));   // player: hue 0 (red)
debug.setSwatch(2, cellColorCss(1, 2));   // enemy: hue 0.5 (cyan)

canvas.tabIndex = 0;
canvas.focus();
window.addEventListener('keydown', () => canvas.focus());

let cooldown = 0;
let lastFpsTick = performance.now();
let framesSinceTick = 0;
let displayedFps = 0;
let tickCount = 0;
let running = true;

function loop() {
  if (!running) return;

  const inp = input.poll();

  // Fire bullets only when not engulfing (engulf disables shooting per spec).
  if (cooldown > 0) cooldown -= 1;
  const player = arena.state.cells.get(PLAYER_ID);
  if (
    inp.shouldFire &&
    !inp.shouldEngulf &&
    cooldown === 0 &&
    player &&
    player.targetVol >= BULLET_MIN_VOL
  ) {
    const dir = inp.moveVec[0] === 0 && inp.moveVec[1] === 0 ? inp.lastFireDir : inp.moveVec;
    const v: [number, number] = [dir[0] * BULLET_SPEED, dir[1] * BULLET_SPEED];
    if (v[0] !== 0 || v[1] !== 0) {
      addBullet(arena.state, {
        pos: [player.center[0], player.center[1]],
        v,
        ownerId: PLAYER_ID,
        size: BULLET_SIZE,
      });
      player.targetVol -= BULLET_COST;
      cooldown = FIRE_COOLDOWN_TICKS;
    }
  }

  arena.tick({
    moveVec: inp.moveVec,
    shouldFire: inp.shouldFire,
    shouldEngulf: inp.shouldEngulf,
  });
  tickCount++;

  renderer.render(arena.state);

  framesSinceTick++;
  const now = performance.now();
  if (now - lastFpsTick > 1000) {
    displayedFps = framesSinceTick;
    framesSinceTick = 0;
    lastFpsTick = now;
  }

  const status = arena.getStatus();

  // Update debug panel each frame.
  const playerCell = arena.state.cells.get(PLAYER_ID);
  const canFire =
    !inp.shouldEngulf &&
    cooldown === 0 &&
    !!playerCell &&
    playerCell.targetVol >= BULLET_MIN_VOL;
  debug.update(arena.state, {
    fps: displayedFps,
    tick: tickCount,
    status,
    cooldown,
    canFire,
  });

  if (status !== 'running') {
    running = false;
    drawEndOverlay(status);
    return;
  }

  requestAnimationFrame(loop);
}

// HSV→RGB matches src/ui/render.ts. We duplicate it here rather than export it
// because the renderer treats palette construction as an internal detail.
// Same formula, same input convention: hue index `i` over `nCells`.
function cellColorCss(i: number, nCells: number): string {
  const h = i / nCells;
  const s = 1, v = 0.7;
  const idx = Math.floor(h * 6);
  const f = h * 6 - idx;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;
  switch (idx % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return `rgb(${(r * 255) | 0}, ${(g * 255) | 0}, ${(b * 255) | 0})`;
}

function drawEndOverlay(status: 'won' | 'lost'): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  // Dim the field.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Title.
  ctx.fillStyle = status === 'won' ? '#7cf07c' : '#f06464';
  ctx.font = 'bold 64px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(status === 'won' ? 'WIN' : 'LOSE', canvas.width / 2, canvas.height / 2 - 16);
  // Hint.
  ctx.fillStyle = '#dddddd';
  ctx.font = '20px monospace';
  ctx.fillText('press R to restart', canvas.width / 2, canvas.height / 2 + 36);
}

window.addEventListener('keydown', (e) => {
  if (!running && (e.key === 'r' || e.key === 'R')) {
    location.reload();
  }
});

requestAnimationFrame(loop);
