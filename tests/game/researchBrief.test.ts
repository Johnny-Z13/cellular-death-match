import { describe, expect, it } from 'vitest';
import { researchBriefForGrant } from '../../src/game/researchBrief';
import { RESEARCH_GRANT_SEQUENCE } from '../../src/game/discoveryProgression';

describe('research brief', () => {
  it('formats a completed-dish grant as a replayable player-facing brief', () => {
    const grant = RESEARCH_GRANT_SEQUENCE[1]!;

    expect(researchBriefForGrant(grant)).toEqual([
      { message: 'Research breakthrough: Salt-Water Crystal.', tone: 'caution' },
      { message: 'Lab result: unlocked Acid reagent.', tone: 'caution' },
      { message: 'Risk: volatile - can reshape the dish when combined with live cultures.', tone: 'caution' },
      { message: 'Ready kit: Salt + Water.', tone: 'caution' },
      { message: 'CAUTION: salt-water crystal protocol unlocked.', tone: 'caution' },
      { message: 'Experiment: Try Salt with Water near gelatinous cultures to crystallize movement.', tone: 'caution' },
    ]);
  });

  it('signposts stable and critical grant risk without relying on color alone', () => {
    const stable = researchBriefForGrant(RESEARCH_GRANT_SEQUENCE[0]!);
    const critical = researchBriefForGrant(RESEARCH_GRANT_SEQUENCE[2]!);

    expect(stable[2]).toEqual({
      message: 'Risk: stable - safe to experiment with while learning the dish.',
      tone: 'discovery',
    });
    expect(critical[2]).toEqual({
      message: 'Risk: critical - handle carefully; violent reactions can flash and destabilize cultures.',
      tone: 'critical',
    });
  });

  it('includes catalogued breeds in the grant unlock line', () => {
    const grant = RESEARCH_GRANT_SEQUENCE.find((item) => item.id === 'grant_needle_swarm')!;

    expect(researchBriefForGrant(grant)[1]).toEqual({
      message: 'Lab result: catalogued Needle Swarm; unlocked Mirror egg strain.',
      tone: 'critical',
    });
    expect(researchBriefForGrant(grant)).toHaveLength(6);
  });

  it('frames the next grant hint as an experiment prompt', () => {
    const grant = RESEARCH_GRANT_SEQUENCE.find((item) => item.id === 'grant_acid_toxin_flare')!;

    expect(researchBriefForGrant(grant)[5]).toEqual({
      message: 'Experiment: Try Acid with Toxin near fragile cultures when you can afford a violent flare.',
      tone: 'critical',
    });
  });

  it('names the unlocked prerequisites that make the next experiment usable', () => {
    const reagentGrant = RESEARCH_GRANT_SEQUENCE.find((item) => item.id === 'grant_salt_water_crystal')!;
    const lifeformGrant = RESEARCH_GRANT_SEQUENCE.find((item) => item.id === 'grant_needle_swarm')!;

    expect(researchBriefForGrant(reagentGrant)[3]).toEqual({
      message: 'Ready kit: Salt + Water.',
      tone: 'caution',
    });
    expect(researchBriefForGrant(lifeformGrant)[3]).toEqual({
      message: 'Ready cultures: Sniper + Swarmlet.',
      tone: 'critical',
    });
  });
});
