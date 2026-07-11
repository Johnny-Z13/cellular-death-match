import { ARCHETYPE_INFO, EGG_ARCHETYPES } from '../content/enemies';

const CELL_SIZE = 13;
const STEP_MS = 105;

type TitlePaletteName = 'egg-duotone' | 'egg-spectrum';

interface TitlePalette {
  colors: string[];
  opacity: number;
  composite: GlobalCompositeOperation;
}

const rgb = ([r, g, b]: [number, number, number]): string => `rgb(${r} ${g} ${b})`;

// Palette experiments live here. The canvas data-palette attribute in index.html
// selects the active treatment, so comparing the restrained and full egg sets is
// a one-word swap. Values come from the canonical egg UI palette, never copies.
const TITLE_PALETTES: Record<TitlePaletteName, TitlePalette> = {
  'egg-duotone': {
    colors: [rgb(ARCHETYPE_INFO.swarmlet.color), rgb(ARCHETYPE_INFO.mirror.color)],
    opacity: 0.5,
    composite: 'source-over',
  },
  'egg-spectrum': {
    colors: EGG_ARCHETYPES.map((archetype) => rgb(ARCHETYPE_INFO[archetype].color)),
    opacity: 0.66,
    composite: 'lighter',
  },
};

export function createTitleAutomata(): void {
  const canvas = document.getElementById('title-automata');
  const screen = document.getElementById('screen-title');
  if (!(canvas instanceof HTMLCanvasElement) || !screen) return;

  const context = canvas.getContext('2d');
  if (!context) return;

  const previewPalette = new URLSearchParams(window.location.search).get('titlePalette') as TitlePaletteName | null;
  const paletteName = previewPalette ?? canvas.dataset.palette as TitlePaletteName;
  const palette = TITLE_PALETTES[paletteName] ?? TITLE_PALETTES['egg-duotone'];

  let cols = 0;
  let rows = 0;
  let cells = new Uint8Array();
  let next = new Uint8Array();
  let frame = 0;
  let lastStep = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const seedColony = (x: number, y: number, radius: number, species: number): void => {
    const radiusSq = radius * radius;
    for (let oy = -radius; oy <= radius; oy += 1) {
      for (let ox = -radius; ox <= radius; ox += 1) {
        if (ox * ox + oy * oy > radiusSq || Math.random() < 0.22) continue;
        const px = (x + ox + cols) % cols;
        const py = (y + oy + rows) % rows;
        cells[py * cols + px] = species;
      }
    }
  };

  const resize = (): void => {
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * scale);
    canvas.height = Math.round(canvas.clientHeight * scale);
    cols = Math.max(1, Math.ceil(canvas.clientWidth / CELL_SIZE));
    rows = Math.max(1, Math.ceil(canvas.clientHeight / CELL_SIZE));
    cells = new Uint8Array(cols * rows);
    next = new Uint8Array(cells.length);
    const colonyCount = Math.max(6, palette.colors.length);
    for (let colony = 1; colony <= colonyCount; colony += 1) {
      const species = ((colony - 1) % palette.colors.length) + 1;
      seedColony(
        Math.floor((cols * (colony * 0.21 + 0.05)) % cols),
        Math.floor(rows * (0.2 + (colony % 3) * 0.27)),
        Math.max(4, Math.floor(Math.min(cols, rows) * 0.12)),
        species,
      );
    }
  };

  const step = (): void => {
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const counts = new Array<number>(palette.colors.length + 1).fill(0);
        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            if (ox === 0 && oy === 0) continue;
            const neighbor = cells[((y + oy + rows) % rows) * cols + ((x + ox + cols) % cols)] ?? 0;
            counts[neighbor] = (counts[neighbor] ?? 0) + 1;
          }
        }
        const index = y * cols + x;
        const current = cells[index] ?? 0;
        if (current > 0) {
          const neighbors = counts[current] ?? 0;
          next[index] = neighbors >= 2 && neighbors <= 5 ? current : 0;
          continue;
        }
        let dominant = 0;
        for (let species = 1; species < counts.length; species += 1) {
          if (counts[species] === 3 || (counts[species] === 4 && Math.random() < 0.18)) dominant = species;
        }
        next[index] = dominant;
      }
    }
    [cells, next] = [next, cells];
  };

  const draw = (): void => {
    const sx = canvas.width / cols;
    const sy = canvas.height / rows;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#020607';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = palette.composite;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const species = cells[y * cols + x];
        if (!species) continue;
        const pulse = 0.68 + Math.sin(frame * 0.045 + x * 0.23 + y * 0.17) * 0.14;
        context.globalAlpha = pulse * palette.opacity;
        context.fillStyle = palette.colors[species - 1] ?? palette.colors[0] ?? '#48c9ff';
        context.fillRect(x * sx + 1, y * sy + 1, Math.max(1, sx - 2), Math.max(1, sy - 2));
      }
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
  };

  const animate = (now: number): void => {
    if (screen.classList.contains('visible')) {
      if (!reducedMotion && now - lastStep >= STEP_MS) {
        step();
        lastStep = now;
      }
      draw();
      frame += 1;
    }
    requestAnimationFrame(animate);
  };

  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse' && event.buttons === 0 && Math.random() > 0.18) return;
    const rect = canvas.getBoundingClientRect();
    seedColony(
      Math.floor(((event.clientX - rect.left) / rect.width) * cols),
      Math.floor(((event.clientY - rect.top) / rect.height) * rows),
      3,
      1 + Math.floor(Math.random() * palette.colors.length),
    );
  });

  window.addEventListener('resize', resize);
  resize();
  draw();
  requestAnimationFrame(animate);
}
