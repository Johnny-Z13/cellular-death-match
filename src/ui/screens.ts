import type { AgitationState, ToolState } from '../game/arena';
import type { ResearchBriefLine } from '../game/researchBrief';
import type { UpgradeDef } from '../content/upgrades';
import type { EnemyArchetype } from '../content/enemies';
import type { NotebookView } from '../content/notebook';
import {
  LIFEFORM_IDENTITIES,
  type LifeformIdentityId,
} from '../content/lifeformIdentity';

type ScreenName = 'title' | 'pick' | 'end' | 'hud' | 'notebook';
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
  showcaseToolUnlock(tool: ToolId): void;
  updateToolCharges(charges: Record<ToolId, ToolState>): void;
  updateAgitation(state: AgitationState): void;
  onToolSelect(handler: (tool: ToolId) => void): void;
  onAgitate(handler: () => void): void;
  onEndEpoch(handler: () => void): void;
  setEggOptions(options: EggOption[]): void;
  setEggArchetype(archetype: EnemyArchetype): void;
  setLifeformUnlocks(ids: readonly string[]): void;
  showcaseLifeformUnlock(id: string): void;
  onEggSelect(handler: (archetype: EnemyArchetype) => void): void;
  onLifeformSelect(handler: (id: string) => void): void;
  setSelectedLifeform(id: string | null): void;
  updateHud(info: HudInfo): void;
  setPickResearchBrief(lines: readonly ResearchBriefLine[]): void;
  updateNotebook(view: NotebookView): void;
  setPickChoices(choices: PickChoice[], onPick: (id: string) => void): void;
  updateEnd(info: EndInfo): void;
  onTitleStart(handler: () => void): void;
  onEndRestart(handler: () => void): void;
  onNotebookOpen(handler: () => void): void;
  onNotebookClose(handler: () => void): void;
  onFullscreenOpen(handler: () => void): void;
  setFullscreenActive(active: boolean): void;
  onAudioToggle(handler: () => void): void;
  setAudioMuted(muted: boolean): void;
}

export type TickerTone = 'normal' | 'discovery' | 'caution' | 'critical';

