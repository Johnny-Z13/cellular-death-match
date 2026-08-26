import { describe, expect, it } from 'vitest';
import { notebookViewForProgression } from '../../src/content/notebook';
import { createDiscoveryProgression, revealAllDiscoveryProgression } from '../../src/game/discoveryProgression';
import { researchNotebookView } from '../../src/game/researchNotebook';

describe('research notebook goal structure', () => {
  it('turns the active objective into a question and live evidence, not a recipe checklist', () => {
    const notebook = notebookViewForProgression(createDiscoveryProgression());
    const view = researchNotebookView(notebook, {
      objective: {
        kind: 'cross_breed',
        name: 'Cross-Breed',
        description: 'Bring two discovered breeds together.',
        target: '1 hybrid',
        hint: 'Exact recipe text should not appear in the Study page.',
      },
      summary: '0 / 1 hybrid breeds created',
      complete: false,
      secondsRemaining: 12,
      livingCultures: 2,
      reactions: 0,
      equilibriumProgress: 0.2,
    });

    expect(view.hypothesis?.question).toContain('What emerges');
    expect(view.hypothesis?.evidence).toBe('0 / 1 hybrid breeds created');
    expect(view.hypothesis?.professorNote).not.toContain('Exact recipe');
    expect(view.hypothesis?.timeLabel).toContain('Open dish');
    expect(view.fieldStudies).toHaveLength(3);
  });

  it('replaces finite catalogue goals with repeatable toy-like studies after reveal all', () => {
    const progression = revealAllDiscoveryProgression(createDiscoveryProgression());
    const view = researchNotebookView(notebookViewForProgression(progression), null);

    expect(view.allDiscoveriesRevealed).toBe(true);
    expect(view.fieldStudies.map((study) => study.id)).toEqual([
      'wild-diversity',
      'wild-reactions',
      'wild-equilibrium',
    ]);
    expect(view.observationPrompt).toContain('The catalogue is complete');
  });
});
