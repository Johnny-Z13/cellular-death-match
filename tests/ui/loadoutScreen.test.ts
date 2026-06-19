import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryStorage } from '../../src/game/discoverySave';
import { createStrainLibrary, type StrainLibrary } from '../../src/game/strainLibrary';
import { renderLoadoutScreen, type LoadoutScreenOptions } from '../../src/ui/loadoutScreen';

class FakeClassList {
  constructor(
    private readonly read: () => string,
    private readonly write: (value: string) => void,
  ) {}

  add(name: string): void {
    const classes = new Set(this.read().split(/\s+/).filter(Boolean));
    classes.add(name);
    this.write([...classes].join(' '));
  }

  remove(name: string): void {
    const classes = new Set(this.read().split(/\s+/).filter(Boolean));
    classes.delete(name);
    this.write([...classes].join(' '));
  }

  contains(name: string): boolean {
    return this.read().split(/\s+/).includes(name);
  }

  toggle(name: string, force?: boolean): boolean {
    const shouldAdd = force ?? !this.contains(name);
    if (shouldAdd) this.add(name);
    else this.remove(name);
    return shouldAdd;
  }
}

class FakeStyle {
  private readonly properties = new Map<string, string>();

  setProperty(name: string, value: string): void {
    this.properties.set(name, value);
  }

  getPropertyValue(name: string): string {
    return this.properties.get(name) ?? '';
  }
}

class FakeElement {
  className = '';
  readonly classList = new FakeClassList(
    () => this.className,
    (value) => {
      this.className = value;
    },
  );
  readonly dataset: Record<string, string> = {};
  readonly style = new FakeStyle();
  disabled = false;
  type = '';
  private ownText = '';
  private readonly attrs = new Map<string, string>();
  private readonly listeners = new Map<string, Array<() => void>>();
  private children: FakeElement[] = [];

  constructor(readonly tagName: string) {}

  set textContent(value: string) {
    this.ownText = value;
    this.children = [];
  }

  get textContent(): string {
    return [this.ownText, ...this.children.map((child) => child.textContent)]
      .filter(Boolean)
      .join(' ');
  }

  set innerHTML(value: string) {
    this.ownText = stripTags(value).replace(/\s+/g, ' ').trim();
    this.children = [];
    const buttonPattern = /<button\s+([\s\S]*?)>([\s\S]*?)<\/button>/g;
    for (const match of value.matchAll(buttonPattern)) {
      const button = new FakeElement('button');
      const attrs = match[1] ?? '';
      button.className = attr(attrs, 'class') ?? '';
      const strain = attr(attrs, 'data-strain');
      if (strain) button.dataset.strain = strain;
      button.disabled = /\sdisabled(?:\s|>|$)/.test(attrs);
      button.textContent = stripTags(match[2] ?? '').replace(/\s+/g, ' ').trim();
      this.children.push(button);
    }
  }

  append(...children: FakeElement[]): void {
    this.children.push(...children);
  }

  replaceChildren(...children: FakeElement[]): void {
    this.children = [...children];
  }

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
    if (name === 'class') this.className = value;
    if (name === 'disabled') this.disabled = true;
    if (name.startsWith('data-')) {
      this.dataset[toDatasetKey(name.slice(5))] = value;
    }
  }

  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }

  addEventListener(event: string, handler: () => void): void {
    const handlers = this.listeners.get(event) ?? [];
    handlers.push(handler);
    this.listeners.set(event, handlers);
  }

  click(): void {
    if (this.disabled) return;
    for (const handler of this.listeners.get('click') ?? []) handler();
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    return this.descendants().filter((child) => child.matches(selector));
  }

  private descendants(): FakeElement[] {
    return this.children.flatMap((child) => [child, ...child.descendants()]);
  }

  private matches(selector: string): boolean {
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
    if (selector === this.tagName) return true;
    if (selector === `[data-strain="${this.dataset.strain ?? ''}"]`) return Boolean(this.dataset.strain);
    return false;
  }
}