export function createScreens(): Screens {
  const get = (id: string): HTMLElement => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`screens: missing #${id}`);
    return el;
  };

  const maybeLayout = document.querySelector<HTMLElement>('.layout');
  if (!maybeLayout) throw new Error('screens: missing .layout');
  const layout = maybeLayout;
  const screenTitle  = get('screen-title');
  const screenPick   = get('screen-pick');
  const screenEnd    = get('screen-end');
  const screenNotebook = get('screen-notebook');
  const hud          = get('hud');
  const titleStart   = get('title-start');
  const notebookButton = get('notebook-button') as HTMLButtonElement;
  const fullscreenButton = get('fullscreen-button') as HTMLButtonElement;
  const audioButton = get('audio-button') as HTMLButtonElement;
  const notebookClose = get('notebook-close') as HTMLButtonElement;
  const notebookProgress = get('notebook-progress');
  const notebookList = get('notebook-list');
  const pickResearchBrief = get('pick-research-brief');
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
  const mobileLifeformsToggle = get('mobile-lifeforms-toggle') as HTMLButtonElement;
  const mobileLogToggle = get('mobile-log-toggle') as HTMLButtonElement;
  const mobileToolName = get('mobile-tool-name');
  const mobileToolSummary = get('mobile-tool-summary');
  const eggOptions   = get('egg-options');
  const lifeSummary  = get('life-summary');
  const lifeList     = get('life-list');
  const tickerLines  = get('ticker-lines');
  const agitateButton = get('agitate-button') as HTMLButtonElement;
  const agitateCount = get('agitate-count');
  const endEpochButton = get('end-epoch-button') as HTMLButtonElement;
  const toolButtons  = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-tool]'));
  const eggTool      = toolButtons.find((btn) => btn.dataset.tool === 'egg');
  const lifeButtons = new Map<string, HTMLButtonElement>();
  type MobileDrawer = 'none' | 'lifeforms' | 'log';
  let mobileDrawer: MobileDrawer = 'none';
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
    notebook: screenNotebook,
    hud,
  };

  function setMobileDrawer(next: MobileDrawer): void {
    mobileDrawer = next;
    layout.dataset.mobileDrawer = mobileDrawer;
    layout.classList.toggle('mobile-lifeforms-open', mobileDrawer === 'lifeforms');
    layout.classList.toggle('mobile-log-open', mobileDrawer === 'log');
    mobileLifeformsToggle.setAttribute('aria-expanded', String(mobileDrawer === 'lifeforms'));
    mobileLogToggle.setAttribute('aria-expanded', String(mobileDrawer === 'log'));
  }

  function closeMobileDrawers(): void {
    setMobileDrawer('none');
  }

  function applyLifeformVisibility(): void {
    for (const [id, button] of lifeButtons) {
      const locked = !unlockedLifeformIds.has(id);
      button.hidden = false;
      setUnknownState(button, locked, 'Unknown lifeform');
      const selected = !locked && id === selectedLifeformId;
      setSelectedButtonState(button, selected);
    }
  }

  function setSelectedLifeform(id: string | null): void {
    if (id && !unlockedLifeformIds.has(id)) return;
    selectedLifeformId = id;
    for (const [buttonId, button] of lifeButtons) {
      setSelectedButtonState(button, buttonId === id);
    }
    if (!id || !(id in LIFEFORM_IDENTITIES)) {
      lifeSummary.textContent = 'Pick an egg strain to seed the dish.';
      return;
    }
    const identity = LIFEFORM_IDENTITIES[id as LifeformIdentityId];
    lifeSummary.textContent = `${identity.name} - ${identity.role}. ${identity.behavior} ${identity.origin} Sound: ${identity.soundId}.`;
  }

  function activateLifeform(id: string): void {
    if (!unlockedLifeformIds.has(id)) return;
    setSelectedLifeform(id);
    lifeformSelectHandler?.(id);
    const eggOption = optionByArchetype.get(id as EnemyArchetype);
    if (eggOption) eggSelectHandler?.(eggOption.archetype);
  }

  mobileLifeformsToggle.addEventListener('click', () => {
    setMobileDrawer(mobileDrawer === 'lifeforms' ? 'none' : 'lifeforms');
  });
  mobileLogToggle.addEventListener('click', () => {
    setMobileDrawer(mobileDrawer === 'log' ? 'none' : 'log');
  });
  setMobileDrawer('none');

  return {
    show(name) {
      if (name === 'title' || name === 'pick' || name === 'end' || name === 'notebook') closeMobileDrawers();
      elFor[name].classList.add('visible');
    },
    hide(name) { elFor[name].classList.remove('visible'); },
    addTicker(message, tone = 'normal') {
      const line = document.createElement('div');
      line.className = `ticker-line ticker-line-${tone}`;
      const specialClass = tickerSpecialClassFor(message);
      if (specialClass) line.classList.add(specialClass);
      line.textContent = message;
      tickerLines.prepend(line);
      while (tickerLines.children.length > 6) {
        tickerLines.lastElementChild?.remove();
      }
    },
    clearTicker() {
      tickerLines.replaceChildren();
    },
    setTool(tool) {
      selectedToolId = tool;
      for (const btn of toolButtons) {
        setSelectedButtonState(btn, btn.dataset.tool === tool);
      }
      updateToolSummary(toolSummary, selectedToolId, selectedEggArchetype, optionByArchetype);
      updateMobileToolReadout(mobileToolName, mobileToolSummary, selectedToolId, selectedEggArchetype, optionByArchetype);
    },
    setToolUnlocks(tools) {
      unlockedToolIds = new Set(tools);
      for (const btn of toolButtons) {
        const tool = btn.dataset.tool;
        if (!isToolId(tool)) continue;
        const locked = !unlockedToolIds.has(tool);
        btn.hidden = false;
        setUnknownState(btn, locked, 'Unknown reagent');
      }
    },
    showcaseToolUnlock(tool) {
      const button = toolButtons.find((btn) => btn.dataset.tool === tool);
      if (!button || button.disabled) return;
      button.classList.remove('tool-button-discovered');
      void button.offsetWidth;
      button.classList.add('tool-button-discovered');
      button.scrollIntoView({ block: 'nearest' });
      window.setTimeout(() => {
        button.classList.remove('tool-button-discovered');
      }, 1800);
    },
    updateToolCharges(charges) {
      for (const btn of toolButtons) {
        const tool = btn.dataset.tool;
        if (!isToolId(tool)) continue;
        const count = btn.querySelector<HTMLElement>('[data-tool-count]');
        const state = charges[tool];
        const locked = !unlockedToolIds.has(tool);
        btn.disabled = locked || state.charges <= 0;
        if (locked) {
          if (count) count.textContent = '?';
          continue;
        }
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
      lifeButtons.clear();
      eggOptions.replaceChildren();
      lifeList.replaceChildren();
      for (const option of options) {
        optionByArchetype.set(option.archetype, option);
        // Lifeform cards own egg selection and discovery inspection in one list.
        const button = document.createElement('button');
        button.className = 'life-item tool-button';
        button.type = 'button';
        button.dataset.lifeformId = option.archetype;
        button.dataset.eggArchetype = option.archetype;
        button.setAttribute('aria-label', `${option.name} egg`);
        button.setAttribute('aria-selected', 'false');
        button.style.setProperty('--life-color', rgb(option.color));

        const swatch = document.createElement('span');
        swatch.className = 'life-swatch';
        swatch.style.background = rgb(option.color);
        const copy = document.createElement('span');
        const label = document.createElement('strong');
        label.dataset.unlockedText = option.name;
        label.textContent = option.name;
        const detail = document.createElement('small');
        detail.dataset.unlockedText = option.summary;
        detail.textContent = option.summary;
        const tag = document.createElement('b');
        tag.textContent = 'egg';
        copy.append(label, detail);
        button.append(swatch, copy, tag);
        button.addEventListener('click', () => activateLifeform(option.archetype));
        lifeButtons.set(option.archetype, button);
        lifeList.append(button);
      }
      for (const id of Object.keys(LIFEFORM_IDENTITIES) as LifeformIdentityId[]) {
        if (optionByArchetype.has(id as EnemyArchetype)) continue;
        const identity = LIFEFORM_IDENTITIES[id];
        const item = document.createElement('button');
        item.className = 'life-item tool-button life-item-rare';
        item.type = 'button';
        item.dataset.lifeformId = id;
        item.setAttribute('aria-selected', 'false');
        item.style.setProperty('--life-color', rgb(identity.colors.primary));
        const itemSwatch = document.createElement('span');
        itemSwatch.className = `life-swatch life-swatch-${identity.renderStyle}`;
        itemSwatch.style.background = rgb(identity.colors.primary);
        const itemText = document.createElement('span');
        const itemName = document.createElement('strong');
        itemName.dataset.unlockedText = identity.name;
        itemName.textContent = identity.name;
        const itemDetail = document.createElement('small');
        itemDetail.dataset.unlockedText = identity.origin;
        itemDetail.textContent = identity.origin;
        const itemTag = document.createElement('b');
        itemTag.textContent = 'rare';
        itemText.append(itemName, itemDetail);
        item.append(itemSwatch, itemText, itemTag);
        item.addEventListener('click', () => activateLifeform(id));
        lifeButtons.set(id, item);
        lifeList.append(item);
      }
      applyLifeformVisibility();
    },
    setEggArchetype(archetype) {
      selectedEggArchetype = archetype;
      const option = optionByArchetype.get(archetype);
      if (!option) return;
      eggTool?.style.setProperty('--egg-color', rgb(option.color));
      updateToolSummary(toolSummary, selectedToolId, selectedEggArchetype, optionByArchetype);
      updateMobileToolReadout(mobileToolName, mobileToolSummary, selectedToolId, selectedEggArchetype, optionByArchetype);
      if (!selectedLifeformId) setSelectedLifeform(archetype);
    },
    setLifeformUnlocks(ids) {
      unlockedLifeformIds = new Set(ids);
      applyLifeformVisibility();
    },
    showcaseLifeformUnlock(id) {
      const button = lifeButtons.get(id);
      if (!button || button.disabled) return;
      button.classList.remove('life-item-discovered');
      void button.offsetWidth;
      button.classList.add('life-item-discovered');
      button.scrollIntoView({ block: 'nearest' });
      window.setTimeout(() => {
        button.classList.remove('life-item-discovered');
      }, 1800);
    },
    onEggSelect(handler) {
      eggSelectHandler = handler;
    },
    onLifeformSelect(handler) {
      lifeformSelectHandler = handler;
    },
    setSelectedLifeform(id) {
      setSelectedLifeform(id);
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
    setPickResearchBrief(lines) {
      pickResearchBrief.replaceChildren();
      pickResearchBrief.hidden = lines.length === 0;
      for (const brief of lines) {
        const line = document.createElement('div');
        line.className = `pick-research-line pick-research-line-${brief.tone}`;
        line.textContent = brief.message;
        pickResearchBrief.append(line);
      }
    },
    updateNotebook(view) {
      notebookProgress.textContent = `${view.discoveredCount} ${view.discoveredCount === 1 ? 'discovery' : 'discoveries'} logged`;
      notebookList.replaceChildren();
      for (const entry of view.entries) {
        if (!entry.discovered) continue;
        const card = document.createElement('article');
        card.className = [
          'notebook-entry',
          `notebook-entry-${entry.category}`,
          `notebook-entry-${entry.caution}`,
          entry.isFresh ? 'notebook-entry-new' : 'notebook-entry-discovered',
        ].join(' ');

        const marker = document.createElement('span');
        marker.className = 'notebook-marker';
        marker.textContent = entry.isFresh ? 'NEW' : 'OK';

        const copy = document.createElement('div');
        const header = document.createElement('div');
        header.className = 'notebook-entry-head';
        const title = document.createElement('strong');
        title.textContent = entry.displayTitle;
        const status = document.createElement('span');
        status.className = entry.isFresh ? 'notebook-status notebook-status-new' : 'notebook-status';
        status.textContent = entry.isFresh ? 'NEW DISCOVERY' : 'DISCOVERED';
        header.append(title, status);

        const meta = document.createElement('div');
        meta.className = 'notebook-meta';
        meta.textContent = `${entry.category.replace('_', ' ')} / ${entry.caution}`;

        const discoveredAt = document.createElement('div');
        discoveredAt.className = 'notebook-discovered-at';
        discoveredAt.textContent = entry.discoveredAtLabel;

        const body = document.createElement('p');
        body.className = 'notebook-notes';
        body.textContent = entry.displayNotes;
        const clue = document.createElement('small');
        clue.className = 'notebook-recipe';
        clue.textContent = entry.displayRecipe;

        copy.append(header, meta, discoveredAt, body, clue);
        card.append(marker, copy);
        notebookList.append(card);
      }
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
    onNotebookOpen(handler) {
      notebookButton.addEventListener('click', handler);
    },
    onNotebookClose(handler) {
      notebookClose.addEventListener('click', handler);
    },
    onFullscreenOpen(handler) {
      fullscreenButton.addEventListener('click', handler);
    },
    setFullscreenActive(active) {
      fullscreenButton.setAttribute('aria-label', active ? 'Exit full screen' : 'Enter full screen');
      fullscreenButton.title = active ? 'Exit full screen' : 'Enter full screen';
    },
    onAudioToggle(handler) {
      audioButton.addEventListener('click', handler);
    },
    setAudioMuted(muted) {
      audioButton.setAttribute('aria-pressed', String(muted));
      audioButton.setAttribute('aria-label', muted ? 'Unmute audio' : 'Mute audio');
      audioButton.textContent = muted ? 'Muted' : 'Sound';
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

function updateMobileToolReadout(
  nameEl: HTMLElement,
  summaryEl: HTMLElement,
  tool: ToolId,
  eggArchetype: EnemyArchetype,
  eggOptions: Map<EnemyArchetype, EggOption>,
): void {
  const eggName = eggOptions.get(eggArchetype)?.name ?? 'selected culture';
  const names: Record<ToolId, string> = {
    egg: 'Egg',
    nutrient: 'Nutrient',
    toxin: 'Toxin',
    water: 'Water',
    salt: 'Salt',
    acid: 'Acid',
  };
  const summaries: Record<ToolId, string> = {
    egg: `${eggName} seed`,
    nutrient: 'feed and attract',
    toxin: 'repel and thin',
    water: 'dilute and spread',
    salt: 'slow and dry',
    acid: 'burn tissue',
  };
  nameEl.textContent = names[tool];
  summaryEl.textContent = summaries[tool];
}

function setUnknownState(button: HTMLButtonElement, locked: boolean, label: string): void {
  const icon = button.querySelector<HTMLElement>('.tool-icon, .egg-choice-swatch, .life-swatch');
  const text = button.querySelector<HTMLElement>('[data-unlocked-text], strong');
  const subText = button.querySelector<HTMLElement>('small');
  const count = button.querySelector<HTMLElement>('[data-tool-count]');

  if (text && !text.dataset.unlockedText) text.dataset.unlockedText = text.textContent ?? '';
  if (subText && !subText.dataset.unlockedText) subText.dataset.unlockedText = subText.textContent ?? '';
  if (button.dataset.unlockedAriaLabel === undefined) {
    button.dataset.unlockedAriaLabel = button.getAttribute('aria-label') ?? '';
  }

  button.classList.toggle('locked-discovery', locked);
  button.setAttribute('aria-disabled', String(locked));

  if (locked) {
    button.disabled = true;
    setSelectedButtonState(button, false);
    button.setAttribute('aria-label', label);
    if (icon) {
      icon.classList.add('unknown-icon');
      icon.textContent = '?';
    }
    if (text) text.textContent = 'Unknown';
    if (subText) subText.textContent = 'locked';
    if (count) count.textContent = '?';
    return;
  }

  button.disabled = false;
  button.removeAttribute('aria-disabled');
  const ariaLabel = button.dataset.unlockedAriaLabel ?? '';
  if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
  else button.removeAttribute('aria-label');
  if (icon) {
    icon.classList.remove('unknown-icon');
    icon.textContent = '';
  }
  if (text) text.textContent = text.dataset.unlockedText ?? text.textContent;
  if (subText) subText.textContent = subText.dataset.unlockedText ?? subText.textContent;
}

function setSelectedButtonState(button: HTMLButtonElement, selected: boolean): void {
  button.classList.toggle('selected', selected);
  button.setAttribute('aria-selected', String(selected));
}

function tickerSpecialClassFor(message: string): string | null {
  if (
    message.startsWith('NEW LIFEFORM CREATED')
    || message.startsWith('New lifeform discovered')
    || message.startsWith('New lifeform catalogued')
  ) {
    return 'ticker-line-rare-lifeform';
  }
  if (
    message.startsWith('New catalyst discovered')
    || message.startsWith('CATALYTIC')
    || message.startsWith('FOLDING FAULT')
  ) {
    return 'ticker-line-catalyst';
  }
  return null;
}
