import type { GrantTickerTone, ResearchGrant } from './discoveryProgression';
import { BREED_DEFS } from '../content/catalysis';

export interface ResearchBriefLine {
  message: string;
  tone: GrantTickerTone;
}

export function researchBriefForGrant(grant: ResearchGrant): ResearchBriefLine[] {
  return [
    { message: `Research breakthrough: ${grant.title}.`, tone: grant.tone },
    { message: unlockMessageForGrant(grant), tone: grant.tone },
    { message: riskMessageForGrant(grant), tone: grant.tone },
    { message: prerequisitesMessageForGrant(grant), tone: grant.tone },
    { message: grant.message, tone: grant.tone },
    { message: `Experiment: ${grant.hint}`, tone: grant.tone },
  ];
}

function unlockMessageForGrant(grant: ResearchGrant): string {
  const breedNames = (grant.delta.breedIds ?? []).map((id) => BREED_DEFS[id].name);
  if (breedNames.length === 0) return `Lab result: unlocked ${grant.rewardLabel}.`;
  return `Lab result: catalogued ${breedNames.join(', ')}; unlocked ${grant.rewardLabel}.`;
}

function riskMessageForGrant(grant: ResearchGrant): string {
  if (grant.caution === 'critical') {
    return 'Risk: critical - handle carefully; violent reactions can flash and destabilize cultures.';
  }
  if (grant.caution === 'volatile') {
    return 'Risk: volatile - can reshape the dish when combined with live cultures.';
  }
  return 'Risk: stable - safe to experiment with while learning the dish.';
}

function prerequisitesMessageForGrant(grant: ResearchGrant): string {
  const tools = (grant.requiredTools ?? []).map(labelForId);
  const lifeforms = (grant.requiredLifeforms ?? []).map(labelForId);
  if (tools.length > 0 && lifeforms.length > 0) {
    return `Ready kit: ${tools.join(' + ')}; cultures: ${lifeforms.join(' + ')}.`;
  }
  if (tools.length > 0) return `Ready kit: ${tools.join(' + ')}.`;
  if (lifeforms.length > 0) return `Ready cultures: ${lifeforms.join(' + ')}.`;
  return 'Ready kit: unlocked lab stock.';
}

function labelForId(id: string): string {
  return id
    .split('_')
    .map((part) => part.length === 0 ? part : `${part[0]!.toUpperCase()}${part.slice(1)}`)
    .join(' ');
}
