import { spawnSync } from 'child_process';

export interface AuthorshipStats {
  total: number;
  ai: number;
  ratio: number;
  totalNoMerges: number;
  aiNoMerges: number;
  ratioNoMerges: number;
}

function runGitCommand(args: string[], cwd: string): number {
  const proc = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf-8' });
  if (proc.status !== 0) {
    throw new Error('Git command failed');
  }
  const text = proc.stdout || '';
  const lines = text.trim().split('\n').filter(l => l.length > 0);
  return lines.length;
}

export async function checkIsGitRepo(cwd: string): Promise<boolean> {
  const proc = spawnSync('git', ['-C', cwd, 'rev-parse', '--is-inside-work-tree'], { encoding: 'utf-8' });
  return proc.status === 0;
}

export async function getAuthorshipStats(repoPath: string = process.cwd()): Promise<AuthorshipStats> {
  const isRepo = await checkIsGitRepo(repoPath);
  if (!isRepo) {
    throw new Error(`Directory is not a git repository: ${repoPath}`);
  }

  const total = runGitCommand(['log', '--oneline'], repoPath);
  const ai = runGitCommand(['log', '-i', '--grep=Co-Authored-By', '--oneline'], repoPath);
  const totalNoMerges = runGitCommand(['log', '--no-merges', '--oneline'], repoPath);
  const aiNoMerges = runGitCommand(['log', '--no-merges', '-i', '--grep=Co-Authored-By', '--oneline'], repoPath);

  return {
    total,
    ai,
    ratio: total === 0 ? 0 : ai / total,
    totalNoMerges,
    aiNoMerges,
    ratioNoMerges: totalNoMerges === 0 ? 0 : aiNoMerges / totalNoMerges
  };
}
