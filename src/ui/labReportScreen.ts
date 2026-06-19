import type { LabReport } from '../game/labReport';

/**
 * Build a Lab Report DOM element for the end-of-run summary.
 * Styled to look like a research notebook page.
 */
export function renderLabReport(report: LabReport): HTMLElement {
  const root = document.createElement('div');
  root.className = 'lab-report-screen';

  const outcomeText = report.header.outcome === 'won'
    ? `Stable Ecosystem - ${report.header.biomeName ?? 'Unknown Biome'}`
    : `Ecosystem Collapse - Epoch ${report.header.epochCount}`;

  const header = el('div', 'lab-report-header');
  header.append(
    el('h2', '', `Lab Report #${report.header.runNumber}`),
    el('p', `lab-report-outcome ${report.header.outcome}`, outcomeText),
    el('p', 'lab-report-duration', `${report.header.epochCount} epochs, ${report.header.durationFormatted}`),
  );

  const discoveries = section('Discoveries');
  discoveries.append(
    el('p', '', `${report.discoveries.breeds.length} breeds discovered`),
    labelList(report.discoveries.breeds, 'lab-report-list', 'No new breeds'),
    el('p', '', `${report.discoveries.hybrids.length} hybrids created`),
    labelList(report.discoveries.hybrids, 'lab-report-list', 'No new hybrids'),
    el('p', '', `${report.discoveries.reactionsTriggered} reactions triggered`),
  );
  if (report.discoveries.newBiome) {
    discoveries.append(el('p', 'lab-report-highlight', 'New biome achieved!'));
  }

  const ecosystem = section('Ecosystem');
  const bars = el('div', 'lab-report-bars');
  const finalCounts = [...report.ecosystem.finalBreedCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (finalCounts.length === 0) {
    bars.append(el('p', 'lab-report-empty', 'No living cultures'));
  } else {
    for (const [breed, count] of finalCounts) {
      const row = el('div', 'lab-report-bar');
      row.append(
        el('span', '', displayLabel(breed)),
        el('span', '', String(count)),
      );
      bars.append(row);
    }
  }
  ecosystem.append(
    bars,
    el('p', '', `Peak biodiversity: ${report.ecosystem.peakBiodiversity}`),
    el('p', '', `Longest stability: ${report.ecosystem.longestStabilitySeconds}s`),
  );

  const strainBank = section('Strain Bank');
  strainBank.append(
    el('p', '', `${report.strainBank.newCount} new strains banked`),
    labelList(report.strainBank.newStrains, 'lab-report-list', 'No new strains'),
    el('p', '', `Collection: ${report.strainBank.totalProgress}`),
  );

  const notebook = section('Notebook');
  notebook.append(
    el('p', '', `${report.notebook.newEntries} new entries`),
    el('p', '', `Completion: ${Math.round(report.notebook.completion * 100)}%`),
  );

  root.append(header, discoveries, ecosystem, strainBank, notebook);

  return root;
}

function section(title: string): HTMLElement {
  const node = el('div', 'lab-report-section');
  node.append(el('h3', '', title));
  return node;
}

function labelList(values: readonly string[], className: string, emptyText: string): HTMLElement {
  const list = el('ul', className);
  if (values.length === 0) {
    list.append(el('li', 'lab-report-empty', emptyText));
    return list;
  }
  for (const value of values) {
    list.append(el('li', '', displayLabel(value)));
  }
  return list;
}

function el(tagName: string, className = '', text = ''): HTMLElement {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function displayLabel(value: string): string {
  if (!/^[A-Za-z0-9 _-]+$/.test(value)) return value;
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
