import { NOTEBOOK_ENTRIES, type NotebookCategory, type NotebookView } from '../content/notebook';
import type { ObjectiveDef, ObjectiveKind } from '../content/objectives';
import {
  RESEARCH_SEALS,
  emptyResearchArchive,
  type ResearchArchiveState,
  type ResearchSealId,
} from './researchArchive';

export interface ActiveStudySnapshot {
  objective: ObjectiveDef;
  summary: string;
  complete: boolean;
  secondsRemaining: number;
  livingCultures: number;
  reactions: number;
  equilibriumProgress: number;
}

export interface ResearchHypothesisView {
  name: string;
  question: string;
  evidence: string;
  professorNote: string;
  state: 'open' | 'confirmed';
  timeLabel: string;
}

export interface FieldStudyView {
  id: string;
  title: string;
  prompt: string;
  progress: number;
  target: number;
  progressLabel: string;
  complete: boolean;
}

export interface ResearchNotebookView {
  hypothesis: ResearchHypothesisView | null;
  fieldStudies: FieldStudyView[];
  seals: ResearchSealView[];
  records: ResearchRecordsView;
  observationPrompt: string;
  allDiscoveriesRevealed: boolean;
}

export interface ResearchSealView {
  id: ResearchSealId;
  title: string;
  description: string;
  professorNote: string;
  color: [number, number, number];
  earned: boolean;
}

export interface ResearchRecordsView {
  biomeCount: number;
  biomeNames: string[];
  peakBiodiversity: number;
  maxReactions: number;
  longestStabilitySeconds: number;
}

const QUESTIONS: Record<ObjectiveKind, string> = {
  discover_breed: 'What new form appears when two compatible cultures share the same conditions?',
  stabilize_breed: 'Can a newly changed culture survive long enough to become a reliable specimen?',
  understand_recipe: 'Which order of pressures makes this reaction repeatable?',
  apply_recipe: 'Can a known reaction support a diverse living dish instead of overwhelming it?',
  preserve_grazers: 'Can the grazers remain viable while the rest of the ecosystem changes?',
  breed_archetype: 'What conditions let this lineage become dominant without sterilising the dish?',
  controlled_reaction: 'Can one reaction be produced without a cascade elsewhere?',
  balanced_ecology: 'Can several cultures share the dish without one consuming the rest?',
  dominant_archetype: 'How far can one lineage expand before the ecology becomes brittle?',
  cross_breed: 'What emerges when two discovered lineages meet under a fertile field?',
  mega_culture: 'How large can one culture grow while the surrounding ecology remains alive?',
  reaction_chain: 'Can separate reagent events be linked into one living sequence?',
  balance_keeper: 'Can intervention keep any one culture from owning the dish?',
  crisis_survivor: 'Which arrangement lets three cultures survive a sudden toxic crisis?',
  protector: 'Can a fragile culture be sheltered through a full outbreak?',
  acid_sculptor: 'Can careful removal redirect growth into a new reaction?',
  colony_founder: 'Can one lineage establish several viable colonies at once?',
  symbiosis: 'Can two different lineages remain neighbours without consuming each other?',
  extinction_reversal: 'Can a culture at the edge of extinction be brought back?',
};

const OBSERVATION_NOTES: Record<ObjectiveKind, string> = {
  discover_breed: 'Bring likely parents close and watch their boundary, not just their size.',
  stabilize_breed: 'Change one condition, then give the result time to prove it can live.',
  understand_recipe: 'Order matters. Repeat the same ingredients in a different sequence.',
  apply_recipe: 'Watch what the reaction does to its neighbours after the flash fades.',
  preserve_grazers: 'Leave refuge between the strongest pressure fields.',
  breed_archetype: 'Feed the edge that is losing ground and thin only where necessary.',
  controlled_reaction: 'Separate the test field from the rest of the dish before combining reagents.',
  balanced_ecology: 'Intervene at the borders; the centre usually tells you too late.',
  dominant_archetype: 'Dominance is useful evidence. Total collapse is not.',
  cross_breed: 'Shared food makes an informative meeting place.',
  mega_culture: 'Support the largest boundary while preserving some breathing room around it.',
  reaction_chain: 'Use distinct regions so each event leaves readable evidence.',
  balance_keeper: 'Correct the fastest-growing edge before it becomes irreversible.',
  crisis_survivor: 'Spatial separation is often a better shield than more reagent.',
  protector: 'Build the refuge before the outbreak arrives.',
  acid_sculptor: 'Small cuts reveal more than one large burn.',
  colony_founder: 'Several small fertile sites are safer than one crowded site.',
  symbiosis: 'A stable border is stronger evidence than brief contact.',
  extinction_reversal: 'Remove immediate pressure first; feed second.',
};

