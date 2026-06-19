import type { AgitationState, EquilibriumInfo, ToolState } from '../game/arena';
import type { LabReport } from '../game/labReport';
import type { ResearchBriefLine } from '../game/researchBrief';
import type { UpgradeDef } from '../content/upgrades';
import type { EnemyArchetype } from '../content/enemies';
import type { ObjectiveDef } from '../content/objectives';
import type { NotebookView, AtlasView } from '../content/notebook';
import {
  LIFEFORM_IDENTITIES,
  type LifeformIdentityId,
} from '../content/lifeformIdentity';
import { createIconCells } from './iconCells';
import { renderLabReport } from './labReportScreen';

type ScreenName = 'title' | 'pick' | 'end' | 'hud' | 'notebook';
type AppScreenName = ScreenName | 'loadout' | 'objective';
type LayoutScreenName = 'title' | 'loadout' | 'pick' | 'objective' | 'end' | 'notebook' | 'arena';
export type ToolId = 'egg' | 'nutrient' | 'toxin' | 'water' | 'salt' | 'acid' | 'paste';
export type ButtonHintLevel = 'hint' | 'ready';
export type ButtonHintTarget = ToolId | 'notebook';

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
  worldEvents: number;
  dominant: string;
  crisis: string;
  objectiveName: string;
  objectiveSummary: string;
  objectiveHint: string;
  objectiveComplete: boolean;
  upgrades: string[];          // upgrade names, e.g. ["Bigger Cell", "Faster Engulf x2"]
}

export interface EndInfo {
  outcome: 'won' | 'lost';
  fightReached: number;        // 1-based
  totalFights: number;
  objectivesCompleted: number; // achieved (not lapsed) objectives this run
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
  show(name: AppScreenName): void;
  hide(name: AppScreenName): void;
  addTicker(message: string, tone?: TickerTone): void;
  clearTicker(): void;
  setTool(tool: ToolId): void;
  setButtonHint(target: ButtonHintTarget | null, level?: ButtonHintLevel): void;
  setToolUnlocks(tools: readonly ToolId[]): void;
  showcaseToolUnlock(tool: ToolId): void;
  updateToolCharges(charges: Record<ToolId, ToolState>): void;
  updateAgitation(state: AgitationState): void;
  setAgitateUnlocked(unlocked: boolean): void;
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
  setEquilibrium(info: EquilibriumInfo): void;
  setPickResearchBrief(lines: readonly ResearchBriefLine[]): void;
  updateNotebook(view: NotebookView): void;
  updateAtlas(view: AtlasView): void;
  setLoadoutScreen(el: HTMLElement): void;
  setPickChoices(choices: PickChoice[], onPick: (id: string) => void): void;
  setObjectiveChoices(choices: ObjectiveDef[], onPick: (objective: ObjectiveDef) => void): void;
  updateEnd(info: EndInfo): void;
  updateLabReport(report: LabReport | null): void;
  onTitleStart(handler: () => void): void;
  onEndRestart(handler: () => void): void;
  onNotebookOpen(handler: () => void): void;
  onNotebookClose(handler: () => void): void;
  onFullscreenOpen(handler: () => void): void;
  setFullscreenActive(active: boolean): void;
  onAudioToggle(handler: () => void): void;
  setAudioMuted(muted: boolean): void;
  setEpochComplete(complete: boolean): void;
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
  const screenLoadout = get('screen-loadout');
  const screenPick   = get('screen-pick');
  const screenObjective = get('screen-objective');
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
  const notebookAtlas = get('notebook-atlas');
  const notebookTabLog = get('notebook-tab-log') as HTMLButtonElement;
  const notebookTabAtlas = get('notebook-tab-atlas') as HTMLButtonElement;
  const pickResearchBrief = get('pick-research-brief');
  const loadoutMount = get('loadout-mount');
  const pickChoices  = get('pick-choices');
  const objectiveChoices = get('objective-choices');
  const endTitle     = get('end-title');
  const endSummary   = get('end-summary');
  const labReportMount = get('lab-report-mount');
  const endRestart   = get('end-restart');
  const hudFight     = get('hud-fight');
  const hudVol       = get('hud-vol');
  const hudProgress  = get('hud-progress');
  const hudEquilibrium = get('hud-equilibrium');
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
  let unlockedToolIds = new Set<ToolId>(['egg', 'nutrient']);
  let agitationUnlocked = true;
  let currentAgitationState: AgitationState = { charges: 0, maxCharges: 0, activeTicks: 0 };
  let eggSelectHandler: ((archetype: EnemyArchetype) => void) | null = null;
  let lifeformSelectHandler: ((id: string) => void) | null = null;
  const optionByArchetype = new Map<EnemyArchetype, EggOption>();
  const iconCells = createIconCells();

