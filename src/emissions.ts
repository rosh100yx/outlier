// Offline, model-aware emissions engine.
//
// Local-first means NO network: no Electricity Maps / WattTime API calls. We bundle
// the coefficients and look them up. This is the same approach CodeCarbon uses for its
// offline tracker. Two inputs:
//   1. per-model energy  (kWh per 1M output tokens) — output tokens dominate inference cost
//   2. grid carbon intensity (gCO2 per kWh) for the assumed region
//
// All numbers are estimates with wide uncertainty (inference energy varies ~4-20x in the
// literature). We expose the method so the UI can label provenance honestly. We never
// claim precision we don't have.

// Energy per 1M OUTPUT tokens, by model class (kWh). Anchor: the paper measured ~10 kWh
// across 15.1M output tokens on Opus-class (~0.66). Smaller/faster models use materially
// less. These are order-of-magnitude class estimates, not vendor figures.
const MODEL_ENERGY_KWH_PER_M_OUTPUT: Record<string, number> = {
  'opus':    0.66,  // large frontier (Claude Opus, GPT-4 class)
  'sonnet':  0.30,  // mid (Claude Sonnet, GPT-4o)
  'haiku':   0.10,  // small/fast (Claude Haiku, GPT-4o-mini)
  'gpt-4':   0.55,
  'gpt-4o':  0.30,
  'gpt-5':   0.45,
  'gemini':  0.35,  // Gemini Pro class
  'flash':   0.10,  // Gemini Flash class
  'local':   0.50,  // self-hosted / unknown open weights
  'default': 0.45,  // unknown model -> conservative mid
};

// Map a raw model id (e.g. "claude-opus-4-8", "gpt-4o-mini", "gemini-2.5-flash") to a class.
export function modelClass(modelId: string): string {
  const m = (modelId || '').toLowerCase();
  if (m.includes('opus')) return 'opus';
  if (m.includes('sonnet')) return 'sonnet';
  if (m.includes('haiku')) return 'haiku';
  if (m.includes('flash') || m.includes('mini')) return 'haiku';
  if (m.includes('gpt-5')) return 'gpt-5';
  if (m.includes('gpt-4o')) return 'gpt-4o';
  if (m.includes('gpt-4')) return 'gpt-4';
  if (m.includes('gemini')) return 'gemini';
  if (m.includes('llama') || m.includes('qwen') || m.includes('mistral') || m.includes('local')) return 'local';
  return 'default';
}

export function energyKwhForModel(modelId: string, outputTokens: number): number {
  const cls = modelClass(modelId);
  const coeff = MODEL_ENERGY_KWH_PER_M_OUTPUT[cls] ?? 0.45;
  return (outputTokens / 1_000_000) * coeff;
}

// Sum energy across a per-model output-token breakdown. Falls back to 'default' when the
// model is unknown. Returns total kWh.
export function energyKwhByModel(outputByModel: Record<string, number>): number {
  let kwh = 0;
  for (const [model, out] of Object.entries(outputByModel)) {
    kwh += energyKwhForModel(model, out);
  }
  return kwh;
}

export interface EmissionsResult {
  energyKwh: number;
  co2Kg: number;
  gridFactor: number;
  method: string; // human-readable provenance for the UI
}

export function co2FromEnergy(energyKwh: number, gridFactorGPerKwh: number): number {
  return (energyKwh * gridFactorGPerKwh) / 1000; // kg
}
