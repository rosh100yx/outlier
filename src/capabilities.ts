import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { findRepoTranscriptDirs } from './agentic';

// Reach = what a tool can actually do to you if an agent (or a prompt injection) drives it.
export type Reach = 'read' | 'network' | 'model' | 'data' | 'write-local' | 'write-remote' | 'deploy' | 'exec' | 'money';

export interface ToolReach {
  name: string;
  reach: Reach;
  observed: boolean;   // was this server actually called in this repo's sessions?
}

export type BlastRadius = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CapabilitiesStats {
  mcps: ToolReach[];
  mcpsObserved: number;   // configured servers actually called in this repo's sessions
  mcpsLatent: number;     // configured but never called = reachable surface, zero benefit
  skills: string[];
  subagents: number;
  hooks: string[];        // lifecycle events with auto-firing hooks
  hasOrchestration: boolean;
  blastRadius: BlastRadius;
  blastReasons: string[]; // plain-language reasons for the score
}

// Which configured MCP servers were actually invoked in this repo's sessions?
// Tool calls appear as `mcp__<server>__<tool>` in the transcripts. A configured server
// that is never called is pure attack surface: an injection can still drive it, but you
// get no benefit from carrying the risk. Names are matched loosely (config key vs the
// server segment of the tool name, which can differ in punctuation/case).
function observedMcpServers(repoPath: string, homeDirPath: string): Set<string> {
  const seen = new Set<string>();
  const re = /mcp__([a-zA-Z0-9_.-]+)__/g;
  for (const dir of findRepoTranscriptDirs(repoPath, homeDirPath)) {
    let files: string[] = [];
    try { files = readdirSync(dir).filter(f => f.endsWith('.jsonl')); } catch { continue; }
    for (const f of files) {
      let text = '';
      try { text = readFileSync(join(dir, f), 'utf-8'); } catch { continue; }
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) { if (m[1]) seen.add(m[1].toLowerCase()); }
    }
  }
  return seen;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
// Match a configured server to an observed tool-call segment. This feeds a SECURITY signal
// (latent = reachable-but-unused attack surface), so it must err toward over-warning: a false
// "latent" is a harmless nudge, a false "used" hides real surface. So NO loose substring match
// (which made `git` match `github`, `mem` match `supermemory` → falsely "used"). Require exact
// normalized equality, or the observed segment to END WITH the server name (covers connector
// prefixes like mcp__claude_ai_Airtable__… for a server keyed `Airtable`). Nothing shorter.
function wasObserved(serverName: string, observed: Set<string>): boolean {
  const n = norm(serverName);
  if (!n) return false;
  for (const o of observed) {
    const no = norm(o);
    if (no === n) return true;
    if (n.length >= 3 && no.endsWith(n)) return true;
  }
  return false;
}

// Classify an MCP/tool by name into a reach category. Keyword-based, since names vary.
export function classifyReach(name: string): Reach {
  const n = name.toLowerCase();
  if (/(stripe|payment|infinity|kucoin|wallet|billing|payout)/.test(n)) return 'money';
  if (/(shell|bash|exec|terminal|command|sandbox)/.test(n)) return 'exec';
  if (/(cloudflare|vercel|netlify|modal|deploy|fly\.io|render|heroku|aws|gcp|azure)/.test(n)) return 'deploy';
  if (/(github|gitlab|git|bitbucket)/.test(n)) return 'write-remote';
  if (/(filesystem|file|fs|disk)/.test(n)) return 'write-local';
  if (/(memory|supermemory|mem|obsidian|notion|airtable|coda|database|sql|store)/.test(n)) return 'data';
  if (/(openrouter|ollama|openai|anthropic|llm|model|hugging)/.test(n)) return 'model';
  if (/(exa|web|fetch|search|brave|browser|http|scrape)/.test(n)) return 'network';
  return 'network'; // unknown tool: assume it can reach out
}

const REACH_RISK: Record<Reach, number> = {
  read: 0, model: 1, network: 1, 'data': 2, 'write-local': 2, 'write-remote': 3, deploy: 3, exec: 4, money: 4,
};

