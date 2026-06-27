import { select, spinner, text, isCancel, cancel, note } from '@clack/prompts';
import pc from 'picocolors';

export async function runParticipateCommand(_args: string[]): Promise<void> {
  const s = spinner();
  s.start('Connecting to the Outlier research project...');
  await new Promise(r => setTimeout(r, 600));
  s.stop('Secure connection established.');

  note(
    `Three quick taps, then you paste into a public GitHub issue. Nothing is sent automatically — you stay in control of what you share.

  ${pc.cyan('1.')} Take a screenshot of your terminal — the visual status / receipt above.
  ${pc.cyan('2.')} Answer the three questions below.
  ${pc.cyan('3.')} Open the issue, paste the lines, drop in the screenshot.

${pc.dim('How it helps: your receipt + answers are real-world data on how much agents write and where deskilling bites — it directly shapes the metrics and the study.')}`,
    'Participate — share your receipt + feedback'
  );

  const q1 = await select({
    message: pc.cyan('What is your current engineering reality today?'),
    options: [
      { value: 'artisan', label: 'Solo Artisan (I write 90%+ of the code myself)' },
      { value: 'manager', label: 'AI Manager (I prompt, the agents write)' },
      { value: 'reviewer', label: 'Full-time Reviewer (I spend my days reviewing agent PRs)' },
    ],
  });

  if (isCancel(q1)) { cancel('Survey aborted.'); process.exit(0); }

  const q2 = await select({
    message: pc.cyan('Do you feel you are losing your deep architectural mastery? (Deskilling)'),
    options: [
      { value: 'yes_heavy', label: 'Yes, heavily. I forget how my own systems work.' },
      { value: 'yes_slight', label: 'Slightly. I rely on the AI to fix its own bugs.' },
      { value: 'no', label: 'No. I maintain strict oversight and mastery.' },
    ],
  });

  if (isCancel(q2)) { cancel('Survey aborted.'); process.exit(0); }

  const feedback = await text({
    message: pc.cyan('In your own words, what is AI actually doing to your codebase or your job?\n(Note: This will draft a public GitHub issue)'),
    placeholder: 'Honestly, I just let the agent write the regex...',
    validate(value) {
      if (!value || value.length === 0) return `C'mon, say something!`;
    },
  });

  if (isCancel(feedback)) { cancel('Survey aborted.'); process.exit(0); }

  const surveyData = `**Engineering reality:** ${q1}\n**Deskilling impact:** ${q2}\n**Thoughts:** ${feedback}`;

  note(
    `${pc.italic(`"${feedback}"`)}\n\nThanks. To share it, open a new issue and paste the lines below (a screenshot of your receipt helps too).`,
    'Outlier Research'
  );

  console.log(`\n Open an issue:  ${pc.underline(pc.cyan('https://github.com/rosh100yx/outlier/issues/new'))}`);
  console.log(`\n Paste this in:`);
  console.log(surveyData.split('\n').map(l => '   ' + l).join('\n') + '\n');
}
