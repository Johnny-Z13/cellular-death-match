// @ts-expect-error Vitest runs this test in Node; the app tsconfig intentionally omits Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('src/styles.css', 'utf8');
const fxSource = readFileSync('src/ui/fx.ts', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');

describe('genome decode presentation', () => {
  it('uses the agreed three-line copy and a native explicit-continue control', () => {
    expect(html).toContain('id="fx-genome"');
    expect(html).toContain('type="button"');
    expect(html).toContain('GENOME DECODED');
    expect(html).toContain('EGG SYNTHESIS UNLOCKED');
    expect(html).toContain('Tap or press to continue');
    expect(fxSource).toContain("genomeReveal?.addEventListener('click'");
    expect(fxSource).toContain('genomeReveal.focus({ preventScroll: true });');
    expect(fxSource).not.toContain('desktopGenomeTimer');
    expect(mainSource).toContain('document.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });');
  });

  it('queues decoded genomes during play and only presents them after an arena boundary', () => {
    expect(mainSource).toContain('pendingGenomeDecodeIds = appendUniqueGenomeDecodes(');
    expect(mainSource).toContain('genomeDecodeEventsForProgressionChange(previousProgression, nextProgression)');
    expect(mainSource).toContain("if (run.getState().phase === 'arena' || pendingGenomeDecodeIds.length === 0)");
    expect(mainSource).toContain('fx.showGenomeDecode(');
    expect(mainSource).toContain('LIFEFORM_SOUND_IDENTITIES[genome.soundId]');
    expect(mainSource).toContain('showPhaseAfterGenomeReveals();');
    expect(mainSource).not.toContain('advanceDiscoveryProgression(previousProgression, nextProgression, fx.showGenomeDecode');
  });

  it('keeps the reveal opaque until the destination screen is staged', () => {
    const revealKeyframes = css.slice(
      css.indexOf('@keyframes fx-genome-reveal'),
      css.indexOf('@keyframes fx-genome-scan'),
    );
    expect(revealKeyframes).toContain('8%, 100% { opacity: 1; }');
    expect(revealKeyframes).not.toContain('100% { opacity: 0; }');

    const finishBoundary = fxSource.slice(
      fxSource.indexOf('finishActiveGenome = () => {'),
      fxSource.indexOf('\n  }\n\n  function finishMobile'),
    );
    expect(finishBoundary.indexOf('onComplete();')).toBeLessThan(finishBoundary.indexOf('hideGenomeReveal();'));
  });

  it('serializes above ordinary mobile feedback and collapses bulk unlocks to one summary', () => {
    expect(fxSource).toContain("enqueueMobile({ kind: 'genome', items, onComplete }, 4)");
    expect(fxSource).toContain('const batch = items.length > 2;');
    expect(fxSource).toContain("'GENOME ARCHIVE EXPANDED'");
    expect(fxSource).toContain('`${items.length} GENOMES DECODED`');
    const revealAllStart = mainSource.indexOf('debug.onRevealDiscoveries(() => {');
    const revealAllEnd = mainSource.indexOf('\n});', revealAllStart);
    const revealAllBody = mainSource.slice(revealAllStart, revealAllEnd);
    expect(revealAllBody).toContain("fx.showToast('discovery', 'Preview laboratory', 'Temporary progress — exit to return to your save')");
    expect(revealAllBody).not.toContain('fx.showGenomeDecode');
  });

  it('keeps the dish visible and fits phones without animated scans in reduced motion', () => {
    expect(css).toContain('.fx-genome {');
    expect(css).toContain('radial-gradient(circle at 50% 46%, transparent');
    expect(css).toContain('width: min(330px, 46svh, 72vw)');
    expect(css).toContain('.fx-genome-batch .fx-genome-art');
    expect(css).toContain('.fx-genome.fx-genome-show { opacity: 1; }');
    expect(css).toContain('.fx-genome-scan { display: none; }');
  });
});
