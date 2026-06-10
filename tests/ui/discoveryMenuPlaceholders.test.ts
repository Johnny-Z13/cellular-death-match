// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const screensSource = readFileSync('src/ui/screens.ts', 'utf8');
const css = readFileSync('src/styles.css', 'utf8');
const html = readFileSync('index.html', 'utf8');
const fxSource = readFileSync('src/ui/fx.ts', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');

describe('discovery menu placeholders', () => {
  it('keeps locked discovery slots visible as disabled unknown entries', () => {
    expect(screensSource).toContain('locked-discovery');
    expect(screensSource).toContain('Unknown');
    expect(screensSource).toContain("button.hidden = false");
    expect(screensSource).not.toContain('btn.hidden = !unlockedToolIds.has(tool)');
    expect(screensSource).not.toContain('button.hidden = !unlockedLifeformIds.has(id)');
    expect(css).toContain('.locked-discovery');
    expect(css).toContain('.unknown-icon');
  });

  it('uses one reagent-style vertical card list for all lifeforms', () => {
    expect(screensSource).toContain('Lifeform cards own egg selection and discovery inspection in one list.');
    expect(screensSource).toContain("button.className = 'life-item tool-button'");
    expect(screensSource).toContain('button.dataset.eggArchetype = option.archetype');
    expect(screensSource).toContain("button.setAttribute('aria-selected', 'false');");
    expect(screensSource).toContain("button.addEventListener('click', () => activateLifeform(option.archetype));");
    expect(screensSource).toContain("item.setAttribute('aria-selected', 'false');");
    expect(screensSource).toContain("item.addEventListener('click', () => activateLifeform(id));");
    expect(screensSource).toContain('setSelectedButtonState(button, buttonId === id);');
    expect(screensSource).toContain('setSelectedButtonState(button, false);');
    expect(screensSource).toContain('if (!unlockedLifeformIds.has(id)) return;');
    expect(screensSource).not.toContain("addEventListener('mouseenter', () => selectLifeform");
    expect(screensSource).not.toContain("addEventListener('pointerdown', () => selectLifeform");
    expect(screensSource).not.toContain("addEventListener('focus', () => selectLifeform");
    expect(css).toContain('.life-panel .egg-options {\n  display: none;');
    expect(css).toContain('grid-template-columns: 28px minmax(0, 1fr) auto');
    expect(css).toContain('.life-panel .life-item.tool-button.selected,\n.life-panel .life-item.tool-button[aria-selected="true"]');
    expect(css).toContain('border-color: var(--life-color)');
    expect(css).toContain('box-shadow: inset 4px 0 0 var(--life-color)');
    expect(screensSource).not.toContain('lifeButtons.set(option.archetype, item)');
  });

  it('applies lifeform selected state through the same click activation path as reagent buttons', () => {
    const activateLifeformStart = screensSource.indexOf('function activateLifeform(id: string): void {');
    expect(activateLifeformStart).toBeGreaterThan(-1);
    const activateLifeformEnd = screensSource.indexOf('\n  }\n\n  return {', activateLifeformStart);
    const activateLifeformBody = screensSource.slice(activateLifeformStart, activateLifeformEnd);

    expect(activateLifeformBody).toContain('setSelectedLifeform(id);');
    expect(activateLifeformBody).toContain('lifeformSelectHandler?.(id);');
    expect(activateLifeformBody).toContain('eggSelectHandler?.(eggOption.archetype);');
    expect(activateLifeformBody.indexOf('setSelectedLifeform(id);')).toBeLessThan(
      activateLifeformBody.indexOf('lifeformSelectHandler?.(id);'),
    );
    expect(activateLifeformBody.indexOf('setSelectedLifeform(id);')).toBeLessThan(
      activateLifeformBody.indexOf('eggSelectHandler?.(eggOption.archetype);'),
    );
  });

  it('keeps unlocked lifeform card clicks equivalent to reagent card clicks', () => {
    const activateLifeformStart = screensSource.indexOf('function activateLifeform(id: string): void {');
    expect(activateLifeformStart).toBeGreaterThan(-1);
    const activateLifeformEnd = screensSource.indexOf('\n  }\n\n  return {', activateLifeformStart);
    const activateLifeformBody = screensSource.slice(activateLifeformStart, activateLifeformEnd);

    expect(activateLifeformBody).toContain('if (!unlockedLifeformIds.has(id)) return;');
    expect(activateLifeformBody).toContain('setSelectedLifeform(id);');
    expect(activateLifeformBody).toContain('lifeformSelectHandler?.(id);');
    expect(screensSource).toContain("btn.addEventListener('click', () => handler(tool));");
    expect(screensSource).toContain("button.addEventListener('click', () => activateLifeform(option.archetype));");
    expect(screensSource).toContain("item.addEventListener('click', () => activateLifeform(id));");
    expect(screensSource).not.toContain('setSelectedLifeform(selectedEggArchetype)');
  });

  it('uses one selected-card helper for reagent and lifeform buttons', () => {
    expect(screensSource).toContain('function setSelectedButtonState(button: HTMLButtonElement, selected: boolean): void {');
    expect(screensSource).toContain("button.classList.toggle('selected', selected);");
    expect(screensSource).toContain("button.setAttribute('aria-selected', String(selected));");
    expect(screensSource).toContain('setSelectedButtonState(btn, btn.dataset.tool === tool);');
    expect(screensSource).toContain('setSelectedButtonState(button, buttonId === id);');
  });

  it('keeps the selected lifeform card visually accented with its identity color', () => {
    const selectedRuleStart = css.indexOf('.life-panel .life-item.tool-button.selected,');
    expect(selectedRuleStart).toBeGreaterThan(-1);
    const selectedRuleEnd = css.indexOf('\n}', selectedRuleStart);
    const selectedRule = css.slice(selectedRuleStart, selectedRuleEnd);

    expect(selectedRule).toContain('box-shadow: inset 4px 0 0 var(--life-color)');
  });

  it('uses the reagent selected-card language for selected lifeform rows', () => {
    const selectedRuleStart = css.indexOf('.life-panel .life-item.tool-button.selected,');
    expect(selectedRuleStart).toBeGreaterThan(-1);
    const selectedRuleEnd = css.indexOf('\n}', selectedRuleStart);
    const selectedRule = css.slice(selectedRuleStart, selectedRuleEnd);

    expect(selectedRule).toContain('background: rgba(32, 48, 54, 0.92) !important;');
    expect(selectedRule).toContain('border-color: #8ab1b5 !important;');
    expect(selectedRule).toContain('outline: 1px solid #8ab1b5;');
    expect(selectedRule).toContain('box-shadow: inset 4px 0 0 var(--life-color), 0 0 0 1px #8ab1b5;');
  });

  it('keeps lifeform card highlighting owned by the unified selected-lifeform path', () => {
    const setEggArchetypeStart = screensSource.indexOf('setEggArchetype(archetype) {');
    expect(setEggArchetypeStart).toBeGreaterThan(-1);
    const setEggArchetypeEnd = screensSource.indexOf('\n    setLifeformUnlocks', setEggArchetypeStart);
    const setEggArchetypeBody = screensSource.slice(setEggArchetypeStart, setEggArchetypeEnd);

    expect(setEggArchetypeBody).not.toContain("classList.toggle('selected'");
    expect(setEggArchetypeBody).not.toContain('eggButtons');
    expect(setEggArchetypeBody).toContain('setSelectedLifeform(archetype);');
  });

  it('reapplies selected card state after lifeform unlock refreshes', () => {
    const applyVisibilityStart = screensSource.indexOf('function applyLifeformVisibility(): void {');
    expect(applyVisibilityStart).toBeGreaterThan(-1);
    const applyVisibilityEnd = screensSource.indexOf('\n  }\n\n  function setSelectedLifeform', applyVisibilityStart);
    const applyVisibilityBody = screensSource.slice(applyVisibilityStart, applyVisibilityEnd);

    expect(applyVisibilityBody).toContain('const selected = !locked && id === selectedLifeformId;');
    expect(applyVisibilityBody).toContain('setSelectedButtonState(button, selected);');
  });

  it('retains the full six-line completed-dish research brief in the dish log', () => {
    expect(screensSource).toContain('while (tickerLines.children.length > 6)');
    expect(css).toContain('.ticker-line:nth-child(n + 7)');
  });

  it('shows completed-dish research immediately on the upgrade pick screen', () => {
    expect(html).toContain('id="pick-research-brief"');
    expect(screensSource).toContain('setPickResearchBrief(lines: readonly ResearchBriefLine[]): void;');
    expect(screensSource).toContain("const pickResearchBrief = get('pick-research-brief');");
    expect(screensSource).toContain('setPickResearchBrief(lines) {');
    expect(screensSource).toContain('pickResearchBrief.hidden = lines.length === 0;');
    expect(screensSource).toContain("line.className = `pick-research-line pick-research-line-${brief.tone}`;");
    expect(css).toContain('.pick-research-brief');
    expect(css).toContain('.pick-research-line-critical');
  });

  it('gives catalyst discoveries a distinct pulsing dish log treatment', () => {
    expect(screensSource).toContain('const specialClass = tickerSpecialClassFor(message);');
    expect(screensSource).toContain("line.classList.add(specialClass);");
    expect(screensSource).toContain('function tickerSpecialClassFor(message: string): string | null {');
    expect(screensSource).toContain("message.startsWith('New catalyst discovered')");
    expect(screensSource).toContain("message.startsWith('CATALYTIC')");
    expect(screensSource).toContain("message.startsWith('FOLDING FAULT')");
    expect(screensSource).toContain("return 'ticker-line-catalyst';");
    expect(css).toContain('.ticker-line-catalyst');
    expect(css).toContain('@keyframes catalyst-log-pulse');
  });

  it('gives new lifeform discoveries their own dish log treatment', () => {
    expect(screensSource).toContain("message.startsWith('NEW LIFEFORM CREATED')");
    expect(screensSource).toContain("message.startsWith('New lifeform discovered')");
    expect(screensSource).toContain("message.startsWith('New lifeform catalogued')");
    expect(screensSource).toContain("return 'ticker-line-rare-lifeform';");
    expect(css).toContain('.ticker-line-rare-lifeform');
    expect(css).toContain('@keyframes rare-lifeform-log-pulse');
    expect(css).toContain('.ticker-line-rare-lifeform {');
  });

  it('showcases newly unlocked lifeform cards in the rack', () => {
    expect(screensSource).toContain('showcaseLifeformUnlock(id: string): void;');
    expect(screensSource).toContain('showcaseLifeformUnlock(id) {');
    expect(screensSource).toContain("button.classList.add('life-item-discovered');");
    expect(screensSource).toContain("button.scrollIntoView({ block: 'nearest' });");
    expect(screensSource).toContain("button.classList.remove('life-item-discovered');");
    expect(css).toContain('.life-panel .life-item-discovered');
    expect(css).toContain('@keyframes life-discovery-pulse');
  });

  it('showcases newly unlocked reagent cards in the left rack', () => {
    expect(screensSource).toContain('showcaseToolUnlock(tool: ToolId): void;');
    expect(screensSource).toContain('showcaseToolUnlock(tool) {');
    expect(screensSource).toContain("button.classList.add('tool-button-discovered');");
    expect(screensSource).toContain("button.scrollIntoView({ block: 'nearest' });");
    expect(screensSource).toContain("button.classList.remove('tool-button-discovered');");
    expect(css).toContain('.toolbox .tool-button-discovered');
    expect(css).toContain('@keyframes tool-discovery-pulse');
  });

  it('knocks undiscovered lifeform specimens back to inert gray', () => {
    // The identity color is stashed (by makeSwatch) so it can be cleared while
    // locked and restored on discovery; CSS desaturates the whole locked card.
    expect(screensSource).toContain('swatch.dataset.lifeColor = bloomGradient(color)');
    expect(screensSource).toContain('icon.style.background = icon.dataset.lifeColor');
    expect(screensSource).toContain("icon.style.removeProperty('background')");
    expect(screensSource).toContain('icon.style.background = icon.dataset.lifeColor');
    expect(css).toContain('.life-panel .life-item.locked-discovery {');
    expect(css).toContain('grayscale(1)');
    expect(css).toContain('.life-panel .life-item.locked-discovery .life-swatch {');
  });

  it('auto-sorts discovered lifeforms above locked specimens', () => {
    expect(screensSource).toContain('function sortLifeList(): void {');
    expect(screensSource).toContain("b.classList.contains('locked-discovery')");
    expect(screensSource).toContain('sortLifeList();');
  });

  it('fires neon echo rings and an arcade unlock banner', () => {
    expect(css).toContain('@keyframes life-echo-ring');
    expect(css).toContain('.life-panel .life-item-discovered::before');
    expect(css).toContain('.fx-banner.fx-banner-arcade.fx-banner-show');
    expect(css).toContain('@keyframes fx-arcade-title');
    expect(fxSource).toContain('showUnlockBanner(eyebrow: string, title: string, sub: string, accent: BannerAccent): void;');
    expect(fxSource).toContain('fx-banner-arcade');
    expect(mainSource).toContain("fx.showUnlockBanner('Breed Unlocked'");
    expect(mainSource).toContain("fx.showUnlockBanner('Strain Unlocked'");
  });
});