export function researchNotebookView(
  notebook: NotebookView,
  active: ActiveStudySnapshot | null,
  archive: ResearchArchiveState = emptyResearchArchive(),
): ResearchNotebookView {
  const byCategory = countsByCategory(notebook);
  const completeAtlas = notebook.discoveredCount >= notebook.totalCount;
  const fieldStudies = completeAtlas
    ? openEndedFieldStudies(active)
    : progressionFieldStudies(notebook, byCategory);

  return {
    hypothesis: active ? {
      name: active.objective.name,
      question: QUESTIONS[active.objective.kind],
      evidence: active.complete ? 'The dish supports this hypothesis.' : active.summary,
      professorNote: OBSERVATION_NOTES[active.objective.kind],
      state: active.complete ? 'confirmed' : 'open',
      timeLabel: active.objective.timed
        ? `${Math.max(0, active.secondsRemaining)}s observation window`
        : 'Open dish · end when you have enough evidence',
    } : null,
    fieldStudies,
    seals: RESEARCH_SEALS.map((seal) => ({
      ...seal,
      earned: archive.earnedSealIds.includes(seal.id),
    })),
    records: {
      biomeCount: archive.biomeRecords.length,
      biomeNames: archive.biomeRecords.map((record) => record.name),
      peakBiodiversity: archive.records.peakBiodiversity,
      maxReactions: archive.records.maxReactions,
      longestStabilitySeconds: archive.records.longestStabilitySeconds,
    },
    observationPrompt: completeAtlas
      ? 'The catalogue is complete. The dish is not. Make something the notebook has never seen before.'
      : 'Notice a boundary, change one thing, then wait long enough to see what answered.',
    allDiscoveriesRevealed: completeAtlas,
  };
}

function progressionFieldStudies(
  notebook: NotebookView,
  byCategory: Record<NotebookCategory, { discovered: number; total: number }>,
): FieldStudyView[] {
  const stableLifeforms = notebook.entries.filter((entry) => (
    entry.category === 'lifeform' && entry.researchStage === 'stabilized'
  )).length;
  const resolvedCatalysts = notebook.entries.filter((entry) => (
    entry.category === 'catalyst'
    && (entry.researchStage === 'understood' || entry.researchStage === 'stabilized')
  )).length;
  return [
    study('atlas', 'Map the unknown', 'Record unfamiliar life and reactions.', notebook.discoveredCount, notebook.totalCount),
    study('cultures', 'Build a living library', 'Stabilise distinct cultures so they can seed future dishes.', stableLifeforms, byCategory.lifeform.total),
    study('catalysts', 'Resolve the reaction web', 'Reproduce observed catalyst signatures until their method is understood.', resolvedCatalysts, byCategory.catalyst.total),
  ];
}

function openEndedFieldStudies(active: ActiveStudySnapshot | null): FieldStudyView[] {
  return [
    study('wild-diversity', 'Crowded coexistence', 'Keep five living cultures in the same dish.', active?.livingCultures ?? 0, 5),
    study('wild-reactions', 'Chain reaction', 'Trigger three reactions before banking the dish.', active?.reactions ?? 0, 3),
    study('wild-equilibrium', 'Self-sustaining biome', 'Let the ecosystem settle into visible equilibrium.', Math.round((active?.equilibriumProgress ?? 0) * 100), 100, '%'),
  ];
}

function study(
  id: string,
  title: string,
  prompt: string,
  progress: number,
  target: number,
  suffix = '',
): FieldStudyView {
  const bounded = Math.max(0, Math.min(progress, target));
  return {
    id,
    title,
    prompt,
    progress: bounded,
    target,
    progressLabel: `${bounded}${suffix} / ${target}${suffix}`,
    complete: progress >= target,
  };
}

function countsByCategory(notebook: NotebookView): Record<NotebookCategory, { discovered: number; total: number }> {
  const counts: Record<NotebookCategory, { discovered: number; total: number }> = {
    lifeform: { discovered: 0, total: 0 },
    catalyst: { discovered: 0, total: 0 },
    lab_note: { discovered: 0, total: 0 },
    event: { discovered: 0, total: 0 },
  };
  for (const entry of NOTEBOOK_ENTRIES) {
    counts[entry.category].total += 1;
  }
  for (const entry of notebook.entries) {
    if (entry.discovered) counts[entry.category].discovered += 1;
  }
  return counts;
}
