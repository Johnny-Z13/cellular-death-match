import {
  createMergeLabRuntime,
  type MergeLabRuntime,
  type MergeLabUpgradeChoice,
} from '../game/mergeLab';
import type { Analytics } from '../platform/analytics';
import type { CrazyGamesPlatform } from '../platform/crazyGames';
import type { GameStorage } from '../platform/storage';

export interface MergeLabExperienceOptions {
  canvas: HTMLCanvasElement;
  layout: HTMLElement;
  storage: GameStorage;
  analytics: Analytics;
  platform: CrazyGamesPlatform;
  nowMs?: () => number;
  eventNowMs?: () => number;
  onEnterEcosystem(choice: MergeLabUpgradeChoice): void;
}

export interface MergeLabExperience {
  runtime: MergeLabRuntime;
  destroy(): void;
}

interface Point {
  x: number;
  y: number;
}

type DragTarget = 'left' | 'right' | 'tray';

const LEFT_CELL: Point = { x: 0.38, y: 0.58 };
const RIGHT_CELL: Point = { x: 0.62, y: 0.58 };
const RING: Point = { x: 0.5, y: 0.58 };
const TRAY_CELL: Point = { x: 0.5, y: 0.86 };
const NUTRIENT: Point = { x: 0.53, y: 0.69 };
const THREAT_START: Point = { x: 0.5, y: 0.19 };
const DRAG_RADIUS = 0.085;
const MERGE_RADIUS = 0.12;
const FEED_RADIUS = 0.09;

