import { spawn } from 'bun';

export interface AuthorshipStats {
  total: number;
  ai: number;
  ratio: number;
  totalNoMerges: number;
  aiNoMerges: number;
  ratioNoMerges: number;
}

async function runGitCommand(args: string[], cwd: string): Promise<number> {
  const proc = spawn(['git', '-C', cwd, ...args], { stdout: 'pipe', stderr: 'pipe' });
  const text = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  
  if (exitCode !== 0) {
    throw new Error('Git command failed');
  }
  
  const lines = text.trim().split('\n').filter(l => l.length > 0);
  return lines.length;
}

export async function checkIsGitRepo(cwd: string): Promise<boolean> {
  const proc = spawn(['git', '-C', cwd, 'rev-parse', '--is-inside-work-tree'], { stdout: 'pipe', stderr: 'pipe' });
  const exitCode = await proc.exited;
  return exitCode === 0;
}

export async function getAuthorshipStats(repoPath: string = process.cwd()): Promise<AuthorshipStats> {
  const isRepo = await checkIsGitRepo(repoPath);
  if (!isRepo) {
    throw new Error(`Directory is not a git repository: ${repoPath}`);
  }

  const total = await runGitCommand(['log', '--oneline'], repoPath);
  const ai = await runGitCommand(['log', '-i', '--grep=Co-Authored-By', '--oneline'], repoPath);
  const totalNoMerges = await runGitCommand(['log', '--no-merges', '--oneline'], repoPath);
  const aiNoMerges = await runGitCommand(['log', '--no-merges', '-i', '--grep=Co-Authored-By', '--oneline'], repoPath);

  return {
    total,
    ai,
    ratio: total === 0 ? 0 : ai / total,
    totalNoMerges,
    aiNoMerges,
    ratioNoMerges: totalNoMerges === 0 ? 0 : aiNoMerges / totalNoMerges
  };
}
