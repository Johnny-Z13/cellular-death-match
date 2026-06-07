// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');
const css = readFileSync('src/styles.css', 'utf8');
const screensSource = readFileSync('src/ui/screens.ts', 'utf8');

describe('discoverer notebook UI wiring', () => {
  it('adds a compact notebook affordance and overlay screen to the HTML', () => {
    expect(html).toContain('id="notebook-button"');
    expect(html).toContain('id="screen-notebook"');
    expect(html).toContain('id="notebook-close"');
    expect(html).toContain('id="notebook-progress"');
    expect(html).toContain('id="notebook-list"');
    expect(html).toContain('Discoverer');
  });

  it('exposes notebook screen controls through createScreens', () => {
    expect(screensSource).toContain("type ScreenName = 'title' | 'pick' | 'end' | 'hud' | 'notebook';");
    expect(screensSource).toContain('updateNotebook(view: NotebookView): void;');
    expect(screensSource).toContain('onNotebookOpen(handler: () => void): void;');
    expect(screensSource).toContain('onNotebookClose(handler: () => void): void;');
    expect(screensSource).toContain("const notebookButton = get('notebook-button')");
    expect(screensSource).toContain("const notebookList = get('notebook-list')");
    expect(screensSource).toContain('if (!entry.discovered) continue;');
    expect(screensSource).toContain('notebook-entry-new');
    expect(screensSource).toContain("newBadge.textContent = 'new';");
    expect(screensSource).toContain('entry.displayTitle');
    expect(screensSource).toContain('entry.displayClue');
  });

  it('wires notebook rendering to discovery progression changes in main', () => {
    expect(mainSource).toContain('notebookViewForProgression');
    expect(mainSource).toContain('newNotebookEntryIds');
    expect(mainSource).toContain('markNewNotebookEntries');
    expect(mainSource).toContain('screens.onNotebookOpen(() => {');
    expect(mainSource).toContain('screens.onNotebookClose(() => {');
    expect(mainSource).toContain('refreshNotebook();');
    expect(mainSource).toContain('screens.updateNotebook(notebookViewForProgression(discoveryProgression, {');
    expect(mainSource).toContain('newEntryIds: [...newNotebookEntryIds]');
  });

  it('styles the notebook as an overlay and hides it in presentation mode', () => {
    expect(css).toContain('.notebook-button');
    expect(css).toContain('.notebook-card');
    expect(css).toContain('.notebook-entry');
    expect(css).toContain('.notebook-entry-new');
    expect(css).toContain('.notebook-entry-new-badge');
    expect(css).toContain('.presentation-mode .notebook-button');
    expect(css).toContain('.presentation-mode .screen');
  });
});