export function startMergeLabExperience(options: MergeLabExperienceOptions): MergeLabExperience {
  const nowMs = options.nowMs ?? defaultNowMs;
  const eventNowMs = options.eventNowMs ?? Date.now;
  const runtime = createMergeLabRuntime(options.storage, options.analytics, eventNowMs());
  const ctx = options.canvas.getContext('2d');
  if (!ctx) throw new Error('Merge Lab requires a 2D canvas context');
  const drawingContext = ctx;

  const overlay = createOverlay(options.layout);
  const hiddenClassicUi = suppressClassicUi(options.layout);
  let destroyed = false;
  let dragTarget: DragTarget | null = null;
  let dragPoint: Point | null = null;
  let showIdleGhost = false;
  const idleTimer = window.setTimeout(() => {
    if (runtime.state.run.firstInputAtMs === null) {
      showIdleGhost = true;
      overlay.root.classList.add('merge-lab-idle');
    }
  }, 3000);

  document.title = 'Merge Lab: Cellular Death Match';
  document.documentElement.dataset.launch = 'merge-lab';
  options.layout.dataset.screen = 'merge-lab';
  options.layout.classList.add('merge-lab-active');
  updateHud(overlay, runtime);
  options.analytics.record('first_frame', { mode: 'merge_lab' });
  options.analytics.record('gameplay_start', { mode: 'merge_lab' });
  options.platform.startGameplay('merge-lab-first-playable');

  const pointerDown = (event: PointerEvent) => {
    const pos = pointerToCanvasPoint(options.canvas, event);
    showIdleGhost = false;
    overlay.root.classList.remove('merge-lab-idle');
    window.clearTimeout(idleTimer);
    runtime.recordFirstInput(eventNowMs());
    if (
      runtime.state.run.firstMergeAtMs !== null
      && runtime.state.run.firstFeedAtMs === null
      && near(pos, NUTRIENT, FEED_RADIUS)
    ) {
      runtime.performFeed(eventNowMs());
      flashReward(overlay, '+10 DNA');
      updateHud(overlay, runtime);
      render();
      return;
    }
    if (runtime.state.flags.noviceTopUpClaimed && runtime.state.run.secondMergeAtMs === null) {
      if (near(pos, RING, MERGE_RADIUS * 0.72)) {
        performSecondMerge();
        return;
      }
      const secondDragTarget = dragTargetAt(pos);
      dragTarget = secondDragTarget === 'tray' ? null : secondDragTarget;
      dragPoint = dragTarget ? pos : null;
      if (dragTarget) {
        options.canvas.setPointerCapture(event.pointerId);
        render();
      }
      return;
    }
    if (runtime.state.run.firstMergeAtMs !== null) return;
    if (near(pos, RING, MERGE_RADIUS * 0.72)) {
      performMerge();
      return;
    }
    dragTarget = dragTargetAt(pos);
    dragPoint = dragTarget ? pos : null;
    if (dragTarget) {
      options.canvas.setPointerCapture(event.pointerId);
      render();
    }
  };

  const pointerMove = (event: PointerEvent) => {
    if (!dragTarget) return;
    dragPoint = pointerToCanvasPoint(options.canvas, event);
    render();
  };

  const pointerUp = (event: PointerEvent) => {
    if (!dragTarget) return;
    const pos = pointerToCanvasPoint(options.canvas, event);
    const secondMerge = runtime.state.flags.noviceTopUpClaimed && runtime.state.run.secondMergeAtMs === null;
    const validDrop = near(pos, RING, MERGE_RADIUS)
      || (!secondMerge && near(pos, oppositeCell(dragTarget), MERGE_RADIUS));
    dragTarget = null;
    dragPoint = null;
    try { options.canvas.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    if (validDrop) {
      if (secondMerge) performSecondMerge();
      else performMerge();
    } else {
      overlay.root.classList.add('merge-lab-invalid');
      window.setTimeout(() => overlay.root.classList.remove('merge-lab-invalid'), 220);
      render();
    }
  };

  const keyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    showIdleGhost = false;
    overlay.root.classList.remove('merge-lab-idle');
    window.clearTimeout(idleTimer);
    runtime.recordFirstInput(eventNowMs());
    if (runtime.state.run.firstMergeAtMs === null) {
      performMerge();
    } else if (runtime.state.run.firstFeedAtMs === null) {
      runtime.performFeed(eventNowMs());
      flashReward(overlay, '+10 DNA');
      updateHud(overlay, runtime);
      render();
    } else if (!runtime.state.flags.noviceTopUpClaimed) {
      performUpgrade('egg_1');
    } else if (runtime.state.run.secondMergeAtMs === null) {
      performSecondMerge();
    }
  };

  const upgradeClick = (event: MouseEvent) => {
    const target = event.target instanceof HTMLElement
      ? event.target.closest<HTMLButtonElement>('[data-merge-lab-upgrade]')
      : null;
    if (!target) return;
    const choice = target.dataset.mergeLabUpgrade;
    if (choice !== 'egg_1' && choice !== 'red_buffer_1') return;
    runtime.recordFirstInput(eventNowMs());
    performUpgrade(choice);
  };

  const enterEcosystemClick = () => {
    if (runtime.state.run.secondMergeAtMs === null) return;
    const choice = runtime.state.upgrade.firstChoice ?? 'egg_1';
    overlay.continueButton.disabled = true;
    overlay.continueButton.textContent = 'Opening live dish...';
    overlay.status.textContent = 'Transferring your culture and upgrade into the ecosystem.';
    options.analytics.record('ecosystem_handoff', { choice });
    options.onEnterEcosystem(choice);
  };

  function performMerge(): void {
    runtime.performFirstMerge(eventNowMs());
    overlay.root.classList.add('merge-lab-merged');
    flashReward(overlay, '+70 DNA');
    updateHud(overlay, runtime);
    render();
  }

  function performUpgrade(choice: MergeLabUpgradeChoice): void {
    runtime.performNoviceUpgrade(choice, eventNowMs());
    overlay.root.classList.add('merge-lab-upgraded');
    flashReward(overlay, '+30 DNA');
    updateHud(overlay, runtime);
    render();
  }

  function performSecondMerge(): void {
    runtime.performSecondMerge(eventNowMs());
    overlay.root.classList.add('merge-lab-second-merged');
    flashReward(overlay, '+90 DNA');
    updateHud(overlay, runtime);
    render();
  }

  function render(): void {
    drawMergeLab(drawingContext, options.canvas, runtime, dragTarget, dragPoint, nowMs(), showIdleGhost);
  }

  options.canvas.addEventListener('pointerdown', pointerDown);
  options.canvas.addEventListener('pointermove', pointerMove);
  options.canvas.addEventListener('pointerup', pointerUp);
  options.canvas.addEventListener('pointercancel', pointerUp);
  options.canvas.addEventListener('keydown', keyDown);
  overlay.upgradePanel.addEventListener('click', upgradeClick);
  overlay.continueButton.addEventListener('click', enterEcosystemClick);

  let raf = window.requestAnimationFrame(function frame() {
    if (destroyed) return;
    render();
    raf = window.requestAnimationFrame(frame);
  });

  return {
    runtime,
    destroy() {
      destroyed = true;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(idleTimer);
      options.platform.stopGameplay('merge-lab-destroy');
      options.canvas.removeEventListener('pointerdown', pointerDown);
      options.canvas.removeEventListener('pointermove', pointerMove);
      options.canvas.removeEventListener('pointerup', pointerUp);
      options.canvas.removeEventListener('pointercancel', pointerUp);
      options.canvas.removeEventListener('keydown', keyDown);
      overlay.upgradePanel.removeEventListener('click', upgradeClick);
      overlay.continueButton.removeEventListener('click', enterEcosystemClick);
      overlay.root.remove();
      for (const item of hiddenClassicUi) {
        item.element.hidden = item.wasHidden;
        if (item.ariaHidden === null) item.element.removeAttribute('aria-hidden');
        else item.element.setAttribute('aria-hidden', item.ariaHidden);
      }
      options.layout.classList.remove('merge-lab-active');
    },
  };
}

