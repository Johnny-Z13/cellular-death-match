import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LabReport } from '../../src/game/labReport';
import { renderLabReport } from '../../src/ui/labReportScreen';

class FakeElement {
  className = '';
  private ownText = '';
  private readonly children: FakeElement[] = [];

  constructor(readonly tagName: string) {}

  set textContent(value: string) {
    this.ownText = value;
    this.children.length = 0;
  }

  get textContent(): string {
    return [this.ownText, ...this.children.map((child) => child.textContent)]
      .filter(Boolean)
      .join(' ');
  }

  set innerHTML(_value: string) {
    throw new Error('lab report renderer must not assign raw innerHTML');
  }

  append(...children: FakeElement[]): void {
    this.children.push(...children);
  }

  replaceChildren(...children: FakeElement[]): void {
    this.children.length = 0;
    this.children.push(...children);
  }
}

function installFakeDocument(): void {
  vi.stubGlobal('document', {
    createElement(tagName: string) {
      return new FakeElement(tagName);
    },
  });
}

const sampleReport: LabReport = {
  header: {
    runNumber: 7,
    outcome: 'won',
    biomeName: 'Glass Garden',
    epochCount: 4,
    durationFormatted: '6m 12s',
  },
  discoveries: {
    breeds: ['bloom_mass', 'glass_antibody'],
    hybrids: ['quill_bloom'],
    reactionsTriggered: 9,
    newBiome: false,
  },
  ecosystem: {
    finalBreedCounts: new Map([
      ['glass_antibody', 12],
      ['bloom_mass', 5],
    ]),
    peakBiodiversity: 6,
    longestStabilitySeconds: 18,
  },
  strainBank: {
    newCount: 2,
    newStrains: ['bloom_mass', 'quill_bloom'],
    totalProgress: '5/14',
  },
  notebook: {
    newEntries: 3,
    completion: 0.38,
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('renderLabReport', () => {
  it('renders the outcome, discoveries, populations, strain bank, and notebook completion as text', () => {
    installFakeDocument();

    const text = renderLabReport(sampleReport).textContent;

    expect(text).toContain('Lab Report #7');
    expect(text).toContain('Stable Ecosystem');
    expect(text).toContain('Glass Garden');
    expect(text).toContain('Bloom Mass');
    expect(text).toContain('Glass Antibody');
    expect(text).toContain('Quill Bloom');
    expect(text).toContain('9 reactions triggered');
    expect(text).toContain('Glass Antibody');
    expect(text).toContain('12');
    expect(text).toContain('2 new strains banked');
    expect(text).toContain('Collection: 5/14');
    expect(text).toContain('3 new entries');
    expect(text).toContain('Completion: 38%');
  });

  it('treats report ids as text instead of injectable HTML', () => {
    installFakeDocument();
    const report: LabReport = {
      ...sampleReport,
      discoveries: {
        ...sampleReport.discoveries,
        breeds: ['<img src=x onerror=alert(1)>'],
      },
      ecosystem: {
        ...sampleReport.ecosystem,
        finalBreedCounts: new Map([['<script>alert(1)</script>', 4]]),
      },
    };

    const text = renderLabReport(report).textContent;

    expect(text).toContain('<img src=x onerror=alert(1)>');
    expect(text).toContain('<script>alert(1)</script>');
  });

  it('shows an explicit empty-state when no living cultures remain', () => {
    installFakeDocument();

    const text = renderLabReport({
      ...sampleReport,
      ecosystem: {
        ...sampleReport.ecosystem,
        finalBreedCounts: new Map(),
      },
    }).textContent;

    expect(text).toContain('No living cultures');
  });
});
