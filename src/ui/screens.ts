import type { UpgradeDef } from '../content/upgrades';

type ScreenName = 'title' | 'pick' | 'end' | 'hud';

export interface HudInfo {
  fightIndex: number;          // 0-based; HUD shows fightIndex+1
  totalFights: number;
  vol: number;
  targetVol: number;
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

export interface Screens {
  show(name: ScreenName): void;
  hide(name: ScreenName): void;
  updateHud(info: HudInfo): void;
  setPickChoices(choices: PickChoice[], onPick: (id: string) => void): void;
  updateEnd(info: EndInfo): void;
  onTitleStart(handler: () => void): void;
  onEndRestart(handler: () => void): void;
}

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
  const hudUpgrades  = get('hud-upgrades');

  const elFor: Record<ScreenName, HTMLElement> = {
    title: screenTitle,
    pick: screenPick,
    end: screenEnd,
    hud,
  };

  return {
    show(name) { elFor[name].classList.add('visible'); },
    hide(name) { elFor[name].classList.remove('visible'); },
    updateHud(info) {
      hudFight.textContent = `${info.fightIndex + 1} / ${info.totalFights}`;
      hudVol.textContent = `${info.vol} / ${Math.round(info.targetVol)}`;
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
      endTitle.textContent = info.outcome === 'won' ? 'Run Complete' : 'Defeated';
      const fightStr = info.outcome === 'won'
        ? `Won all ${info.totalFights} fights.`
        : `Defeated on Fight ${info.fightReached} / ${info.totalFights}.`;
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
