import pc from 'picocolors';

export function closeBox(s: string, W = 66): string {
  const wide = new Set(['⚠', '🛑', '✈', '🌱', '📸', '🔬', '💾', '💡', '✅', '❌', '😾', '😀']);
  const chW = (ch: string) => { const cp = ch.codePointAt(0)!; return (cp >= 0x1F000 || wide.has(ch)) ? 2 : 1; };
  const rail = '\x1b[2m│\x1b[0m';
  const fit = (line: string, totalVis: number) => {
    const parts = line.split(/(\x1b\[[0-9;]*m)/);
    let out = '', vis = 0, cut = false;
    for (const p of parts) {
      if (/^\x1b\[/.test(p)) { out += p; continue; }
      for (const ch of p) {
        const w = chW(ch);
        if (vis + w > totalVis - 1) { cut = true; break; }
        out += ch; vis += w;
      }
      if (cut) break;
    }
    if (cut) { out += '…'; vis += 1; }
    return out + ' '.repeat(Math.max(0, totalVis - vis)) + '\x1b[0m';
  };
  return s.split('\n').map(line => {
    const plain = line.replace(/\x1b\[[0-9;]*m/g, '');
    if (/^\s*┌/.test(plain)) return ' \x1b[2m┌' + '─'.repeat(W) + '┐\x1b[0m';
    if (/^\s*├/.test(plain)) return ' \x1b[2m├' + '─'.repeat(W) + '┤\x1b[0m';
    if (/^\s*└/.test(plain)) return ' \x1b[2m└' + '─'.repeat(W) + '┘\x1b[0m';
    if (/^\s*│/.test(plain)) return fit(line, 2 + W) + rail;
    return line;
  }).join('\n');
}