function drawMergeLab(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  runtime: MergeLabRuntime,
  dragTarget: DragTarget | null,
  dragPoint: Point | null,
  nowMs: number,
  showIdleGhost: boolean,
): void {
  const w = canvas.width;
  const h = canvas.height;
  const pulse = 0.5 + Math.sin(nowMs / 220) * 0.5;
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.48, w * 0.08, w * 0.5, h * 0.5, w * 0.54);
  bg.addColorStop(0, '#173940');
  bg.addColorStop(0.62, '#071418');
  bg.addColorStop(1, '#020506');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  drawDish(ctx, w, h);
  drawThreat(ctx, w, h, runtime.state.run.firstFeedAtMs !== null ? 0.52 : 1, nowMs);

  if (runtime.state.run.firstMergeAtMs === null || (runtime.state.flags.noviceTopUpClaimed && runtime.state.run.secondMergeAtMs === null)) {
    drawMergeRing(ctx, w, h, pulse);
    const secondMerge = runtime.state.flags.noviceTopUpClaimed && runtime.state.run.secondMergeAtMs === null;
    const tier = secondMerge ? 'II' : 'I';
    const color = secondMerge ? '#8dff6e' : '#4de1ff';
    drawCapsule(ctx, w, h, pointForDrag('left', dragTarget, dragPoint), color, tier, dragTarget === 'left');
    drawCapsule(ctx, w, h, pointForDrag('right', dragTarget, dragPoint), color, tier, dragTarget === 'right');
    if (!secondMerge) {
      drawTrayDock(ctx, w, h, pulse);
      drawCapsule(ctx, w, h, pointForDrag('tray', dragTarget, dragPoint), '#4de1ff', 'I', dragTarget === 'tray');
    }
    if (showIdleGhost && !secondMerge) drawGhostPath(ctx, w, h, pulse);
  } else {
    drawMergedCell(ctx, w, h, pulse, runtime.state.run.firstFeedAtMs !== null, runtime.state.run.secondMergeAtMs !== null);
    drawNutrient(ctx, w, h, runtime.state.run.firstFeedAtMs === null, pulse);
  }
}

function createOverlay(layout: HTMLElement): {
  root: HTMLElement;
  prompt: HTMLElement;
  dna: HTMLElement;
  atlas: HTMLElement;
  reward: HTMLElement;
  status: HTMLElement;
  upgradePanel: HTMLElement;
  continueButton: HTMLButtonElement;
} {
  const existing = layout.querySelector<HTMLElement>('.merge-lab-overlay');
  existing?.remove();
  const root = document.createElement('section');
  root.className = 'merge-lab-overlay';
  root.setAttribute('aria-label', 'Merge Lab onboarding');
  root.innerHTML = `
    <div class="merge-lab-hud" aria-live="polite">
      <span class="merge-lab-chip">DNA <strong data-merge-lab-dna>0</strong></span>
      <span class="merge-lab-chip" data-merge-lab-atlas-chip>Atlas <strong data-merge-lab-atlas>0/3</strong></span>
    </div>
    <div class="merge-lab-reward" data-merge-lab-reward aria-live="polite"></div>
    <div class="merge-lab-choice-panel" data-merge-lab-choice-panel hidden>
      <button type="button" data-merge-lab-upgrade="egg_1">Spore rack</button>
      <button type="button" data-merge-lab-upgrade="red_buffer_1">Control buffer</button>
    </div>
    <div class="merge-lab-complete-panel" data-merge-lab-complete-panel hidden>
      <button type="button" data-merge-lab-continue>Enter ecosystem</button>
    </div>
    <div class="merge-lab-prompt" data-merge-lab-prompt>Merge cells.</div>
    <div class="merge-lab-status" data-merge-lab-status>Drag matching cells together.</div>
  `;
  layout.append(root);
  return {
    root,
    prompt: root.querySelector('[data-merge-lab-prompt]')!,
    dna: root.querySelector('[data-merge-lab-dna]')!,
    atlas: root.querySelector('[data-merge-lab-atlas]')!,
    reward: root.querySelector('[data-merge-lab-reward]')!,
    status: root.querySelector('[data-merge-lab-status]')!,
    upgradePanel: root.querySelector('[data-merge-lab-choice-panel]')!,
    continueButton: root.querySelector('[data-merge-lab-continue]')!,
  };
}

