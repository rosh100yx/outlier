import pc from 'picocolors';
import { runStart, runStop, watchStatus } from '../observe';
import { CMD } from '../shared';

// args = process.argv.slice(2) = ['watch', 'start'|'stop'|'status', ...]
// The wrap case (outlier watch -- <cmd>) is handled by cli.ts before dispatch reaches here.
export async function runWatchCommand(args: string[]): Promise<void> {
  const sub = args[1];

  if (sub === 'start') {
    const toolIdx = args.indexOf('--tool');
    const tool = toolIdx !== -1 ? (args[toolIdx + 1] || 'manual') : 'manual';
    const r = runStart(tool);
    console.log(r.already
      ? pc.yellow(`[outlier] session already active. Run  ${CMD} watch stop  to close it.`)
      : pc.green(`[outlier] observing started (${tool}). Work in your editor, then:  ${CMD} watch stop`));
    process.exit(0);
  }

  if (sub === 'stop') {
    const r = runStop();
    if (!r.ran) {
      console.log(pc.dim(`[outlier] no active session. Start one with  ${CMD} watch start`));
    } else {
      if ((r.staleHours || 0) > 12) console.log(pc.yellow(`[outlier] note: session was open ${r.staleHours}h — long windows over-attribute to the tool.`));
      console.log(pc.green(`[outlier] ✓ observed ${pc.bold(String(r.added))} lines (${r.tool}) across ${r.files} file${r.files === 1 ? '' : 's'}.`) + pc.dim(` Run  ${CMD} status`));
    }
    process.exit(0);
  }

  const status = watchStatus();
  console.log(status.active
    ? pc.dim(`[outlier] observing (${status.tool}) — ${status.sessions} session${status.sessions === 1 ? '' : 's'}`)
    : pc.dim(`[outlier] no active session. Start one with  ${CMD} watch start`));
}
