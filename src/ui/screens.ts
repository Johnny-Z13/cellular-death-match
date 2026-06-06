import type { AgitationState, ToolState } from '../game/arena';
import type { UpgradeDef } from '../content/upgrades';
import type { EnemyArchetype } from '../content/enemies';
import {
  LIFEFORM_IDENTITIES,
  type LifeformIdentityId,
} from '../content/lifeformIdentity';

type ScreenName = 'title' | 'pick' | 'end' | 'hud';
export type ToolId = 'egg' | 'nutrient' | 'toxin' | 'water' | 'salt' | 'acid';

export interface HudInfo {
  fightIndex: number;          // 0-based; HUD shows fightIndex+1
  totalFights: number;
  vol: number;
  targetVol: number;
  progress: number;
  secondsRemaining: number;
  livingEnemies: number;
  mutations: number;
  births: number;
  supplyDrops: number;
  reactions: number;
  accidents: number;
  outbreaks: number;
  dominant: string;
  crisis: string;
  objectiveName: string;
  objectiveSummary: string;
  objectiveHint: string;
  upgrades: string[];          // upgrade names, e.g. ["Bigger Cell", "Faster Engulf x2"]
}

export interface EndInfo {
  outcome: 'won' | 'lost';
  fightReached: number;        // 1-based
  totalFights: number;
  upgrades: string[];
}

export interface PickChoice {
  id: string;
  def: UpgradeDef;
}

export interface EggOption {
  archetype: EnemyArchetype;
  name: string;
  summary: string;
  color: [number, number, number];
}

export interface Screens {
  show(name: ScreenName): void;
  hide(name: ScreenName): void;
  addTicker(message: string, tone?: TickerTone): void;
  clearTicker(): void;
  setTool(tool: ToolId): void;
  setToolUnlocks(tools: readonly ToolId[]): void;
  updateToolCharges(charges: Record<ToolId, ToolState>): void;
  updateAgitation(state: AgitationState): void;
  onToolSelect(handler: (tool: ToolId) => void): void;
  onAgitate(handler: () => void): void;
  onEndEpoch(handler: () => void): void;
  setEggOptions(options: EggOption[]): void;
  setEggArchetype(archetype: EnemyArchetype): void;
  setLifeformUnlocks(ids: readonly string[]): void;
  onEggSelect(handler: (archetype: EnemyArchetype) => void): void;
  onLifeformSelect(handler: (id: string) => void): void;
  setSelectedLifeform(id: string | null): void;
  updateHud(info: HudInfo): void;
  setPickChoices(choices: PickChoice[], onPick: (id: string) => void): void;
  updateEnd(info: EndInfo): void;
  onTitleStart(handler: () => void): void;
  onEndRestart(handler: () => void): void;
}

export type TickerTone = 'normal' | 'discovery' | 'caution' | 'critical';

