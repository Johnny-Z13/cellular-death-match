import { createArena } from './game/arena';
import { addBullet } from './sim/bullets';
import { createRenderer } from './ui/render';
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

canvas.tabIndex = 0;
canvas.focus();
window.addEventListener('keydown', () => canvas.focus());

let cooldown = 0;
let lastFpsLog = performance.now();
let framesSinceLog = 0;
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

  renderer.render(arena.state);

  framesSinceLog++;
  const now = performance.now();
  if (now - lastFpsLog > 1000) {
    // eslint-disable-next-line no-console
    console.log(`FPS: ${framesSinceLog}`);
    framesSinceLog = 0;
    lastFpsLog = now;
  }

  const status = arena.getStatus();
  if (status !== 'running') {
    running = false;
    // eslint-disable-next-line no-console
    console.log(status === 'won' ? 'WIN' : 'LOSE');
    drawEndOverlay(status);
    return;
  }

  requestAnimationFrame(loop);
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
