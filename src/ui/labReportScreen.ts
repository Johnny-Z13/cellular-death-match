import type { LabReport } from '../game/labReport';

/**
 * Build a Lab Report DOM element for the end-of-run summary.
 * Styled to look like a research notebook page.
 */
export function renderLabReport(report: LabReport): HTMLElement {
  const root = document.createElement('div');
  root.className = 'lab-report-screen';

  const outcomeText = report.header.outcome === 'won'
    ? `Stable Ecosystem — ${report.header.biomeName ?? 'Unknown Biome'}`
    : `Ecosystem Collapse — Epoch ${report.header.epochCount}`;

  const bars = [...report.ecosystem.finalBreedCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([breed, count]) => {
      const label = breed.replace(/_/g, ' ');
      return `<div class="lab-report-bar"><span>${label}</span><span>${count}</span></div>`;
    })
    .join('');

  root.innerHTML = `
    <div class="lab-report-header">
      <h2>Lab Report #${report.header.runNumber}</h2>
      <p class="lab-report-outcome ${report.header.outcome}">${outcomeText}</p>
      <p class="lab-report-duration">${report.header.epochCount} epochs, ${report.header.durationFormatted}</p>
    </div>
    <div class="lab-report-section">
      <h3>Discoveries</h3>
      <p>${report.discoveries.breeds.length} breeds discovered</p>
      <p>${report.discoveries.hybrids.length} hybrids created</p>
      <p>${report.discoveries.reactionsTriggered} reactions triggered</p>
      ${report.discoveries.newBiome ? '<p class="lab-report-highlight">New biome achieved!</p>' : ''}
    </div>
    <div class="lab-report-section">
      <h3>Ecosystem</h3>
      <div class="lab-report-bars">${bars}</div>
      <p>Peak biodiversity: ${report.ecosystem.peakBiodiversity}</p>
      <p>Longest stability: ${report.ecosystem.longestStabilitySeconds}s</p>
    </div>
    <div class="lab-report-section">
      <h3>Strain Bank</h3>
      <p>${report.strainBank.newCount} new strains banked</p>
      <p>Collection: ${report.strainBank.totalProgress}</p>
    </div>
    <div class="lab-report-section">
      <h3>Notebook</h3>
      <p>${report.notebook.newEntries} new entries</p>
      <p>Completion: ${Math.round(report.notebook.completion * 100)}%</p>
    </div>
  `;

  return root;
}