function flashReward(overlay: ReturnType<typeof createOverlay>, message: string): void {
  overlay.reward.textContent = message;
  overlay.root.classList.remove('merge-lab-reward-pop');
  void overlay.root.offsetWidth;
  overlay.root.classList.add('merge-lab-reward-pop');
  window.setTimeout(() => overlay.root.classList.remove('merge-lab-reward-pop'), 950);
}

function suppressClassicUi(layout: HTMLElement): Array<{
  element: HTMLElement;
  wasHidden: boolean;
  ariaHidden: string | null;
}> {
  const selectors = [
    '.screen',
    '.toolbox',
    '.life-panel',
    '.ticker',
    '.hud',
    '.mobile-shell',
    '.notebook-button',
    '.fullscreen-button',
    '.options-button',
    '.options-panel',
    '.options-scrim',
  ].join(',');
  return Array.from(layout.querySelectorAll<HTMLElement>(selectors)).map((element) => {
    const previous = {
      element,
      wasHidden: element.hidden,
      ariaHidden: element.getAttribute('aria-hidden'),
    };
    element.hidden = true;
    element.setAttribute('aria-hidden', 'true');
    element.classList.remove('visible');
    return previous;
  });
}

function updateHud(
  overlay: ReturnType<typeof createOverlay>,
  runtime: MergeLabRuntime,
): void {
  const state = runtime.state;
  overlay.dna.textContent = String(state.run.dna);
  overlay.atlas.textContent = `${state.atlas.reveals}/3`;
  overlay.upgradePanel.hidden = true;
  overlay.continueButton.parentElement!.hidden = true;
  if (state.run.firstMergeAtMs === null) {
    overlay.prompt.textContent = 'Merge cells.';
    overlay.status.textContent = 'Drag matching cells together.';
  } else if (state.run.firstFeedAtMs === null) {
    overlay.prompt.textContent = 'Feed it.';
    overlay.status.textContent = '+70 DNA saved. Atlas reveal started.';
  } else if (!state.flags.noviceTopUpClaimed) {
    overlay.prompt.textContent = 'Choose upgrade.';
    overlay.status.textContent = '+80 DNA saved. This upgrade carries into the live dish.';
    overlay.upgradePanel.hidden = false;
  } else if (state.run.secondMergeAtMs === null) {
    overlay.prompt.textContent = 'Merge II cells.';
    overlay.status.textContent = '+110 DNA saved. Build the next sample.';
  } else {
    overlay.prompt.textContent = 'Culture ready.';
    overlay.status.textContent = '+200 DNA banked. Your first live ecosystem is ready.';
    overlay.continueButton.parentElement!.hidden = false;
  }
}

function pointerToCanvasPoint(canvas: HTMLCanvasElement, event: PointerEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / Math.max(1, rect.width),
    y: (event.clientY - rect.top) / Math.max(1, rect.height),
  };
}

function dragTargetAt(pos: Point): DragTarget | null {
  if (near(pos, LEFT_CELL, DRAG_RADIUS)) return 'left';
  if (near(pos, RIGHT_CELL, DRAG_RADIUS)) return 'right';
  if (near(pos, TRAY_CELL, DRAG_RADIUS)) return 'tray';
  return null;
}

function pointForDrag(target: DragTarget, active: DragTarget | null, dragPoint: Point | null): Point {
  if (target === active && dragPoint) return dragPoint;
  if (target === 'left') return LEFT_CELL;
  if (target === 'right') return RIGHT_CELL;
  return TRAY_CELL;
}

function oppositeCell(target: DragTarget): Point {
  if (target === 'left') return RIGHT_CELL;
  if (target === 'right') return LEFT_CELL;
  return RING;
}

function near(a: Point, b: Point, radius: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= radius;
}

