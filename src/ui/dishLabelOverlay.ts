// Renders a dish label plan as DOM over the canvas. Nodes are reused by key
// and moved with percentage offsets, so a 10Hz refresh never rebuilds the
// overlay. The inspect card is a single reused node.
import type { PlannedLabel } from './dishLabels';

export interface DishInspectInfo {
  name: string;
  role: string;
  behavior: string;
  color: string;
  size: number;
  trend: 'growing' | 'steady' | 'shrinking';
  isGoal: boolean;
}

export interface DishLabelOverlay {
  render(plan: readonly PlannedLabel[]): void;
  setEnabled(enabled: boolean): void;
  setDrawing(drawing: boolean): void;
  /** Show the inspect card for a culture at a point inside the dish (CSS px
   *  relative to the dish's top-left), or hide it with null. */
  inspect(info: DishInspectInfo | null, x?: number, y?: number): void;
  /** Pin the overlay to the canvas box; some layouts draw the canvas smaller
   *  than the dish stage, and tags must land on the pixels, not the stage. */
  fitTo(canvas: HTMLCanvasElement): void;
  clear(): void;
}

export function createDishLabelOverlay(root: HTMLElement, card: HTMLElement): DishLabelOverlay {
  const nodes = new Map<string, HTMLElement>();
  const cardName = document.createElement('strong');
  const cardRole = document.createElement('span');
  const cardBehavior = document.createElement('p');
  const cardStats = document.createElement('span');
  cardName.className = 'dish-inspect-name';
  cardRole.className = 'dish-inspect-role';
  cardBehavior.className = 'dish-inspect-behavior';
  cardStats.className = 'dish-inspect-stats';
  card.replaceChildren(cardName, cardRole, cardBehavior, cardStats);

  function nodeFor(label: PlannedLabel): HTMLElement {
    let node = nodes.get(label.key);
    if (!node) {
      node = document.createElement('span');
      const dot = document.createElement('i');
      dot.className = 'dish-label-dot';
      const icon = document.createElement('b');
      icon.className = 'dish-label-icon';
      const text = document.createElement('span');
      text.className = 'dish-label-text';
      node.append(dot, icon, text);
      root.append(node);
      nodes.set(label.key, node);
    }
    return node;
  }

  return {
    render(plan) {
      const live = new Set<string>();
      for (const label of plan) {
        live.add(label.key);
        const node = nodeFor(label);
        const className = `dish-label dish-label--${label.kind} is-${label.placement}`;
        if (node.className !== className) node.className = className;
        node.style.left = `${label.xPct.toFixed(2)}%`;
        node.style.top = `${label.yPct.toFixed(2)}%`;
        node.style.setProperty('--label-color', label.color);
        const icon = node.children[1] as HTMLElement;
        const text = node.children[2] as HTMLElement;
        if (icon.textContent !== label.icon) icon.textContent = label.icon;
        if (text.textContent !== label.text) text.textContent = label.text;
      }
      for (const [key, node] of nodes) {
        if (live.has(key)) continue;
        node.remove();
        nodes.delete(key);
      }
    },
    setEnabled(enabled) {
      root.classList.toggle('is-off', !enabled);
      if (!enabled) card.hidden = true;
    },
    setDrawing(drawing) {
      root.classList.toggle('is-drawing', drawing);
    },
    inspect(info, x = 0, y = 0) {
      if (!info) {
        card.hidden = true;
        return;
      }
      cardName.textContent = info.name;
      cardRole.textContent = info.isGoal ? `${info.role} · counts toward goal` : info.role;
      cardBehavior.textContent = info.behavior;
      cardStats.textContent = `Size ${Math.round(info.size)} · ${info.trend}`;
      card.style.setProperty('--label-color', info.color);
      card.classList.toggle('is-goal', info.isGoal);
      card.hidden = false;
      const stage = root.getBoundingClientRect();
      const width = card.offsetWidth || 220;
      const height = card.offsetHeight || 96;
      const left = x + 16 + width > stage.width ? x - 16 - width : x + 16;
      const top = Math.min(Math.max(4, y - height / 2), stage.height - height - 4);
      card.style.left = `${Math.max(4, left)}px`;
      card.style.top = `${top}px`;
    },
    fitTo(canvas) {
      const box = `${canvas.offsetLeft}px ${canvas.offsetTop}px ${canvas.offsetWidth}px ${canvas.offsetHeight}px`;
      if (root.dataset.box === box) return;
      root.dataset.box = box;
      root.style.inset = 'auto';
      root.style.left = `${canvas.offsetLeft}px`;
      root.style.top = `${canvas.offsetTop}px`;
      root.style.width = `${canvas.offsetWidth}px`;
      root.style.height = `${canvas.offsetHeight}px`;
    },
    clear() {
      for (const node of nodes.values()) node.remove();
      nodes.clear();
      card.hidden = true;
    },
  };
}
