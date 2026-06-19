import type { StrainLibrary } from '../game/strainLibrary';

/**
 * Build a loadout selection DOM element for the pre-run screen.
 * Players pick which strains to bring into their next run.
 */
export function renderLoadoutScreen(
  library: StrainLibrary,
  onConfirm: (loadout: string[]) => void,
): HTMLElement {
  const root = document.createElement('div');
  root.className = 'loadout-screen';

  const available = library.getAvailableStrains();
  const slots = library.getLoadoutSlots();
  const selected = new Set(library.getLoadout());

  function render(): void {
    root.innerHTML = `
      <h2>Egg Loadout</h2>
      <p class="loadout-subtitle">Select up to ${slots} strains for this run</p>
      <div class="loadout-grid">
        ${available.map((strain) => `
          <button
            class="loadout-strain ${selected.has(strain) ? 'selected' : ''}"
            data-strain="${strain}"
          >${strain.replace(/_/g, ' ')}</button>
        `).join('')}
      </div>
      <button class="loadout-confirm" ${selected.size === 0 ? 'disabled' : ''}>
        Start Run (${selected.size}/${slots})
      </button>
    `;

    for (const btn of root.querySelectorAll('.loadout-strain')) {
      btn.addEventListener('click', () => {
        const strain = (btn as HTMLElement).dataset.strain!;
        if (selected.has(strain)) {
          selected.delete(strain);
        } else if (selected.size < slots) {
          selected.add(strain);
        }
        render();
      });
    }

    const confirmBtn = root.querySelector('.loadout-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (selected.size > 0) {
          const loadout = [...selected];
          library.setLoadout(loadout);
          onConfirm(loadout);
        }
      });
    }
  }

  render();
  return root;
}