function drawDish(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(142, 242, 255, 0.28)';
  ctx.lineWidth = Math.max(5, w * 0.012);
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.5, w * 0.43, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = Math.max(1, w * 0.004);
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.5, w * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawMergeRing(ctx: CanvasRenderingContext2D, w: number, h: number, pulse: number): void {
  ctx.save();
  ctx.strokeStyle = `rgba(255, 219, 112, ${0.65 + pulse * 0.3})`;
  ctx.lineWidth = Math.max(4, w * 0.009);
  ctx.setLineDash([w * 0.018, w * 0.012]);
  ctx.beginPath();
  ctx.arc(w * RING.x, h * RING.y, w * (0.105 + pulse * 0.01), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCapsule(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pos: Point,
  color: string,
  tier: string,
  active: boolean,
): void {
  const r = w * (active ? 0.055 : 0.048);
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = active ? 28 : 16;
  const grad = ctx.createRadialGradient(w * pos.x - r * 0.25, h * pos.y - r * 0.25, r * 0.1, w * pos.x, h * pos.y, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.28, color);
  grad.addColorStop(1, '#0b5060');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(w * pos.x, h * pos.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.72)';
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#001013';
  ctx.font = `700 ${Math.max(16, w * 0.035)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tier, w * pos.x, h * pos.y + 1);
  ctx.restore();
}

function drawTrayDock(ctx: CanvasRenderingContext2D, w: number, h: number, pulse: number): void {
  const x = w * TRAY_CELL.x;
  const y = h * TRAY_CELL.y;
  const width = w * 0.22;
  const height = h * 0.09;
  ctx.save();
  ctx.fillStyle = 'rgba(6, 14, 16, 0.78)';
  ctx.strokeStyle = `rgba(255, 219, 112, ${0.34 + pulse * 0.22})`;
  ctx.lineWidth = Math.max(2, w * 0.004);
  roundRect(ctx, x - width / 2, y - height / 2, width, height, w * 0.02);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 244, 196, 0.74)';
  ctx.font = `700 ${Math.max(9, w * 0.018)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('NEXT', x, y + height * 0.2);
  ctx.restore();
}

function drawMergedCell(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pulse: number,
  fed: boolean,
  complete = false,
): void {
  const pos = RING;
  const r = w * (complete ? 0.098 : fed ? 0.085 : 0.073) + pulse * w * 0.006;
  ctx.save();
  ctx.shadowColor = complete ? '#ffd96a' : fed ? '#9dff6e' : '#4de1ff';
  ctx.shadowBlur = complete ? 44 : fed ? 34 : 24;
  const grad = ctx.createRadialGradient(w * pos.x - r * 0.3, h * pos.y - r * 0.28, r * 0.2, w * pos.x, h * pos.y, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.22, complete ? '#ffe98c' : fed ? '#a8ff76' : '#7cf3ff');
  grad.addColorStop(0.72, '#1d8393');
  grad.addColorStop(1, '#093039');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(w * pos.x, h * pos.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.76)';
  ctx.lineWidth = Math.max(3, w * 0.006);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#021116';
  ctx.font = `800 ${Math.max(18, w * 0.04)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(complete ? 'III' : 'II', w * pos.x, h * pos.y + 1);
  ctx.restore();
}

function drawNutrient(ctx: CanvasRenderingContext2D, w: number, h: number, active: boolean, pulse: number): void {
  if (!active) return;
  const r = w * (0.038 + pulse * 0.006);
  ctx.save();
  ctx.shadowColor = '#d4ff48';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#d4ff48';
  ctx.beginPath();
  ctx.arc(w * NUTRIENT.x, h * NUTRIENT.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.stroke();
  ctx.restore();
}

function drawThreat(ctx: CanvasRenderingContext2D, w: number, h: number, pressure: number, nowMs: number): void {
  const wobble = Math.sin(nowMs / 260) * 0.01;
  const pos = { x: THREAT_START.x + wobble, y: THREAT_START.y + (1 - pressure) * -0.035 };
  ctx.save();
  ctx.shadowColor = '#ff526d';
  ctx.shadowBlur = 16 * pressure;
  ctx.fillStyle = `rgba(255, 82, 109, ${0.46 * pressure})`;
  ctx.beginPath();
  ctx.arc(w * pos.x, h * pos.y, w * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 198, 205, ${0.7 * pressure})`;
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.stroke();
  ctx.restore();
}

function drawGhostPath(ctx: CanvasRenderingContext2D, w: number, h: number, pulse: number): void {
  ctx.save();
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + pulse * 0.18})`;
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.setLineDash([w * 0.01, w * 0.014]);
  ctx.beginPath();
  ctx.moveTo(w * LEFT_CELL.x, h * LEFT_CELL.y);
  ctx.quadraticCurveTo(w * 0.44, h * 0.5, w * RING.x, h * RING.y);
  ctx.stroke();
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function defaultNowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}
