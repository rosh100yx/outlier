import { runWrap, runStart, runStop, watchStatus } from '../observe';

export async function runWatchCommand(args: string[]): Promise<void> {
  const dd = args.indexOf('--');
  if (dd !== -1 && args.length > dd + 1) {
    const cmd = args.slice(dd + 1);
    console.log(`[outlier] observing this session — running: ${cmd.join(' ')}\n`);
    const r = runWrap(cmd);
    console.log(`[outlier] observed ${r.added} lines your agent (${r.tool}) wrote across ${r.files} file${r.files === 1 ? '' : 's'}.`);
    console.log(`Now run  outlier status  — execution counts this session, no Claude logs needed.`);
    process.exit(0);
  }

  const sub = args[2];
  if (sub === 'start') {
    const toolIdx = args.indexOf('--tool');
    const tool = toolIdx !== -1 ? (args[toolIdx + 1] || 'manual') : 'manual';
    const r = runStart(tool);
    console.log(r.already
      ? `[outlier] a session is already being observed. Run  outlier watch stop  to close it.`
      : `[outlier] observing started (${tool}). Work in your editor, then:  outlier watch stop`);
    process.exit(0);
  }
  if (sub === 'stop') {
    const r = runStop();
    if (!r.ran) console.log(`[outlier] no active session. Start one with  outlier watch start`);
    else {
      if ((r.staleHours || 0) > 12) console.log(`[outlier] note: this session was open ${r.staleHours}h — long windows over-attribute to the tool.`);
      console.log(`[outlier] observed ${r.added} lines (${r.tool}) across ${r.files} file${r.files === 1 ? '' : 's'}. Run  outlier status`);
    }
    process.exit(0);
  }

  const status = watchStatus();
  console.log(status.active
    ? `[outlier] observing (${status.tool}) — ${status.sessions} sessions`
    : `[outlier] no active session. Start one with  outlier watch start`);
}
