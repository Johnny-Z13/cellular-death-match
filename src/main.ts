import { createRun, FIGHTS_PER_RUN } from './game/run';
import { createArena, type Arena } from './game/arena';
import { addBullet } from './sim/bullets';
import { createRenderer, type Renderer } from './ui/render';
import { createDebugPanel } from './ui/debug';
import { createInput } from './game/input';
import { createScreens } from './ui/screens';
import { getUpgradeDef } from './content/upgrades';

const LX = 100;
const LY = 100;
const PLAYER_ID = 1;
const BULLET_COST = 12;             // raised from 5 — bullets felt too cheap vs engulf
const BULLET_MIN_VOL = 10;
const BULLET_SPEED = 2;
const FIRE_COOLDOWN_TICKS = 5;

const canvasMaybe = document.getElementById('game') as HTMLCanvasElement | null;
if (!canvasMaybe) throw new Error('Missing #game canvas');
const canvas: HTMLCanvasElement = canvasMaybe;

const run = createRun(Date.now() & 0xffffffff);
const screens = createScreens();
const debug = createDebugPanel();
const input = createInput(window);
// Allow up to PALETTE_SIZE total cell colors. Larger than any expected fight
// (boss phase 2 = boss + 3 mediums = 4 enemies + spawned mediums; far below 16).
const PALETTE_SIZE = 16;

let arena: Arena | null = null;
let renderer: Renderer | null = null;
let cooldown = 0;
let displayedFps = 0;
let framesSinceTick = 0;
let lastFpsTick = performance.now();
let tickCount = 0;

canvas.tabIndex = 0;
canvas.focus();
window.addEventListener('keydown', () => canvas.focus());

screens.onTitleStart(() => {
  run.start();
  startNewFight();
});
screens.onEndRestart(() => {
  run.restart();
  showPhase();
});

showPhase();

function showPhase() {
  // Hide every overlay; show the one for the current phase.
  screens.hide('title');
  screens.hide('pick');
  screens.hide('end');
  screens.hide('hud');
  const state = run.getState();
  if (state.phase === 'title') {
    screens.show('title');
  } else if (state.phase === 'arena') {
    screens.show('hud');
    // arena was started by startNewFight(); HUD updates in loop.
  } else if (state.phase === 'upgrade_pick') {
    const choices = state.pendingPickChoices.map((id) => ({ id, def: getUpgradeDef(id)! }));
    screens.setPickChoices(choices, (id) => {
      run.pickUpgrade(id);
      startNewFight();
    });
    screens.show('pick');
  } else if (state.phase === 'run_end') {
    screens.updateEnd({
      outcome: state.outcome ?? 'lost',
      fightReached: state.fightIndex + 1,
      totalFights: FIGHTS_PER_RUN,
      upgrades: state.upgrades.map((u) => {
        const def = getUpgradeDef(u.id);
        if (!def) return u.id;
        return u.stacks > 1 ? `${def.name} x${u.stacks}` : def.name;
      }),
    });
    screens.show('end');
  }
}

function startNewFight() {
  const playerCfg = run.getPlayerConfig();
  const enemies = run.getFightSpawnList();
  arena = createArena({
    LX,
    LY,
    seed: (Date.now() & 0xffffffff) ^ (run.getState().fightIndex * 2654435761),
    player: playerCfg,
    enemies,
    wrap: true,
  });
  renderer = createRenderer(canvas, PALETTE_SIZE);
  cooldown = 0;
  tickCount = 0;
  // Update debug panel swatches to match the renderer's palette.
  debug.setSwatch(1, swatchForCellId(1, PALETTE_SIZE));
  for (let i = 0; i < enemies.length; i++) {
    debug.setSwatch(2 + i, swatchForCellId(2 + i, PALETTE_SIZE));
  }
  showPhase();
  requestAnimationFrame(loop);
}

function loop() {
  if (!arena || !renderer) return;
  const phase = run.getState().phase;
  if (phase !== 'arena') return;            // stop the loop on any non-arena phase

  const inp = input.poll();

  // Fire bullets only when not engulfing.
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
        size: arena.player.bulletSize,
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

  // HUD update.
  if (player) {
    const runState = run.getState();
    screens.updateHud({
      fightIndex: runState.fightIndex,
      totalFights: FIGHTS_PER_RUN,
      vol: player.vol,
      targetVol: player.targetVol,
      upgrades: runState.upgrades.map((u) => {
        const def = getUpgradeDef(u.id);
        if (!def) return u.id;
        return u.stacks > 1 ? `${def.name} x${u.stacks}` : def.name;
      }),
    });
  }

  // Debug panel.
  const canFire =
    !inp.shouldEngulf &&
    cooldown === 0 &&
    !!player &&
    player.targetVol >= BULLET_MIN_VOL;
  debug.update(arena.state, {
    fps: displayedFps,
    tick: tickCount,
    status: arena.getStatus(),
    cooldown,
    canFire,
  });

  // Status check: did this tick end the fight?
  const status = arena.getStatus();
  if (status === 'won') {
    run.winFight();
    showPhase();
    return;
  }
  if (status === 'lost') {
    run.loseFight();
    showPhase();
    return;
  }

  requestAnimationFrame(loop);
}

// Mirrors the renderer's palette logic so debug swatches match on-canvas colors.
//   cell id 1 (player) = red (hue 0).
//   cell ids 2+ = spread across cool half of the wheel.
function swatchForCellId(cellId: number, paletteSize: number): string {
  if (cellId === 1) return hsvCss(0);
  const enemyIdx = cellId - 2;
  const enemyCount = Math.max(1, paletteSize - 1);
  const HUE_LO = 0.42;
  const HUE_HI = 0.95;
  const hue = enemyCount === 1 ? 0.55 : HUE_LO + (HUE_HI - HUE_LO) * (enemyIdx / (enemyCount - 1));
  return hsvCss(hue);
}

function hsvCss(h: number): string {
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
