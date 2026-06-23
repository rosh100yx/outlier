// Economic translation layer.
//
// The paper's core claim is that an individual authorship/spend number has a macro
// shadow: at team and national scale it becomes skill-ladder erosion, offshore value
// capture, and a hard-currency (forex) drain. This module turns the local numbers into
// that projection — explicitly as a *projection with stated assumptions*, not a measurement.

export interface EconProjection {
  label: string;
  value: string;
  note: string;
}

export interface EconInput {
  aiRatio: number;        // 0..1, share of authored output that is AI
  estUsdSession: number;  // measured/estimated spend reflected by local logs
  teamSize?: number;      // default 1 (solo); orgs override
  workdaysPerYear?: number;
}

// Assumptions are surfaced in the output so nothing is hidden.
const DEFAULTS = { teamSize: 1, workdaysPerYear: 230 };

export function projectEconomics(input: EconInput): { projections: EconProjection[]; assumptions: string } {
  const team = input.teamSize ?? DEFAULTS.teamSize;
  const days = input.workdaysPerYear ?? DEFAULTS.workdaysPerYear;
  const ai = Math.max(0, Math.min(1, input.aiRatio));

  // Treat the local spend as a per-active-period hard-currency outflow to the AI vendor.
  // Annualize crudely (the local logs are a sample window, not a day) and scale by team.
  const annualOutflowPerDev = input.estUsdSession * (days / 30); // sample window ≈ a month of work
  const annualOutflowTeam = annualOutflowPerDev * team;

  const projections: EconProjection[] = [
    {
      label: 'Authorship shift',
      value: `${(ai * 100).toFixed(0)}% of output → AI`,
      note: team > 1
        ? `≈ ${(ai * team).toFixed(1)} of ${team} dev-equivalents of authorship now machine-produced.`
        : 'At team scale, this many dev-equivalents move to the machine.',
    },
    {
      label: 'Value capture (offshore)',
      value: `~$${Math.round(annualOutflowTeam).toLocaleString()}/yr`,
      note: 'Hard-currency spend leaving to a foreign AI vendor — value captured offshore, not by the local worker.',
    },
    {
      label: 'Skill ladder',
      value: ai > 0.7 ? 'AT RISK' : ai > 0.4 ? 'watch' : 'intact',
      note: ai > 0.7
        ? 'Above ~70%, juniors stop building the skill that makes seniors — premature deprofessionalization.'
        : 'Humans still author enough core work to keep building expertise.',
    },
    {
      label: 'Forex / tax base',
      value: `$${Math.round(annualOutflowPerDev).toLocaleString()}/dev/yr imported`,
      note: 'Locally-taxed wages give way to foreign-billed inference: income-tax erosion + a recurring forex import.',
    },
  ];

  const assumptions =
    `Projection only. Assumes: team of ${team}, the local log window ≈ one month of work, ` +
    `${days} workdays/yr. Spend is your measured/estimated local outflow scaled up — an order-of-magnitude shadow, not an audit.`;

  return { projections, assumptions };
}
