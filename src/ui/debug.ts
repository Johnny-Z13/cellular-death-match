import type { SimState, CellId } from '../sim/types';

export interface DebugInfo {
  fps: number;
  tick: number;
  status: string;
}

export interface DebugDiscoveryInfo {
  persistenceEnabled: boolean;
  discoveredCount: number;
  revealAll: boolean;
}

export interface DebugPanel {
  update(state: SimState, info: DebugInfo): void;
  setSwatch(cellId: CellId, color: string): void;
  updateDiscoveries(info: DebugDiscoveryInfo): void;
  onDiscoveryPersistenceChange(handler: (enabled: boolean) => void): void;
  onClearDiscoveries(handler: () => void): void;
  onRevealDiscoveries(handler: () => void): void;
}

export function createDebugPanel(): DebugPanel {
  const get = (id: string): HTMLElement => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`debug panel: missing #${id}`);
    return el;
  };
  const getInput = (id: string): HTMLInputElement => {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLInputElement)) throw new Error(`debug panel: missing #${id}`);
    return el;
  };

  const fps        = get('dbg-fps');
  const tickEl     = get('dbg-tick');
  const status     = get('dbg-status');
  const boundary   = get('dbg-boundary');
  const pSwatch    = get('dbg-p-swatch');
  const pVol       = get('dbg-p-vol');
  const pTvol      = get('dbg-p-tvol');
  const pCenter    = get('dbg-p-center');
  const eSwatch    = get('dbg-e-swatch');
  const eVol       = get('dbg-e-vol');
  const eTvol      = get('dbg-e-tvol');
  const eCenter    = get('dbg-e-center');
  const persistDiscoveries = getInput('dbg-persist-discoveries');
  const clearDiscoveries = get('dbg-clear-discoveries');
  const revealDiscoveries = get('dbg-reveal-discoveries');
  const discoveryStatus = get('dbg-discovery-status');

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
      boundary.textContent  = String(state.grid.boundary.size);

      const player = state.cells.get(1);
      if (player) {
        pVol.textContent      = String(player.vol);
        pTvol.textContent     = fmt2(player.targetVol);
        pCenter.textContent   = fmtVec(player.center);
      }

      const enemy = state.cells.get(2);
      if (enemy) {
        eVol.textContent      = String(enemy.vol);
        eTvol.textContent     = fmt2(enemy.targetVol);
        eCenter.textContent   = fmtVec(enemy.center);
      }
    },
    updateDiscoveries(info) {
      persistDiscoveries.checked = info.persistenceEnabled;
      const mode = info.persistenceEnabled ? 'saved' : 'run-local';
      const reveal = info.revealAll ? ' / reveal-all' : '';
      discoveryStatus.textContent = `discoveries: ${mode} / ${info.discoveredCount}${reveal}`;
    },
    onDiscoveryPersistenceChange(handler) {
      persistDiscoveries.addEventListener('change', () => handler(persistDiscoveries.checked));
    },
    onClearDiscoveries(handler) {
      clearDiscoveries.addEventListener('click', handler);
    },
    onRevealDiscoveries(handler) {
      revealDiscoveries.addEventListener('click', handler);
    },
  };
}
