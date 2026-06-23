import { expect, test, describe } from 'bun:test';
import { projectEconomics } from '../src/economics';

describe('economic translation', () => {
  test('returns four projections with assumptions', () => {
    const r = projectEconomics({ aiRatio: 0.5, estUsdSession: 100, teamSize: 10 });
    expect(r.projections.length).toBe(4);
    expect(r.assumptions).toContain('Projection only');
  });
  test('high AI ratio flags skill ladder at risk', () => {
    const r = projectEconomics({ aiRatio: 0.85, estUsdSession: 100 });
    const ladder = r.projections.find(p => p.label === 'Skill ladder');
    expect(ladder?.value).toBe('AT RISK');
  });
  test('value capture scales with team size', () => {
    const solo = projectEconomics({ aiRatio: 0.5, estUsdSession: 100, teamSize: 1 });
    const team = projectEconomics({ aiRatio: 0.5, estUsdSession: 100, teamSize: 10 });
    const soloV = solo.projections.find(p => p.label === 'Value capture (offshore)')!.value;
    const teamV = team.projections.find(p => p.label === 'Value capture (offshore)')!.value;
    expect(soloV).not.toBe(teamV);
  });
});
