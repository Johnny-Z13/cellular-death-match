import { createSim, tick } from './sim/sim';
import { addBullet } from './sim/bullets';
import { createRenderer } from './ui/render';
import { createInput } from './game/input';

const LX = 100;
const LY = 100;
const N_CELLS = 2;
const TARGET_VOL = 300;
const MC_STEPS_PER_FRAME = 1000;
const PLAYER_ID = 1;
const PLAYER_SPEED = 10;          // matches Python default
const BULLET_COST = 5;            // target_vol cost per shot (Python: bullet_cost = 5)
const BULLET_MIN_VOL = 20;        // can't fire below this targetVol (Python rule)
const BULLET_SPEED = 2;           // grid pixels per tick (Python default)
const BULLET_SIZE = 3;            // square footprint
const FIRE_COOLDOWN_TICKS = 5;    // simple rate limit (not in Python; M2 prevents bullet spray)

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Missing #game canvas');

const state = createSim({
  LX,
  LY,
  nCells: N_CELLS,
  targetVol: TARGET_VOL,
  seed: Date.now() & 0xffffffff,
  wrap: true,
});

const renderer = createRenderer(canvas, N_CELLS);
const input = createInput(window);

// Ensure the canvas takes keyboard focus.
canvas.tabIndex = 0;
canvas.focus();
window.addEventListener('keydown', () => canvas.focus());

let cooldown = 0;
let lastFpsLog = performance.now();
let framesSinceLog = 0;

function loop() {
  const inp = input.poll();

  // 1. Drive the player cell's intent.
  const player = state.cells.get(PLAYER_ID);
  if (player) {
    player.intent.vec = inp.moveVec;
    player.intent.speed = PLAYER_SPEED;
    player.intent.shooting = inp.shouldFire;
  }

  // 2. Fire a bullet if possible.
  if (cooldown > 0) cooldown -= 1;
  if (inp.shouldFire && cooldown === 0 && player && player.targetVol >= BULLET_MIN_VOL) {
    const dir = inp.moveVec[0] === 0 && inp.moveVec[1] === 0 ? inp.lastFireDir : inp.moveVec;
    const v: [number, number] = [dir[0] * BULLET_SPEED, dir[1] * BULLET_SPEED];
    if (v[0] !== 0 || v[1] !== 0) {
      addBullet(state, {
        pos: [player.center[0], player.center[1]],
        v,
        ownerId: PLAYER_ID,
        size: BULLET_SIZE,
      });
      player.targetVol -= BULLET_COST;
      cooldown = FIRE_COOLDOWN_TICKS;
    }
  }

  // 3. Step the sim.
  tick(state, MC_STEPS_PER_FRAME);

  // 4. Render.
  renderer.render(state);

  // 5. FPS log.
  framesSinceLog++;
  const now = performance.now();
  if (now - lastFpsLog > 1000) {
    // eslint-disable-next-line no-console
    console.log(`FPS: ${framesSinceLog}`);
    framesSinceLog = 0;
    lastFpsLog = now;
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
