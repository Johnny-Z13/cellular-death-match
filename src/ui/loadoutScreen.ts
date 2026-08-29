import type { StrainLibrary } from '../game/strainLibrary';

export interface LoadoutScreenOptions {
  labelForStrain: (strain: string) => string;
  descriptionForStrain: (strain: string) => string;
  colorForStrain: (strain: string) => string;
  artForStrain?: (strain: string) => { src: string; alt: string } | null;
}

/**
 * Build a loadout selection DOM element for the pre-run screen.
 * Players pick which strains to bring into their next run.
 */
export function renderLoadoutScreen(
  library: StrainLibrary,
  onConfirm: (loadout: string[]) => void,
  options: LoadoutScreenOptions,
): HTMLElement {
  const root = document.createElement('div');
  root.className = 'loadout-screen';

  const available = library.getAvailableStrains();
  const slots = library.getLoadoutSlots();
  const selected = new Set(library.getPlayableLoadout());

  function render(): void {
    root.replaceChildren();

    const title = document.createElement('h2');
    title.className = 'screen-title';
    title.textContent = 'Archived Specimens';

    const subtitle = document.createElement('p');
    subtitle.className = 'loadout-subtitle';
    subtitle.textContent = `Bring up to ${slots} decoded specimens. Standard lab-stock eggs are always supplied.`;

    const count = document.createElement('p');
    count.className = 'loadout-count';
    count.textContent = `${selected.size}/${slots} archived`;

    const grid = document.createElement('div');
    grid.className = 'loadout-grid';

    for (const strain of available) {
      const button = document.createElement('button');
      const isSelected = selected.has(strain);
      button.className = `loadout-strain${isSelected ? ' selected' : ''}`;
      button.type = 'button';
      button.dataset.strain = strain;
      button.setAttribute('aria-pressed', String(isSelected));
      button.style.setProperty('--strain-color', options.colorForStrain(strain));
      button.disabled = !isSelected && selected.size >= slots;

      const art = options.artForStrain?.(strain) ?? null;
      const marker = art ? document.createElement('img') : document.createElement('span');
      marker.className = art ? 'loadout-strain-portrait' : 'loadout-strain-swatch';
      if (art) {
        const portrait = marker as HTMLImageElement;
        portrait.src = art.src;
        portrait.alt = art.alt;
        portrait.width = 384;
        portrait.height = 384;
      } else {
        marker.setAttribute('aria-hidden', 'true');
      }

      const copy = document.createElement('span');
      copy.className = 'loadout-strain-copy';
      const label = document.createElement('strong');
      label.textContent = options.labelForStrain(strain);
      const description = document.createElement('small');
      description.textContent = options.descriptionForStrain(strain);
      copy.append(label, description);

      button.append(marker, copy);
      button.addEventListener('click', () => {
        if (selected.has(strain)) {
          selected.delete(strain);
        } else if (selected.size < slots) {
          selected.add(strain);
        }
        render();
      });

      grid.append(button);
    }

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'loadout-confirm screen-button';
    confirmBtn.type = 'button';
    confirmBtn.disabled = selected.size === 0;
    confirmBtn.textContent = `Start Run (${selected.size}/${slots})`;
    confirmBtn.addEventListener('click', () => {
      if (selected.size === 0) return;
      const loadout = [...selected];
      library.setLoadout(loadout);
      library.save();
      onConfirm(loadout);
    });

    root.append(title, subtitle, count, grid, confirmBtn);
  }

  render();
  return root;
}
