import type { AgitationState, EquilibriumInfo, ToolState } from '../game/arena';
import type { LabReport } from '../game/labReport';
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
import type { ResearchCaseDef, ResearchTrialDef } from '../content/researchCases';
import type { ResearchNotebookView } from '../game/researchNotebook';

type ScreenName = 'title' | 'pick' | 'end' | 'hud' | 'notebook';
type AppScreenName = ScreenName | 'loadout' | 'objective';
type LayoutScreenName = 'title' | 'loadout' | 'pick' | 'objective' | 'end' | 'notebook' | 'arena';
export type ToolId = 'egg' | 'nutrient' | 'toxin' | 'water' | 'salt' | 'acid' | 'paste';
export type ButtonHintLevel = 'hint' | 'ready';
export type ButtonHintTarget = ToolId | 'notebook';

export interface HudInfo {
  fightIndex: number;          // 0-based; HUD shows fightIndex+1
  totalFights: number;
  caseTrialCount: number;
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
  objectiveTimed: boolean;
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

export interface CaseProgressInfo {
  caseDef: ResearchCaseDef;
  activeTrial: ResearchTrialDef;
  activeTrialIndex: number;
  completedResults: readonly ('completed' | 'lapsed' | undefined)[];
  openLabUnlocked: boolean;
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
  updateNotebook(view: NotebookView): void;
  updateResearchNotebook(view: ResearchNotebookView): void;
  updateAtlas(view: AtlasView): void;
  setLoadoutScreen(el: HTMLElement): void;
  setPickChoices(choices: PickChoice[], onPick: (id: string) => void): void;
  setObjectiveChoices(choices: ObjectiveDef[], onPick: (objective: ObjectiveDef) => void): void;
  updateEnd(info: EndInfo): void;
  updateLabReport(report: LabReport | null): void;
  updateCaseProgress(info: CaseProgressInfo): void;
  onTitleStart(handler: () => void): void;
  onEndRestart(handler: () => void): void;
  onNotebookOpen(handler: () => void): void;
  onNotebookClose(handler: () => void): void;
  onFullscreenOpen(handler: () => void): void;
  setFullscreenActive(active: boolean): void;
  onOptionsOpen(handler: () => void): void;
  onOptionsClose(handler: () => void): void;
  onAudioToggle(handler: () => void): void;
  setAudioMuted(muted: boolean): void;
  onHapticsToggle(handler: () => void): void;
  setHapticsAvailable(available: boolean): void;
  setHapticsEnabled(enabled: boolean): void;
  setEpochComplete(complete: boolean): void;
  openMobileLifeformsDrawer(): void;
  closeMobileDrawers(): void;
  onToolboxReveal(handler: () => void): void;
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
  const titleStartLabel = get('title-start-label');
  const titleCaseProgress = get('title-case-progress');
  const titleTrialLabel = get('title-trial-label');
  const titleTrialHypothesis = get('title-trial-hypothesis');
  const pickCaseProgress = get('pick-case-progress');
  const methodHandoff = get('method-handoff');
  const notebookButton = get('notebook-button') as HTMLButtonElement;
  const fullscreenButton = get('fullscreen-button') as HTMLButtonElement;
  const optionsButton = get('options-button') as HTMLButtonElement;
  const optionsClose = get('options-close') as HTMLButtonElement;
  const optionsScrim = get('options-scrim') as HTMLButtonElement;
  const audioButton = get('audio-button') as HTMLButtonElement;
  const hapticsButton = get('haptics-button') as HTMLButtonElement;
  const notebookClose = get('notebook-close') as HTMLButtonElement;
  const notebookProgress = get('notebook-progress');
  const notebookStudy = get('notebook-study');
  const notebookList = get('notebook-list');
  const notebookAtlas = get('notebook-atlas');
  const notebookTabStudy = get('notebook-tab-study') as HTMLButtonElement;
  const notebookTabLog = get('notebook-tab-log') as HTMLButtonElement;
  const notebookTabAtlas = get('notebook-tab-atlas') as HTMLButtonElement;
  const loadoutMount = get('loadout-mount');
  const pickChoices  = get('pick-choices');
  const objectiveChoices = get('objective-choices');
  const endTitle     = get('end-title');
  const endSummary   = get('end-summary');
  const labReportMount = get('lab-report-mount');
  const endRestart   = get('end-restart');
  const hudFightKey  = get('hud-fight-key');
  const hudFight     = get('hud-fight');
  const hudVol       = get('hud-vol');
  const hudProgress  = get('hud-progress');
  const hudTimeKey = get('hud-time-key');
  let lastDeadlineSeconds = -1;
  const hudEquilibrium = get('hud-equilibrium');
  const hudEco       = get('hud-eco');
  const hudObjective = get('hud-objective');
  const hudDirectorTitle = get('hud-director-title');
  const hudDirectorProgress = get('hud-director-progress');
  const hudHint      = get('hud-hint');
  const hudUpgrades  = get('hud-upgrades');
  const toolSummary  = get('tool-summary');
  const mobileLifeformsToggle = get('mobile-lifeforms-toggle') as HTMLButtonElement;
  const mobileLogToggle = get('mobile-log-toggle') as HTMLButtonElement;
  const mobileToolName = get('mobile-tool-name');
  const mobileToolSummary = get('mobile-tool-summary');
  const eggOptions   = get('egg-options');
  const lifeSummary  = get('life-summary');
  const lifeCount    = get('life-count');
  const lifePanel = get('life-panel');
  const lifePanelClose = get('life-panel-close') as HTMLButtonElement;
  const lifeList     = get('life-list');
  const tickerLines  = get('ticker-lines');
  const agitateButton = get('agitate-button') as HTMLButtonElement;
  const agitateCount = get('agitate-count');
  const endEpochButton = get('end-epoch-button') as HTMLButtonElement;
  const toolButtons  = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-tool]'));
  const toolbox = get('toolbox');
  const toolboxMore = get('toolbox-more') as HTMLButtonElement;
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
  let currentAgitationState: AgitationState = {
    charges: 0,
    maxCharges: 0,
    activeTicks: 0,
    cooldownRemainingTicks: 0,
    cooldownTicks: 0,
  };
  let eggSelectHandler: ((archetype: EnemyArchetype) => void) | null = null;
  let lifeformSelectHandler: ((id: string) => void) | null = null;
  const optionByArchetype = new Map<EnemyArchetype, EggOption>();
  const iconCells = createIconCells();
  let toolboxRevealHandler: (() => void) | null = null;

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
    const previous = mobileDrawer;
    mobileDrawer = next;
    layout.dataset.mobileDrawer = mobileDrawer;
    layout.classList.toggle('mobile-lifeforms-open', mobileDrawer === 'lifeforms');
    layout.classList.toggle('mobile-log-open', mobileDrawer === 'log');
    mobileLifeformsToggle.setAttribute('aria-expanded', String(mobileDrawer === 'lifeforms'));
    eggTool?.setAttribute('aria-expanded', String(mobileDrawer === 'lifeforms'));
    mobileLogToggle.setAttribute('aria-expanded', String(mobileDrawer === 'log'));
    if (
      previous === 'lifeforms'
      && next !== 'lifeforms'
      && document.activeElement instanceof HTMLElement
      && lifePanel.contains(document.activeElement)
    ) {
      eggTool?.focus({ preventScroll: true });
    }
  }

  function closeMobileDrawers(): void {
    setMobileDrawer('none');
  }

  function applyLifeformVisibility(): void {
    let readyCount = 0;
    for (const [id, button] of lifeButtons) {
      const locked = !unlockedLifeformIds.has(id);
      if (!locked) readyCount += 1;
      button.hidden = locked;
      setUnknownState(button, locked, 'Unknown lifeform');
      const selected = !locked && id === selectedLifeformId;
      setSelectedButtonState(button, selected);
    }
    lifeCount.textContent = `${readyCount} / ${lifeButtons.size} ready`;
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

  function selectedLifeformName(): string | undefined {
    return selectedLifeformId && selectedLifeformId in LIFEFORM_IDENTITIES
      ? LIFEFORM_IDENTITIES[selectedLifeformId as LifeformIdentityId].name
      : undefined;
  }

  function syncToolReadouts(): void {
    const lifeformName = selectedLifeformName();
    updateToolSummary(
      toolSummary,
      selectedToolId,
      selectedEggArchetype,
      optionByArchetype,
      lifeformName,
    );
    updateMobileToolReadout(
      mobileToolName,
      mobileToolSummary,
      selectedToolId,
      selectedEggArchetype,
      optionByArchetype,
      lifeformName,
    );
  }

  function setSelectedLifeform(id: string | null): void {
    if (id && !unlockedLifeformIds.has(id)) return;
    selectedLifeformId = id;
    for (const [buttonId, button] of lifeButtons) {
      setSelectedButtonState(button, buttonId === id);
    }
    if (!id || !(id in LIFEFORM_IDENTITIES)) {
      lifeSummary.textContent = 'Pick an egg strain to seed the dish.';
      syncToolReadouts();
      return;
    }
    const identity = LIFEFORM_IDENTITIES[id as LifeformIdentityId];
    lifeSummary.textContent = `${identity.name} - ${identity.role}. ${identity.behavior} ${identity.origin} Sound: ${identity.soundId}.`;
    eggTool?.style.setProperty('--egg-color', rgb(identity.colors.primary));
    syncToolReadouts();
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
  lifePanelClose.addEventListener('click', closeMobileDrawers);
  mobileLogToggle.addEventListener('click', () => {
    setMobileDrawer(mobileDrawer === 'log' ? 'none' : 'log');
  });
  setMobileDrawer('none');
  syncLayoutScreen();

  type NotebookTab = 'study' | 'log' | 'atlas';
  const notebookTabs: Array<{ id: NotebookTab; button: HTMLButtonElement; page: HTMLElement }> = [
    { id: 'study', button: notebookTabStudy, page: notebookStudy },
    { id: 'log', button: notebookTabLog, page: notebookList },
    { id: 'atlas', button: notebookTabAtlas, page: notebookAtlas },
  ];

  function setNotebookTab(tab: NotebookTab, focus = false): void {
    for (const item of notebookTabs) {
      const selected = item.id === tab;
      item.button.classList.toggle('is-active', selected);
      item.button.setAttribute('aria-selected', String(selected));
      item.button.tabIndex = selected ? 0 : -1;
      item.page.classList.toggle('is-active', selected);
      item.page.hidden = !selected;
      if (selected && focus) item.button.focus();
    }
  }
  notebookTabStudy.addEventListener('click', () => setNotebookTab('study'));
  notebookTabLog.addEventListener('click', () => setNotebookTab('log'));
  notebookTabAtlas.addEventListener('click', () => setNotebookTab('atlas'));
  for (const [index, item] of notebookTabs.entries()) {
    item.button.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? notebookTabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + notebookTabs.length) % notebookTabs.length;
      setNotebookTab(notebookTabs[nextIndex]!.id, true);
    });
  }
  setNotebookTab('study');

  function syncToolboxOverflow(): void {
    const overflow = toolbox.scrollWidth > toolbox.clientWidth + 4;
    const atEnd = toolbox.scrollLeft + toolbox.clientWidth >= toolbox.scrollWidth - 6;
    toolboxMore.hidden = !overflow;
    toolboxMore.dataset.direction = atEnd ? 'back' : 'more';
    toolboxMore.setAttribute('aria-label', atEnd ? 'Show earlier reagents' : 'Show more reagents');
    const glyph = toolboxMore.querySelector('span');
    if (glyph) glyph.textContent = atEnd ? '‹' : '›';
  }

  toolboxMore.addEventListener('click', () => {
    const back = toolboxMore.dataset.direction === 'back';
    toolbox.scrollBy({ left: (back ? -1 : 1) * toolbox.clientWidth * 0.72, behavior: 'smooth' });
    toolboxRevealHandler?.();
  });
  toolbox.addEventListener('scroll', () => {
    syncToolboxOverflow();
    if (Math.abs(toolbox.scrollLeft) > 8) toolboxRevealHandler?.();
  }, { passive: true });
  window.addEventListener('resize', syncToolboxOverflow);

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

  // Radial cooldown wipe: --cooldown is the remaining fraction (1 → 0) that
  // CSS renders as a conic sweep over the tool icon.
  function applyCooldownUi(
    btn: HTMLButtonElement,
    state: { cooldownRemainingTicks: number; cooldownTicks: number },
  ): void {
    const cooling = state.cooldownTicks > 0 && state.cooldownRemainingTicks > 0;
    btn.style.setProperty(
      '--cooldown',
      cooling ? (state.cooldownRemainingTicks / state.cooldownTicks).toFixed(3) : '0',
    );
    btn.classList.toggle('tool-cooling', cooling);
  }

  function applyAgitationUi(): void {
    agitateButton.hidden = !agitationUnlocked;
    agitateButton.disabled = !agitationUnlocked || currentAgitationState.charges <= 0;
    agitateButton.classList.toggle('selected', agitationUnlocked && currentAgitationState.activeTicks > 0);
    agitateCount.textContent = agitationUnlocked
      ? `${currentAgitationState.charges}/${currentAgitationState.maxCharges}`
      : '?';
    applyCooldownUi(agitateButton, currentAgitationState);
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
      const focusTarget = name === 'title'
        ? titleStart
        : name === 'loadout'
          ? screenLoadout.querySelector<HTMLButtonElement>('button')
          : name === 'pick'
            ? pickChoices.querySelector<HTMLButtonElement>('button')
            : name === 'objective'
              ? objectiveChoices.querySelector<HTMLButtonElement>('button')
              : name === 'end'
                ? endRestart
                : name === 'notebook'
                  ? notebookClose
                  : name === 'hud'
                    ? document.getElementById('game')
                    : null;
      window.requestAnimationFrame(() => focusTarget?.focus({ preventScroll: true }));
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
      syncToolReadouts();
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
      window.requestAnimationFrame(syncToolboxOverflow);
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
        applyCooldownUi(btn, state);
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
      syncToolReadouts();
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
      hudFightKey.textContent = info.totalFights > 0 ? 'Trial' : 'Study';
      hudFight.textContent = info.totalFights > 0
        ? `${info.fightIndex + 1} / ${info.totalFights}`
        : `${Math.max(1, info.fightIndex - info.caseTrialCount + 1)} / ∞`;
      hudVol.textContent = `${info.vol} / ${Math.round(info.targetVol)}`;
      hudTimeKey.textContent = info.objectiveTimed ? 'Window' : 'Dish';
      hudProgress.textContent = info.objectiveTimed ? `${info.secondsRemaining}s` : 'Open';
      const urgent = info.objectiveTimed && !info.objectiveComplete;
      hudProgress.classList.toggle(
        'hud-deadline-warning',
        urgent && info.secondsRemaining <= 20 && info.secondsRemaining > 10,
      );
      hudProgress.classList.toggle(
        'hud-deadline-critical',
        urgent && info.secondsRemaining <= 10,
      );
      if (urgent && info.secondsRemaining <= 20 && info.secondsRemaining !== lastDeadlineSeconds) {
        hudProgress.classList.remove('hud-deadline-tick');
        void hudProgress.offsetWidth;
        hudProgress.classList.add('hud-deadline-tick');
      }
      lastDeadlineSeconds = info.secondsRemaining;
      const crisis = info.crisis === 'none' ? '' : `, ${info.crisis} active`;
      hudEco.textContent = `${info.livingEnemies} lifeforms, ${info.worldEvents} fertile events, ${info.outbreaks} outbreaks, ${info.reactions} reactions, ${info.accidents} accidents, ${info.mutations} mutations, ${info.births} births, ${info.supplyDrops} drops, ${info.dominant} dominant${crisis}`;
      hudObjective.textContent = info.objectiveComplete
        ? `${info.objectiveName}: complete — finish when ready`
        : `${info.objectiveName}: ${info.objectiveSummary}`;
      hudDirectorTitle.textContent = info.objectiveName;
      hudDirectorProgress.textContent = info.objectiveComplete
        ? 'Complete — finish when ready'
        : info.objectiveSummary;
      hudHint.textContent = info.objectiveComplete
        ? 'That is the result. Press End to bank it, or keep cultivating.'
        : info.objectiveHint;
      hudUpgrades.textContent = info.upgrades.length === 0 ? 'none' : info.upgrades.join(', ');
    },
    setEquilibrium(info) {
      hudEquilibrium.textContent = info.achieved
        ? info.biomeName ?? 'Stable'
        : `${Math.round(Math.max(0, Math.min(1, info.progress)) * 100)}%`;
      hud.classList.toggle('hud-equilibrium-achieved', info.achieved);
    },
    updateNotebook(view) {
      notebookProgress.textContent = `${view.observedCount} observed · ${view.understoodCount} understood · ${view.stabilizedCount} stabilized`;
      notebookList.replaceChildren();
      for (const entry of view.entries) {
        if (!entry.discovered) continue;
        const card = document.createElement('article');
        card.className = [
          'notebook-entry',
          `notebook-entry-${entry.category}`,
          `notebook-entry-${entry.caution}`,
          `notebook-entry-stage-${entry.researchStage}`,
          entry.isFresh ? 'notebook-entry-new' : 'notebook-entry-discovered',
          entry.genomePortrait ? 'notebook-entry-genome' : '',
        ].filter(Boolean).join(' ');

        // Every discovered lifeform gets one canonical genome reconstruction.
        // Observed-but-unstabilized specimens remain visually unresolved.
        let marker: HTMLElement;
        if (entry.genomePortrait) {
          const img = document.createElement('img');
          img.className = `notebook-marker notebook-genome-portrait${entry.eggSynthesisAvailable ? ' is-decoded' : ' is-observed'}`;
          img.src = entry.genomePortrait;
          img.alt = entry.genomeAlt;
          img.loading = 'lazy';
          marker = img;
        } else {
          const span = document.createElement('span');
          span.className = 'notebook-marker';
          span.textContent = entry.researchStage === 'observed'
            ? 'OBS'
            : entry.researchStage === 'understood' ? 'HYP' : 'STB';
          marker = span;
        }

        const copy = document.createElement('div');
        const header = document.createElement('div');
        header.className = 'notebook-entry-head';
        const title = document.createElement('strong');
        title.textContent = entry.displayTitle;
        const status = document.createElement('span');
        status.className = `notebook-status notebook-status-${entry.researchStage}${entry.isFresh ? ' notebook-status-new' : ''}`;
        status.textContent = entry.researchStage.toUpperCase();
        header.append(title, status);

        const meta = document.createElement('div');
        meta.className = 'notebook-meta';
        meta.textContent = entry.isReferenceGenome
          ? `REFERENCE GENOME · ${entry.caution}`
          : entry.genomeLineage
            ? `Parents: ${entry.genomeLineage} · ${entry.caution}`
            : entry.chimeraSplice
              ? `DNA splice: ${entry.chimeraSplice} · ${entry.caution}`
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
    updateResearchNotebook(view) {
      notebookStudy.replaceChildren();

      const intro = document.createElement('p');
      intro.className = 'research-observation-prompt';
      intro.textContent = `Dr. E: “${view.observationPrompt}”`;
      notebookStudy.append(intro);

      if (view.hypothesis) {
        const hypothesis = document.createElement('section');
        hypothesis.className = `research-hypothesis research-hypothesis-${view.hypothesis.state}`;
        const label = document.createElement('span');
        label.className = 'research-kicker';
        label.textContent = 'Active hypothesis';
        const head = document.createElement('div');
        head.className = 'research-hypothesis-head';
        const title = document.createElement('h3');
        title.textContent = view.hypothesis.name;
        const state = document.createElement('span');
        state.className = 'research-state';
        state.textContent = view.hypothesis.state === 'confirmed' ? 'Evidence found' : 'Unresolved';
        head.append(title, state);
        const question = document.createElement('p');
        question.className = 'research-question';
        question.textContent = view.hypothesis.question;
        const evidence = document.createElement('p');
        evidence.className = 'research-evidence';
        evidence.textContent = `Observed: ${view.hypothesis.evidence}`;
        const note = document.createElement('p');
        note.className = 'research-professor-note';
        note.textContent = `Professor’s margin note — ${view.hypothesis.professorNote}`;
        const time = document.createElement('span');
        time.className = 'research-time';
        time.textContent = view.hypothesis.timeLabel;
        hypothesis.append(label, head, question, evidence, note, time);
        notebookStudy.append(hypothesis);
      }

      const fieldSection = document.createElement('section');
      fieldSection.className = 'field-studies';
      const fieldHead = document.createElement('div');
      fieldHead.className = 'field-studies-head';
      const fieldTitle = document.createElement('h3');
      fieldTitle.textContent = view.allDiscoveriesRevealed ? 'Open field studies' : 'Long-form field studies';
      const fieldCopy = document.createElement('p');
      fieldCopy.textContent = view.allDiscoveriesRevealed
        ? 'No score. No deadline. These are reasons to look again.'
        : 'Optional lines of inquiry that persist between dishes.';
      fieldHead.append(fieldTitle, fieldCopy);
      fieldSection.append(fieldHead);

      const list = document.createElement('div');
      list.className = 'field-study-list';
      for (const study of view.fieldStudies) {
        const row = document.createElement('article');
        row.className = `field-study${study.complete ? ' field-study-complete' : ''}`;
        const copy = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = study.title;
        const prompt = document.createElement('p');
        prompt.textContent = study.prompt;
        copy.append(title, prompt);
        const progress = document.createElement('div');
        progress.className = 'field-study-progress';
        const value = document.createElement('span');
        value.textContent = study.progressLabel;
        const track = document.createElement('span');
        track.className = 'field-study-track';
        const fill = document.createElement('span');
        fill.style.width = `${Math.round((study.progress / Math.max(1, study.target)) * 100)}%`;
        track.append(fill);
        progress.append(value, track);
        row.append(copy, progress);
        list.append(row);
      }
      fieldSection.append(list);
      notebookStudy.append(fieldSection);

      const sealSection = document.createElement('section');
      sealSection.className = 'research-seals';
      const sealHead = document.createElement('div');
      sealHead.className = 'research-seals-head';
      const sealTitle = document.createElement('h3');
      sealTitle.textContent = 'Research seals';
      const sealCount = document.createElement('span');
      sealCount.textContent = `${view.seals.filter((seal) => seal.earned).length} / ${view.seals.length} stamped`;
      sealHead.append(sealTitle, sealCount);
      const sealIntro = document.createElement('p');
      sealIntro.className = 'research-seals-intro';
      sealIntro.textContent = 'Permanent marks of technique, discovery and ecological control.';
      sealSection.append(sealHead, sealIntro);

      const sealGrid = document.createElement('div');
      sealGrid.className = 'research-seal-grid';
      for (const [index, seal] of view.seals.entries()) {
        const card = document.createElement('article');
        card.className = `research-seal${seal.earned ? ' research-seal-earned' : ' research-seal-locked'}`;
        const marker = makeSwatch('research-seal-marker', seal.earned ? seal.color : [72, 82, 86], 700 + index * 37);
        marker.setAttribute('aria-hidden', 'true');
        const copy = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = seal.earned ? seal.title : 'Unstamped seal';
        const description = document.createElement('p');
        description.textContent = seal.description;
        const note = document.createElement('small');
        note.textContent = seal.earned ? `Dr. E: “${seal.professorNote}”` : 'Complete the field condition to stamp this seal.';
        copy.append(name, description, note);
        card.append(marker, copy);
        sealGrid.append(card);
      }
      sealSection.append(sealGrid);

      const records = document.createElement('div');
      records.className = 'research-records';
      const recordsTitle = document.createElement('strong');
      recordsTitle.textContent = 'Field records';
      const recordsCopy = document.createElement('p');
      recordsCopy.textContent = `${view.records.biomeCount} biomes · ${view.records.peakBiodiversity} peak families · ${view.records.maxReactions} reaction chain · ${view.records.longestStabilitySeconds}s stability`;
      records.append(recordsTitle, recordsCopy);
      if (view.records.biomeNames.length > 0) {
        const biomeList = document.createElement('small');
        biomeList.textContent = view.records.biomeNames.join(' · ');
        records.append(biomeList);
      }
      sealSection.append(records);
      notebookStudy.append(sealSection);
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
        count.textContent = group.key === 'lifeform'
          ? `${group.decoded} / ${group.total} decoded`
          : `${group.discovered} / ${group.total}`;
        head.append(label, count);

        const grid = document.createElement('div');
        grid.className = 'atlas-grid';
        for (const node of group.nodes) {
          const tile = document.createElement('div');
          tile.className = `atlas-node atlas-node-${node.state} atlas-node-${node.caution}${node.genomePortrait ? ' atlas-node-genome-entry' : ''}`;
          if (node.color) tile.style.setProperty('--node-color', rgb(node.color));
          let marker: HTMLElement;
          if (node.genomePortrait) {
            const portrait = document.createElement('img');
            portrait.className = `atlas-node-genome${node.decoded ? ' is-decoded' : ' is-silhouette'}`;
            portrait.src = node.genomePortrait;
            portrait.alt = node.genomeAlt;
            portrait.loading = 'lazy';
            marker = portrait;
          } else {
            const dot = document.createElement('span');
            dot.className = 'atlas-node-dot';
            marker = dot;
          }
          const text = document.createElement('div');
          text.className = 'atlas-node-text';
          const title = document.createElement('strong');
          title.textContent = node.state !== 'locked' ? node.title : '? ? ?';
          const hint = document.createElement('small');
          hint.textContent = node.hint;
          text.append(title, hint);
          tile.append(marker, text);
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
        const kind = document.createElement('span');
        kind.className = 'pick-card-kind';
        kind.textContent = 'Method bonus';
        const desc = document.createElement('div');
        desc.className = 'pick-card-desc';
        desc.textContent = c.def.description;
        const action = document.createElement('span');
        action.className = 'pick-card-action';
        action.textContent = 'Choose this method';
        btn.append(kind, name, desc, action);
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
        const mode = document.createElement('div');
        mode.className = `objective-card-mode${objective.timed ? ' objective-card-mode-timed' : ''}`;
        mode.textContent = objective.timed ? 'Timed observation window' : 'Open dish · end when ready';
        const target = document.createElement('div');
        target.className = 'objective-card-target';
        target.textContent = objective.target;
        const hint = document.createElement('div');
        hint.className = 'objective-card-hint';
        hint.textContent = objective.hint ?? '';
        btn.append(name, mode, desc, target, hint);
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
          ? `Homeostasis reached after trial ${info.fightReached}; ${info.objectivesCompleted} ${objectiveLabel} banked.`
          : `Colony collapsed during trial ${info.fightReached}; ${info.objectivesCompleted} ${objectiveLabel} banked.`;
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
    updateCaseProgress(info) {
      const completed = info.completedResults.filter((result) => result === 'completed').length;
      titleCaseProgress.textContent = info.openLabUnlocked
        ? 'Case 01 sealed · Open Lab ready'
        : `${completed} / ${info.caseDef.trials.length} sealed`;
      titleTrialLabel.textContent = info.openLabUnlocked
        ? 'Open Lab · Continuing research'
        : `Trial ${String(info.activeTrial.number).padStart(2, '0')} · ${info.activeTrial.name}`;
      titleTrialHypothesis.textContent = info.openLabUnlocked
        ? 'Choose a field study, cultivate freely, and bank whatever the dish teaches you.'
        : info.activeTrial.hypothesis;
      titleStartLabel.textContent = info.openLabUnlocked ? 'Enter Open Lab' : 'Run Trial';
      pickCaseProgress.textContent = info.openLabUnlocked
        ? 'Case 01 sealed · Open Lab unlocked'
        : `Trial logged · ${completed} / ${info.caseDef.trials.length} sealed`;
      methodHandoff.hidden = info.activeTrialIndex !== 0;

      document.querySelectorAll<HTMLElement>('[data-case-trial]').forEach((node) => {
        const index = Number(node.dataset.caseTrial);
        node.classList.toggle('is-complete', info.completedResults[index] === 'completed');
        node.classList.toggle('is-lapsed', info.completedResults[index] === 'lapsed');
        node.classList.toggle('is-active', !info.openLabUnlocked && index === info.activeTrialIndex);
      });
      document.querySelectorAll<HTMLElement>('[data-case-dot]').forEach((node) => {
        const index = Number(node.dataset.caseDot);
        node.classList.toggle('is-complete', info.completedResults[index] === 'completed');
        node.classList.toggle('is-lapsed', info.completedResults[index] === 'lapsed');
        node.classList.toggle('is-active', index === info.activeTrialIndex);
      });
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
      fullscreenButton.textContent = active ? 'Exit full screen' : 'Full screen';
    },
    onOptionsOpen(handler) {
      optionsButton.addEventListener('click', handler);
    },
    onOptionsClose(handler) {
      optionsClose.addEventListener('click', handler);
      optionsScrim.addEventListener('click', handler);
    },
    onAudioToggle(handler) {
      audioButton.addEventListener('click', handler);
    },
    setAudioMuted(muted) {
      audioButton.setAttribute('aria-pressed', String(muted));
      audioButton.setAttribute('aria-label', muted ? 'Unmute audio' : 'Mute audio');
      audioButton.textContent = muted ? 'Sound — Muted' : 'Sound — On';
    },
    onHapticsToggle(handler) {
      hapticsButton.addEventListener('click', handler);
    },
    setHapticsAvailable(available) {
      hapticsButton.hidden = !available;
    },
    setHapticsEnabled(enabled) {
      hapticsButton.setAttribute('aria-pressed', String(!enabled));
      hapticsButton.setAttribute('aria-label', enabled ? 'Disable haptics' : 'Enable haptics');
      hapticsButton.textContent = enabled ? 'Haptics — On' : 'Haptics — Off';
    },
    setEpochComplete(complete) {
      // Glow the End button + flag the HUD so the player sees the experiment is
      // ready to bank, without forcing them out of a flourishing dish.
      endEpochButton.classList.toggle('end-action-ready', complete);
      const endLabel = endEpochButton.querySelector<HTMLElement>('small');
      if (endLabel) endLabel.textContent = complete ? 'bank result' : 'bank or leave';
      const endState = endEpochButton.querySelector<HTMLElement>('b');
      if (endState) endState.textContent = complete ? 'ready' : 'now';
      hud.classList.toggle('hud-complete', complete);
    },
    openMobileLifeformsDrawer() {
      setMobileDrawer(unlockedLifeformIds.size > 1 ? 'lifeforms' : 'none');
    },
    closeMobileDrawers() {
      closeMobileDrawers();
    },
    onToolboxReveal(handler) {
      toolboxRevealHandler = handler;
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
  selectedLifeformName?: string,
): void {
  const eggName = selectedLifeformName ?? eggOptions.get(eggArchetype)?.name ?? 'selected';
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
  selectedLifeformName?: string,
): void {
  const eggName = selectedLifeformName ?? eggOptions.get(eggArchetype)?.name ?? 'selected culture';
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