function scoreBlast(reaches: Reach[]): { radius: BlastRadius; reasons: string[] } {
  const reasons: string[] = [];
  const has = (r: Reach) => reaches.includes(r);
  if (has('money')) reasons.push('can move money');
  if (has('exec')) reasons.push('can run shell commands');
  if (has('deploy')) reasons.push('can deploy to production');
  if (has('write-remote')) reasons.push('can push to your remote repos');
  if (has('write-local')) reasons.push('can write your local files');
  if (has('data')) reasons.push('can read/write your stored data');
  const netCount = reaches.filter(r => r === 'network' || r === 'model').length;
  if (netCount >= 3) reasons.push(`reaches ${netCount} external services`);

  const max = reaches.reduce((m, r) => Math.max(m, REACH_RISK[r]), 0);
  let radius: BlastRadius = 'LOW';
  if (max >= 4) radius = 'CRITICAL';
  else if (max >= 3) radius = 'HIGH';
  else if (max >= 2) radius = 'MEDIUM';
  return { radius, reasons };
}

function readJson(path: string): any {
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return null; }
}

function countDir(path: string, ext = '.md'): number {
  try { return readdirSync(path).filter(f => f.endsWith(ext)).length; } catch { return 0; }
}

export async function getCapabilitiesStats(repoPath: string = process.cwd(), homeDirPath: string = homedir()): Promise<CapabilitiesStats> {
  const mcpNames = new Set<string>();

  // MCP servers — the agent's actual tool reach. Read from every place they live.
  // Read MCP servers from every place agents declare them (Claude, Cursor, Gemini, project).
  for (const cfg of [
    join(homeDirPath, '.claude.json'),
    join(homeDirPath, '.claude', 'settings.json'),
    join(homeDirPath, '.cursor', 'mcp.json'),
    join(homeDirPath, '.gemini', 'config', 'mcp_config.json'),
    join(homeDirPath, '.gemini', 'settings.json'),
    join(repoPath, '.mcp.json'),
    join(repoPath, '.cursor', 'mcp.json'),
    join(repoPath, '.claude', 'settings.json'),
  ]) {
    const j = readJson(cfg);
    if (j?.mcpServers) Object.keys(j.mcpServers).forEach(k => mcpNames.add(k));
  }
  // Gemini-style MCP dir
  const geminiMcp = join(homeDirPath, '.gemini', 'antigravity-cli', 'mcp');
  if (existsSync(geminiMcp)) {
    try { readdirSync(geminiMcp, { withFileTypes: true }).filter(d => d.isDirectory()).forEach(d => mcpNames.add(d.name)); } catch {}
  }

  const observed = observedMcpServers(repoPath, homeDirPath);
  const mcps: ToolReach[] = [...mcpNames].map(name => ({ name, reach: classifyReach(name), observed: wasObserved(name, observed) }));
  const mcpsObserved = mcps.filter(m => m.observed).length;
  const mcpsLatent = mcps.length - mcpsObserved;

  // Skills
  const skills: string[] = [];
  for (const p of [join(repoPath, '.agents', 'skills'), join(homeDirPath, '.claude', 'skills'), join(homeDirPath, '.gemini', 'skills')]) {
    if (existsSync(p)) {
      try { readdirSync(p, { withFileTypes: true }).filter(d => d.isDirectory()).forEach(d => { if (!skills.includes(d.name)) skills.push(d.name); }); } catch {}
    }
  }

  // Sub-agents (Claude Code agent definitions)
  const subagents = countDir(join(homeDirPath, '.claude', 'agents')) + countDir(join(repoPath, '.claude', 'agents'));

  // Hooks — automation that fires on the developer's behalf (a real governance surface)
  const hooks: string[] = [];
  for (const cfg of [join(homeDirPath, '.claude', 'settings.json'), join(repoPath, '.claude', 'settings.json')]) {
    const j = readJson(cfg);
    if (j?.hooks) Object.keys(j.hooks).forEach(k => { if (!hooks.includes(k)) hooks.push(k); });
  }

  // Orchestration policy
  const hasOrchestration = existsSync(join(repoPath, 'AGENTS.md')) || existsSync(join(repoPath, '.mcp.json'));

  const { radius, reasons } = scoreBlast(mcps.map(m => m.reach));
  // Latent surface: reachable-but-unused tools carry risk for no benefit. Flag the risky ones.
  const latentRisky = mcps.filter(m => !m.observed && ['money', 'exec', 'deploy', 'write-remote', 'write-local', 'data'].includes(m.reach)).length;
  if (latentRisky > 0) reasons.push(`${latentRisky} write/deploy/money tool${latentRisky > 1 ? 's' : ''} reachable but never used`);

  return { mcps, mcpsObserved, mcpsLatent, skills, subagents, hooks, hasOrchestration, blastRadius: radius, blastReasons: reasons };
}
