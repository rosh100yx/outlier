import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { getAuthorshipStats, checkIsGitRepo } from "../src/git";
import { join } from "path";
import { spawnSync } from "bun";
import { rmSync, mkdirSync, writeFileSync } from "fs";

describe("Git Authorship Parser", () => {
  const repoPath = join(process.cwd(), "tests/fixtures/git-repo-temp");

  beforeAll(() => {
    // Setup temporary git repo
    rmSync(repoPath, { recursive: true, force: true });
    mkdirSync(repoPath, { recursive: true });
    spawnSync(["git", "init"], { cwd: repoPath });
    spawnSync(["git", "config", "user.email", "test@example.com"], { cwd: repoPath });
    spawnSync(["git", "config", "user.name", "Test Bot"], { cwd: repoPath });
    writeFileSync(join(repoPath, "file1.txt"), "hello");
    spawnSync(["git", "add", "."], { cwd: repoPath });
    spawnSync(["git", "commit", "-m", "init"], { cwd: repoPath });
    writeFileSync(join(repoPath, "file1.txt"), "change");
    spawnSync(["git", "commit", "-am", "ai generated\n\nCo-Authored-By: Claude"], { cwd: repoPath });
  });

  afterAll(() => {
    rmSync(repoPath, { recursive: true, force: true });
  });

  it("should verify if directory is a git repo", async () => {
    const isRepo = await checkIsGitRepo(repoPath);
    expect(isRepo).toBe(true);
    
    const notRepo = await checkIsGitRepo("/tmp");
    expect(notRepo).toBe(false);
  });

  it("should calculate correct authorship ratio", async () => {
    const stats = await getAuthorshipStats(repoPath);
    
    expect(stats.total).toBe(2); // init + AI commit
    expect(stats.ai).toBe(1); // 1 AI commit
    expect(stats.ratio).toBe(0.5); // 1 / 2
  });
});