export function createScreens(): Screens {
  const get = (id: string): HTMLElement => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`screens: missing #${id}`);
    return el;
  };

  const screenTitle  = get('screen-title');
  const screenPick   = get('screen-pick');
  const screenEnd    = get('screen-end');
  const hud          = get('hud');
  const titleStart   = get('title-start');
  const pickChoices  = get('pick-choices');
  const endTitle     = get('end-title');
  const endSummary   = get('end-summary');
  const endRestart   = get('end-restart');
  const hudFight     = get('hud-fight');
  const hudVol       = get('hud-vol');
  const hudProgress  = get('hud-progress');
  const hudEco       = get('hud-eco');
  const hudObjective = get('hud-objective');
  const hudHint      = get('hud-hint');
  const hudUpgrades  = get('hud-upgrades');
  const toolSummary  = get('tool-summary');
  const eggOptions   = get('egg-options');
  const lifeSummary  = get('life-summary');
  const lifeList     = get('life-list');
  const tickerLines  = get('ticker-lines');
  const agitateButton = get('agitate-button') as HTMLButtonElement;
  const agitateCount = get('agitate-count');
  const endEpochButton = get('end-epoch-button') as HTMLButtonElement;
  const toolButtons  = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-tool]'));
  const eggTool      = toolButtons.find((btn) => btn.dataset.tool === 'egg');
  let eggButtons: HTMLButtonElement[] = [];
  const lifeButtons = new Map<string, HTMLButtonElement>();
  let selectedLifeformId: string | null = null;
  let selectedToolId: ToolId = 'egg';
  let selectedEggArchetype: EnemyArchetype = 'swarmlet';
  let unlockedLifeformIds = new Set<string>();
  let unlockedToolIds = new Set<ToolId>(['egg', 'nutrient', 'toxin', 'water', 'salt', 'acid']);
  let eggSelectHandler: ((archetype: EnemyArchetype) => void) | null = null;
  let lifeformSelectHandler: ((id: string) => void) | null = null;
  const optionByArchetype = new Map<EnemyArchetype, EggOption>();

  const elFor: Record<ScreenName, HTMLElement> = {
    title: screenTitle,
    pick: screenPick,
    end: screenEnd,
    hud,
  };

  function applyLifeformVisibility(): void {
    for (const button of eggButtons) {
      const id = button.dataset.eggArchetype;
      button.hidden = !id || !unlockedLifeformIds.has(id);
    }
    for (const [id, button] of lifeButtons) {
      button.hidden = !unlockedLifeformIds.has(id);
    }
  }

  return {
    show(name) { elFor[name].classList.add('visible'); },
    hide(name) { elFor[name].classList.remove('visible'); },
    addTicker(message, tone = 'normal') {
      const line = document.createElement('div');
      line.className = `ticker-line ticker-line-${tone}`;
      line.textContent = message;
      tickerLines.prepend(line);
      while (tickerLines.children.length > 5) {
        tickerLines.lastElementChild?.remove();
      }
    },
    clearTicker() {
      tickerLines.replaceChildren();
    },
    setTool(tool) {
      selectedToolId = tool;
      for (const btn of toolButtons) {
        btn.classList.toggle('selected', btn.dataset.tool === tool);
      }
      updateToolSummary(toolSummary, selectedToolId, selectedEggArchetype, optionByArchetype);
    },
    setToolUnlocks(tools) {
      unlockedToolIds = new Set(tools);
      for (const btn of toolButtons) {
        const tool = btn.dataset.tool;
        if (!isToolId(tool)) continue;
        btn.hidden = !unlockedToolIds.has(tool);
      }
    },
    updateToolCharges(charges) {
      for (const btn of toolButtons) {
        const tool = btn.dataset.tool;
        if (!isToolId(tool)) continue;
        const count = btn.querySelector<HTMLElement>('[data-tool-count]');
        const state = charges[tool];
        btn.disabled = state.charges <= 0;
        if (count) count.textContent = `${state.charges}/${state.maxCharges}`;
      }
    },
    updateAgitation(state) {
      agitateButton.disabled = state.charges <= 0;
      agitateButton.classList.toggle('selected', state.activeTicks > 0);
      agitateCount.textContent = `${state.charges}/${state.maxCharges}`;
    },
    onToolSelect(handler) {
      for (const btn of toolButtons) {
        const tool = btn.dataset.tool;
        if (isToolId(tool)) {
          btn.addEventListener('click', () => handler(tool));
        }
      }
    },
    onAgitate(handler) {
      agitateButton.addEventListener('click', handler);
    },
    onEndEpoch(handler) {
      endEpochButton.addEventListener('click', handler);
    },
    setEggOptions(options) {
      optionByArchetype.clear();
      eggButtons = [];
      lifeButtons.clear();
      eggOptions.replaceChildren();
      lifeList.replaceChildren();
      for (const option of options) {
        optionByArchetype.set(option.archetype, option);
        const button = document.createElement('button');
        button.className = 'egg-choice';
        button.type = 'button';
        button.dataset.eggArchetype = option.archetype;
        button.setAttribute('aria-label', `${option.name} egg`);
        button.style.setProperty('--life-color', rgb(option.color));

        const swatch = document.createElement('span');
        swatch.className = 'egg-choice-swatch';
        const label = document.createElement('span');
        label.className = 'egg-choice-label';
        label.textContent = option.name;
        button.append(swatch, label);
        button.addEventListener('click', () => eggSelectHandler?.(option.archetype));
        eggButtons.push(button);
        eggOptions.append(button);

        const item = document.createElement('button');
        item.className = 'life-item';
        item.type = 'button';
        item.dataset.lifeformId = option.archetype;
        item.style.setProperty('--life-color', rgb(LIFEFORM_IDENTITIES[option.archetype].colors.primary));
        const itemSwatch = document.createElement('span');
        itemSwatch.className = 'life-swatch';
        itemSwatch.style.background = rgb(LIFEFORM_IDENTITIES[option.archetype].colors.primary);
        const itemText = document.createElement('span');
        itemText.textContent = option.name;
        item.append(itemSwatch, itemText);
        item.addEventListener('click', () => lifeformSelectHandler?.(option.archetype));
        item.addEventListener('mouseenter', () => lifeformSelectHandler?.(option.archetype));
        item.addEventListener('focus', () => lifeformSelectHandler?.(option.archetype));
        lifeButtons.set(option.archetype, item);
        lifeList.append(item);
      }
      for (const id of Object.keys(LIFEFORM_IDENTITIES) as LifeformIdentityId[]) {
        if (optionByArchetype.has(id as EnemyArchetype)) continue;
        const identity = LIFEFORM_IDENTITIES[id];
        const item = document.createElement('button');
        item.className = 'life-item life-item-rare';
        item.type = 'button';
        item.dataset.lifeformId = id;
        item.style.setProperty('--life-color', rgb(identity.colors.primary));
        const itemSwatch = document.createElement('span');
        itemSwatch.className = `life-swatch life-swatch-${identity.renderStyle}`;
        itemSwatch.style.background = rgb(identity.colors.primary);
        const itemText = document.createElement('span');
        itemText.textContent = identity.name;
        item.append(itemSwatch, itemText);
        item.addEventListener('click', () => lifeformSelectHandler?.(id));
        item.addEventListener('mouseenter', () => lifeformSelectHandler?.(id));
        item.addEventListener('focus', () => lifeformSelectHandler?.(id));
        lifeButtons.set(id, item);
        lifeList.append(item);
      }
      applyLifeformVisibility();
    },
    setEggArchetype(archetype) {
      selectedEggArchetype = archetype;
      const option = optionByArchetype.get(archetype);
      for (const btn of eggButtons) {
        btn.classList.toggle('selected', btn.dataset.eggArchetype === archetype);
      }
      if (!option) return;
      eggTool?.style.setProperty('--egg-color', rgb(option.color));
      updateToolSummary(toolSummary, selectedToolId, selectedEggArchetype, optionByArchetype);
      if (!selectedLifeformId) this.setSelectedLifeform(archetype);
    },
    setLifeformUnlocks(ids) {
      unlockedLifeformIds = new Set(ids);
      applyLifeformVisibility();
    },
    onEggSelect(handler) {
      eggSelectHandler = handler;
    },
    onLifeformSelect(handler) {
      lifeformSelectHandler = handler;
    },
    setSelectedLifeform(id) {
      selectedLifeformId = id;
      for (const [buttonId, button] of lifeButtons) {
        button.setAttribute('aria-selected', String(buttonId === id));
      }
      if (!id || !(id in LIFEFORM_IDENTITIES)) {
        lifeSummary.textContent = 'Pick an egg strain to seed the dish.';
        return;
      }
      const identity = LIFEFORM_IDENTITIES[id as LifeformIdentityId];
      lifeSummary.textContent = `${identity.name} - ${identity.role}. ${identity.behavior} Sound: ${identity.soundId}.`;
    },
    updateHud(info) {
      hudFight.textContent = `${info.fightIndex + 1} / ${info.totalFights}`;
      hudVol.textContent = `${info.vol} / ${Math.round(info.targetVol)}`;
      hudProgress.textContent = `${info.secondsRemaining}s`;
      const crisis = info.crisis === 'none' ? '' : `, ${info.crisis} active`;
      hudEco.textContent = `${info.livingEnemies} lifeforms, ${info.outbreaks} outbreaks, ${info.reactions} reactions, ${info.accidents} accidents, ${info.mutations} mutations, ${info.births} births, ${info.supplyDrops} drops, ${info.dominant} dominant${crisis}`;
      hudObjective.textContent = `${info.objectiveName}: ${info.objectiveSummary}`;
      hudHint.textContent = info.objectiveHint;
      hudUpgrades.textContent = info.upgrades.length === 0 ? 'none' : info.upgrades.join(', ');
    },
    setPickChoices(choices, onPick) {
      pickChoices.replaceChildren();
      for (const c of choices) {
        const btn = document.createElement('button');
        btn.className = 'pick-card';
        btn.type = 'button';
        const name = document.createElement('div');
        name.className = 'pick-card-name';
        name.textContent = c.def.name;
        const desc = document.createElement('div');
        desc.className = 'pick-card-desc';
        desc.textContent = c.def.description;
        btn.append(name, desc);
        btn.addEventListener('click', () => onPick(c.id));
        pickChoices.append(btn);
      }
    },
    updateEnd(info) {
      endTitle.textContent = info.outcome === 'won' ? 'Lineage Stabilized' : 'Colony Collapsed';
      const fightStr = info.outcome === 'won'
        ? `Completed all ${info.totalFights} ecosystems.`
        : `Collapsed during ecosystem ${info.fightReached} / ${info.totalFights}.`;
      const buildStr = info.upgrades.length === 0
        ? 'No upgrades picked.'
        : `Build: ${info.upgrades.join(', ')}.`;
      endSummary.textContent = `${fightStr} ${buildStr}`;
    },
    onTitleStart(handler) {
      titleStart.addEventListener('click', handler);
    },
    onEndRestart(handler) {
      endRestart.addEventListener('click', handler);
    },
  };
}

function rgb(color: [number, number, number]): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function isToolId(tool: string | undefined): tool is ToolId {
  return tool === 'egg'
    || tool === 'nutrient'
    || tool === 'toxin'
    || tool === 'water'
    || tool === 'salt'
    || tool === 'acid';
}

function updateToolSummary(
  el: HTMLElement,
  tool: ToolId,
  eggArchetype: EnemyArchetype,
  eggOptions: Map<EnemyArchetype, EggOption>,
): void {
  const eggName = eggOptions.get(eggArchetype)?.name ?? 'selected';
  const summaries: Record<ToolId, string> = {
    egg: `Egg - plants a ${eggName} culture in open dish space.`,
    nutrient: 'Nutrient - attracts nearby tissue and feeds growth inside the drop zone.',
    toxin: 'Toxin - repels and thins tissue, useful for separating crowded cultures.',
    water: 'Water - dilutes pressure, spreads reactions, and pushes cultures outward.',
    salt: 'Salt - slows local movement and dries cultures into brittle patterns.',
    acid: 'Acid - burns tissue quickly and can trigger volatile reactions.',
  };
  el.textContent = summaries[tool];
}