  // A lifeform swatch is the colour bloom (halo + locked-gray fallback) with a
  // tiny live cellular-automata canvas on top, so the icon reads as a living
  // specimen in the organism's colour.
  function makeSwatch(extraClass: string, color: [number, number, number], seed: number): HTMLSpanElement {
    const swatch = document.createElement('span');
    swatch.className = extraClass ? `life-swatch ${extraClass}` : 'life-swatch';
    swatch.dataset.lifeColor = bloomGradient(color);
    swatch.style.background = bloomGradient(color);
    const cv = document.createElement('canvas');
    cv.className = 'life-swatch-cells';
    cv.width = 22;
    cv.height = 22;
    swatch.append(cv);
    iconCells.register(cv, color, seed);
    return swatch;
  }

  const elFor: Record<AppScreenName, HTMLElement> = {
    title: screenTitle,
    loadout: screenLoadout,
    pick: screenPick,
    objective: screenObjective,
    end: screenEnd,
    notebook: screenNotebook,
    hud,
  };

  function syncLayoutScreen(): void {
    let screen: LayoutScreenName = 'arena';
    if (screenTitle.classList.contains('visible')) screen = 'title';
    else if (screenLoadout.classList.contains('visible')) screen = 'loadout';
    else if (screenPick.classList.contains('visible')) screen = 'pick';
    else if (screenObjective.classList.contains('visible')) screen = 'objective';
    else if (screenEnd.classList.contains('visible')) screen = 'end';
    else if (screenNotebook.classList.contains('visible')) screen = 'notebook';
    layout.dataset.screen = screen;
  }

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
      button.hidden = locked;
      setUnknownState(button, locked, 'Unknown lifeform');
      const selected = !locked && id === selectedLifeformId;
      setSelectedButtonState(button, selected);
    }
    sortLifeList();
  }

  // Float discovered lifeforms to the top of the rack; undiscovered "Unknown"
  // specimens sink below. Stable within each group, so a freshly unlocked
  // breed rises right under the other unlocked cards instead of staying buried.
  function sortLifeList(): void {
    const cards = Array.from(lifeButtons.values());
    const unlocked = cards.filter((b) => !b.classList.contains('locked-discovery'));
    const locked = cards.filter((b) => b.classList.contains('locked-discovery'));
    for (const card of [...unlocked, ...locked]) {
      lifeList.append(card); // append in order; moves existing nodes, no reflow churn
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
  syncLayoutScreen();

  function setNotebookTab(tab: 'log' | 'atlas'): void {
    const atlas = tab === 'atlas';
    notebookTabLog.classList.toggle('is-active', !atlas);
    notebookTabAtlas.classList.toggle('is-active', atlas);
    notebookTabLog.setAttribute('aria-selected', String(!atlas));
    notebookTabAtlas.setAttribute('aria-selected', String(atlas));
    notebookList.classList.toggle('is-active', !atlas);
    notebookAtlas.classList.toggle('is-active', atlas);
  }
  notebookTabLog.addEventListener('click', () => setNotebookTab('log'));
  notebookTabAtlas.addEventListener('click', () => setNotebookTab('atlas'));

  function buttonForHintTarget(target: ButtonHintTarget): HTMLButtonElement | null {
    if (target === 'notebook') return notebookButton;
    return toolButtons.find((button) => button.dataset.tool === target) ?? null;
  }

  function applyButtonHint(target: ButtonHintTarget | null, level: ButtonHintLevel = 'hint'): void {
    const hintedButton = target ? buttonForHintTarget(target) : null;
    for (const button of [...toolButtons, notebookButton]) {
      const active = button === hintedButton && !button.hidden && !button.disabled;
      button.classList.toggle('button-hint-pulse', active && level === 'hint');
      button.classList.toggle('button-ready-pulse', active && level === 'ready');
    }
  }

  function applyAgitationUi(): void {
    agitateButton.hidden = !agitationUnlocked;
    agitateButton.disabled = !agitationUnlocked || currentAgitationState.charges <= 0;
    agitateButton.classList.toggle('selected', agitationUnlocked && currentAgitationState.activeTicks > 0);
    agitateCount.textContent = agitationUnlocked
      ? `${currentAgitationState.charges}/${currentAgitationState.maxCharges}`
      : '?';
  }

  return {
    show(name) {
      if (
        name === 'title'
        || name === 'loadout'
        || name === 'pick'
        || name === 'objective'
        || name === 'end'
        || name === 'notebook'
      ) {
        closeMobileDrawers();
      }
      elFor[name].classList.add('visible');
      syncLayoutScreen();
    },
    hide(name) {
      elFor[name].classList.remove('visible');
      syncLayoutScreen();
    },
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
    setButtonHint(target, level = 'hint') {
      applyButtonHint(target, level);
    },
    setToolUnlocks(tools) {
      unlockedToolIds = new Set(tools);
      for (const btn of toolButtons) {
        const tool = btn.dataset.tool;
        if (!isToolId(tool)) continue;
        const locked = !unlockedToolIds.has(tool);
        btn.hidden = locked;
        setUnknownState(btn, locked, 'Unknown reagent');
        if (locked) btn.classList.remove('button-hint-pulse', 'button-ready-pulse');
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
      currentAgitationState = state;
      applyAgitationUi();
    },
    setAgitateUnlocked(unlocked) {
      agitationUnlocked = unlocked;
      applyAgitationUi();
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
      iconCells.reset();
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

        const swatch = makeSwatch('', option.color, hashId(option.archetype));
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
        const itemSwatch = makeSwatch(`life-swatch-${identity.renderStyle}`, identity.colors.primary, hashId(id));
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
      hudEco.textContent = `${info.livingEnemies} lifeforms, ${info.worldEvents} fertile events, ${info.outbreaks} outbreaks, ${info.reactions} reactions, ${info.accidents} accidents, ${info.mutations} mutations, ${info.births} births, ${info.supplyDrops} drops, ${info.dominant} dominant${crisis}`;
      hudObjective.textContent = info.objectiveComplete
        ? `${info.objectiveName}: complete — finish when ready`
        : `${info.objectiveName}: ${info.objectiveSummary}`;
      hudHint.textContent = info.objectiveComplete
        ? 'Experiment complete. Press End to bank it, or keep cultivating.'
        : info.objectiveHint;
      hudUpgrades.textContent = info.upgrades.length === 0 ? 'none' : info.upgrades.join(', ');
    },
    setEquilibrium(info) {
      hudEquilibrium.textContent = info.achieved
        ? info.biomeName ? `Equilibrium: ${info.biomeName}` : 'Equilibrium reached'
        : `Equilibrium ${Math.round(Math.max(0, Math.min(1, info.progress)) * 100)}%`;
      hud.classList.toggle('hud-equilibrium-achieved', info.achieved);
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
          entry.chimeraPortrait ? 'notebook-entry-chimera' : '',
        ].filter(Boolean).join(' ');

        // Chimera breeds show a generated specimen portrait; others a label chip.
        let marker: HTMLElement;
        if (entry.chimeraPortrait) {
          const img = document.createElement('img');
          img.className = 'notebook-marker notebook-portrait';
          img.src = entry.chimeraPortrait;
          img.alt = `${entry.displayTitle} specimen`;
          img.loading = 'lazy';
          marker = img;
        } else {
          const span = document.createElement('span');
          span.className = 'notebook-marker';
          span.textContent = entry.isFresh ? 'NEW' : 'OK';
          marker = span;
        }

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
        meta.textContent = entry.chimeraSplice
          ? `${entry.chimeraSplice} · ${entry.caution}`
          : `${entry.category.replace('_', ' ')} / ${entry.caution}`;

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
    updateAtlas(view) {
      notebookAtlas.replaceChildren();
      for (const group of view.groups) {
        const section = document.createElement('section');
        section.className = 'atlas-group';
        const head = document.createElement('div');
        head.className = 'atlas-group-head';
        const label = document.createElement('strong');
        label.textContent = group.label;
        const count = document.createElement('span');
        count.className = 'atlas-group-count';
        count.textContent = `${group.discovered} / ${group.total}`;
        head.append(label, count);

        const grid = document.createElement('div');
        grid.className = 'atlas-grid';
        for (const node of group.nodes) {
          const tile = document.createElement('div');
          tile.className = `atlas-node atlas-node-${node.state} atlas-node-${node.caution}`;
          if (node.color) tile.style.setProperty('--node-color', rgb(node.color));
          const dot = document.createElement('span');
          dot.className = 'atlas-node-dot';
          const text = document.createElement('div');
          text.className = 'atlas-node-text';
          const title = document.createElement('strong');
          title.textContent = node.state === 'discovered' ? node.title : '? ? ?';
          const hint = document.createElement('small');
          hint.textContent = node.hint;
          text.append(title, hint);
          tile.append(dot, text);
          grid.append(tile);
        }
        section.append(head, grid);
        notebookAtlas.append(section);
      }
    },
    setLoadoutScreen(el) {
      loadoutMount.replaceChildren(el);
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
    setObjectiveChoices(choices, onPick) {
      objectiveChoices.replaceChildren();
      for (const objective of choices) {
        const btn = document.createElement('button');
        btn.className = 'pick-card objective-card';
        btn.type = 'button';
        const name = document.createElement('div');
        name.className = 'pick-card-name';
        name.textContent = objective.name;
        const desc = document.createElement('div');
        desc.className = 'pick-card-desc';
        desc.textContent = objective.description;
        const target = document.createElement('div');
        target.className = 'objective-card-target';
        target.textContent = objective.target;
        const hint = document.createElement('div');
        hint.className = 'objective-card-hint';
        hint.textContent = objective.hint ?? '';
        btn.append(name, desc, target, hint);
        btn.addEventListener('click', () => onPick(objective));
        objectiveChoices.append(btn);
      }
    },
    updateEnd(info) {
      endTitle.textContent = info.outcome === 'won' ? 'Lineage Stabilized' : 'Colony Collapsed';
      const objectiveLabel = info.objectivesCompleted === 1 ? 'objective' : 'objectives';
      let fightStr: string;
      if (info.totalFights === 0) {
        fightStr = info.outcome === 'won'
          ? `Homeostasis reached after epoch ${info.fightReached}; ${info.objectivesCompleted} ${objectiveLabel} banked.`
          : `Colony collapsed during epoch ${info.fightReached}; ${info.objectivesCompleted} ${objectiveLabel} banked.`;
      } else if (info.outcome === 'won') {
        fightStr = info.objectivesCompleted >= info.totalFights
          ? `All ${info.totalFights} objectives achieved — a flawless trial.`
          : `Trial concluded: ${info.objectivesCompleted} of ${info.totalFights} objectives achieved.`;
      } else {
        const fixedRunProgress = `${info.fightReached} / ${info.totalFights}`;
        fightStr = `Collapsed during ecosystem ${fixedRunProgress}.`;
      }
      const buildStr = info.upgrades.length === 0
        ? 'No upgrades picked.'
        : `Build: ${info.upgrades.join(', ')}.`;
      endSummary.textContent = `${fightStr} ${buildStr}`;
    },
    updateLabReport(report) {
      labReportMount.replaceChildren();
      if (report) labReportMount.append(renderLabReport(report));
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
    setEpochComplete(complete) {
      // Glow the End button + flag the HUD so the player sees the experiment is
      // ready to bank, without forcing them out of a flourishing dish.
      endEpochButton.classList.toggle('end-action-ready', complete);
      const endLabel = endEpochButton.querySelector<HTMLElement>('small');
      if (endLabel) endLabel.textContent = complete ? 'ready' : 'score dish';
      const endState = endEpochButton.querySelector<HTMLElement>('b');
      if (endState) endState.textContent = complete ? 'ready' : 'now';
      hud.classList.toggle('hud-complete', complete);
    },
  };
}

function rgb(color: [number, number, number]): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

// Stable per-lifeform seed so each icon's cellular jiggle differs but is
// deterministic across renders.
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// A swatch bloom that mirrors how the cell actually renders in the dish: a
// lightened luminous core fading to the true identity color, so the rack icon
// and the cultured colony read as the same organism. `lighten` matches the
// renderer's 0.3 boundary lift so the perceived hue lines up.
function shade(color: [number, number, number], f: number): string {
  // f > 0 lightens toward white; f < 0 darkens toward black. Clamped 0..255.
  const t = f >= 0 ? 255 : 0;
  const a = Math.abs(f);
  const mix = (c: number) => Math.round(Math.max(0, Math.min(255, t * a + c * (1 - a))));
  return rgb([mix(color[0]), mix(color[1]), mix(color[2])]);
}

function bloomGradient(color: [number, number, number]): string {
  return `radial-gradient(circle at 42% 38%, ${shade(color, 0.55)}, ${rgb(color)} 58%, ${shade(color, -0.4)} 100%)`;
}

function isToolId(tool: string | undefined): tool is ToolId {
  return tool === 'egg'
    || tool === 'nutrient'
    || tool === 'toxin'
    || tool === 'water'
    || tool === 'salt'
    || tool === 'acid'
    || tool === 'paste';
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
    paste: 'Paste - drag to draw a nutrient trail; colonies drift along the line you paint.',
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
    paste: 'Paste',
  };
  const summaries: Record<ToolId, string> = {
    egg: `${eggName} seed`,
    nutrient: 'feed and attract',
    toxin: 'repel and thin',
    water: 'dilute and spread',
    salt: 'slow and dry',
    acid: 'burn tissue',
    paste: 'draw a trail',
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
      // Life swatches carry a live CA <canvas> child, so never overwrite their
      // textContent (it would destroy the canvas); they show gray via CSS. Only
      // the tool/egg glyph icons get the '?'.
      if (!icon.classList.contains('life-swatch')) {
        icon.textContent = '?';
      }
      // Clear the identity color so the CSS gray specimen styling wins; the
      // inline background would otherwise override it and leave it colorful.
      if (icon.dataset.lifeColor) {
        icon.style.removeProperty('background');
        icon.style.removeProperty('box-shadow');
      }
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
    // Don't clear life-swatch text — it would remove the live CA canvas child.
    if (!icon.classList.contains('life-swatch')) icon.textContent = '';
    // Restore the identity color now that it's discovered.
    if (icon.dataset.lifeColor) icon.style.background = icon.dataset.lifeColor;
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
