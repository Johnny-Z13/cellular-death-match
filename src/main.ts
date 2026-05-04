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

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Missing #game canvas');

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
    // One final render to show the final state.
    renderer.render(arena.state);
    return;
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
