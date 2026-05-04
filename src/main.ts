import { createSim, tick } from './sim/sim';
import { createRenderer } from './ui/render';

const LX = 100;
const LY = 100;
const N_CELLS = 2;
const TARGET_VOL = 300;
const MC_STEPS_PER_FRAME = 1000;

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

// Simple FPS overlay (console only — HUD comes in M4).
let lastFpsLog = performance.now();
let framesSinceLog = 0;

function loop() {
  tick(state, MC_STEPS_PER_FRAME);
  renderer.render(state);

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
