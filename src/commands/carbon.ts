import { getCarbonStats } from '../carbon';
import { getEditAuthorship } from '../edits';
import { homedir } from 'os';

export async function runCarbonCommand(_args: string[]): Promise<void> {
  const carbon = await getCarbonStats().catch(() => null);
  if (!carbon) {
    console.log('No local agent session logs found. Run inside a repo with Claude/Gemini/Aider history.');
    return;
  }

  console.log(`Sessions:       ${carbon.sessions}`);
  console.log(`Output Tokens:  ${(carbon.outputTokens / 1_000_000).toFixed(2)}M`);
  console.log(`Est. Energy:    ${carbon.energyKwh.toFixed(2)} kWh`);
  console.log(`\nYour Local Grid (${carbon.localRegion}): ${carbon.localCo2Kg.toFixed(2)} kgCO2`);
  console.log(`\nCounterfactual (Vietnam): ${carbon.co2KgVietnam.toFixed(2)} kgCO2`);
  console.log(`Counterfactual (France):  ${carbon.co2KgFrance.toFixed(2)} kgCO2`);
  console.log(`\nRatio: ~31x carbon penalty on coal-heavy grid`);
}