function installFakeDocument(): void {
  vi.stubGlobal('document', {
    createElement(tagName: string) {
      return new FakeElement(tagName);
    },
  });
}

function attr(source: string, name: string): string | null {
  const match = source.match(new RegExp(`${name}="([^"]*)"`));
  return match?.[1] ?? null;
}

function stripTags(source: string): string {
  return source.replace(/<[^>]*>/g, ' ');
}

function toDatasetKey(name: string): string {
  return name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

function createLibraryWithStrains(): StrainLibrary {
  const library = createStrainLibrary(createMemoryStorage());
  library.bankStrain('needle_swarm');
  library.bankStrain('glass_antibody');
  return library;
}

const options: LoadoutScreenOptions = {
  labelForStrain(strain) {
    return {
      swarmlet: 'Starter Swarm',
      needle_swarm: 'Needle Swarm',
      glass_antibody: 'Glass Antibody',
    }[strain] ?? strain;
  },
  colorForStrain(strain) {
    return {
      swarmlet: 'rgb(72, 201, 255)',
      needle_swarm: 'rgb(255, 212, 94)',
      glass_antibody: 'rgb(190, 244, 255)',
    }[strain] ?? 'rgb(255, 255, 255)';
  },
};

function render(library = createLibraryWithStrains(), onConfirm = vi.fn()): FakeElement {
  return renderLoadoutScreen(library, onConfirm, options) as unknown as FakeElement;
}

function strainButton(root: FakeElement, strain: string): FakeElement {
  const button = root.querySelectorAll('.loadout-strain')
    .find((candidate) => candidate.dataset.strain === strain);
  if (!button) throw new Error(`Missing strain button for ${strain}`);
  return button;
}

function confirmButton(root: FakeElement): FakeElement {
  const button = root.querySelector('.loadout-confirm');
  if (!button) throw new Error('Missing confirm button');
  return button;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('renderLoadoutScreen', () => {
  it('renders available strains with human labels', () => {
    installFakeDocument();
    const root = render();

    expect(root.querySelectorAll('.loadout-strain').map((button) => button.textContent)).toEqual([
      'Starter Swarm',
      'Needle Swarm',
      'Glass Antibody',
    ]);
  });

  it('uses color CSS variables for strain buttons', () => {
    installFakeDocument();
    const root = render();

    expect(strainButton(root, 'needle_swarm').style.getPropertyValue('--strain-color')).toBe('rgb(255, 212, 94)');
    expect(strainButton(root, 'glass_antibody').style.getPropertyValue('--strain-color')).toBe('rgb(190, 244, 255)');
  });

  it('toggles selection up to the available slot count', () => {
    installFakeDocument();
    const root = render();

    strainButton(root, 'needle_swarm').click();
    strainButton(root, 'glass_antibody').click();

    expect(strainButton(root, 'swarmlet').classList.contains('selected')).toBe(true);
    expect(strainButton(root, 'needle_swarm').classList.contains('selected')).toBe(true);
    expect(strainButton(root, 'glass_antibody').classList.contains('selected')).toBe(false);
    expect(confirmButton(root).textContent).toContain('2/2');
  });

  it('confirms the selected loadout and stores it in the library', () => {
    installFakeDocument();
    const library = createLibraryWithStrains();
    const onConfirm = vi.fn();
    const root = render(library, onConfirm);

    strainButton(root, 'needle_swarm').click();
    confirmButton(root).click();

    expect(onConfirm).toHaveBeenCalledWith(['swarmlet', 'needle_swarm']);
    expect(library.getLoadout()).toEqual(['swarmlet', 'needle_swarm']);
  });

  it('disables confirm when no strains are selected', () => {
    installFakeDocument();
    const onConfirm = vi.fn();
    const root = render(createLibraryWithStrains(), onConfirm);

    strainButton(root, 'swarmlet').click();
    confirmButton(root).click();

    expect(confirmButton(root).disabled).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
