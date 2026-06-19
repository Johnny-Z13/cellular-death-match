import type { StrainLibrary } from '../game/strainLibrary';

export interface LoadoutScreenOptions {
  labelForStrain: (strain: string) => string;
  colorForStrain: (strain: string) => string;
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
    title.textContent = 'Egg Loadout';

    const subtitle = document.createElement('p');
    subtitle.className = 'loadout-subtitle';
    subtitle.textContent = `Select up to ${slots} strains for this run`;

    const count = document.createElement('p');
    count.className = 'loadout-count';
    count.textContent = `${selected.size}/${slots} selected`;

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

      const swatch = document.createElement('span');
      swatch.className = 'loadout-strain-swatch';
      swatch.setAttribute('aria-hidden', 'true');

      const label = document.createElement('span');
      label.textContent = options.labelForStrain(strain);

      button.append(swatch, label);
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
