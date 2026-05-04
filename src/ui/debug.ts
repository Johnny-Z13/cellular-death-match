import type { SimState, CellId } from '../sim/types';
import { shortestVec } from '../game/geometry';

export interface DebugInfo {
  fps: number;
  tick: number;
  status: string;
  cooldown: number;
  canFire: boolean;
}

export interface DebugPanel {
  update(state: SimState, info: DebugInfo): void;
  setSwatch(cellId: CellId, color: string): void;
}

export function createDebugPanel(): DebugPanel {
  const get = (id: string): HTMLElement => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`debug panel: missing #${id}`);
    return el;
  };

  const fps        = get('dbg-fps');
  const tickEl     = get('dbg-tick');
  const status     = get('dbg-status');
  const bullets    = get('dbg-bullets');
  const boundary   = get('dbg-boundary');
  const pSwatch    = get('dbg-p-swatch');
  const pVol       = get('dbg-p-vol');
  const pTvol      = get('dbg-p-tvol');
  const pCenter    = get('dbg-p-center');
  const pVec       = get('dbg-p-vec');
  const pEngulf    = get('dbg-p-engulf');
  const pCanFire   = get('dbg-p-canfire');
  const pCooldown  = get('dbg-p-cooldown');
  const eSwatch    = get('dbg-e-swatch');
  const eVol       = get('dbg-e-vol');
  const eTvol      = get('dbg-e-tvol');
  const eCenter    = get('dbg-e-center');
  const eVec       = get('dbg-e-vec');
  const eEngulf    = get('dbg-e-engulf');
  const eDist      = get('dbg-e-dist');

  const fmt2 = (n: number): string => n.toFixed(2);
  const fmtVec = (v: readonly [number, number]): string =>
    `[${fmt2(v[0])}, ${fmt2(v[1])}]`;

  return {
    setSwatch(cellId, color) {
      if (cellId === 1) pSwatch.style.background = color;
      else if (cellId === 2) eSwatch.style.background = color;
    },
    update(state, info) {
      fps.textContent       = String(info.fps);
      tickEl.textContent    = String(info.tick);
      status.textContent    = info.status;
      bullets.textContent   = String(state.bullets.length);
      boundary.textContent  = String(state.grid.boundary.size);

      const player = state.cells.get(1);
      if (player) {
        pVol.textContent      = String(player.vol);
        pTvol.textContent     = fmt2(player.targetVol);
        pCenter.textContent   = fmtVec(player.center);
        pVec.textContent      = fmtVec(player.intent.vec);
        pEngulf.textContent   = fmt2(player.intent.engulfMultiplier);
        pCanFire.textContent  = info.canFire ? 'yes' : 'no';
        pCooldown.textContent = String(info.cooldown);
      }

      const enemy = state.cells.get(2);
      if (enemy) {
        eVol.textContent      = String(enemy.vol);
        eTvol.textContent     = fmt2(enemy.targetVol);
        eCenter.textContent   = fmtVec(enemy.center);
        eVec.textContent      = fmtVec(enemy.intent.vec);
        eEngulf.textContent   = fmt2(enemy.intent.engulfMultiplier);
        if (player) {
          const v = shortestVec(enemy.center, player.center, state.grid.LX, state.grid.LY);
          const dist = Math.hypot(v[0], v[1]);
          eDist.textContent = fmt2(dist);
        } else {
          eDist.textContent = '—';
        }
      }
    },
  };
}
