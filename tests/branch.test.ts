import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { getEditAuthorship } from "../src/edits";
import { join } from "path";
import { spawnSync } from "bun";
import { rmSync, mkdirSync, writeFileSync } from "fs";
import { hashLine } from "../src/util";

describe("Branch-scoped measurement (sinceRef)", () => {
  const repoPath = join(process.cwd(), "tests/fixtures/branch-repo");
  const baseDir = join(process.cwd(), "tests/fixtures/base-dir");

  beforeAll(() => {
    // Setup temporary git repo
    rmSync(repoPath, { recursive: true, force: true });
    rmSync(baseDir, { recursive: true, force: true });
    mkdirSync(repoPath, { recursive: true });
    mkdirSync(baseDir, { recursive: true });

    // Git init
    spawnSync(["git", "init", "-b", "main"], { cwd: repoPath });
    spawnSync(["git", "config", "user.email", "test@example.com"], { cwd: repoPath });
    spawnSync(["git", "config", "user.name", "Test User"], { cwd: repoPath });

    // Base commit on main
    writeFileSync(join(repoPath, "base.txt"), "export function main() { return 1; }");
    spawnSync(["git", "add", "."], { cwd: repoPath });
    spawnSync(["git", "commit", "-m", "init"], { cwd: repoPath });

    // Branch feature
    spawnSync(["git", "checkout", "-b", "feature"], { cwd: repoPath });
    writeFileSync(join(repoPath, "feature.txt"), "export function feature() { return 2; }");
    spawnSync(["git", "add", "."], { cwd: repoPath });
    spawnSync(["git", "commit", "-m", "feature commit"], { cwd: repoPath });

    // Mock the outlier ledger in baseDir
    const observedDir = join(baseDir, ".outlier", "observed");
    mkdirSync(observedDir, { recursive: true });
    
    const slugFor = (root: string) => root.replace(/[/\\]+/g, '-').replace(/^-+/, '');
    const ledgerPath = join(observedDir, slugFor(repoPath) + ".jsonl");

    const lineHash = hashLine("export function feature() { return 2; }");
    
    const entry = {
      ts: new Date().toISOString(),
      tool: "manual",
      head: "dummyhead",
      branch: "feature",
      files: ["feature.txt"],
      addedLines: 1,
      hashes: [lineHash]
    };
    writeFileSync(ledgerPath, JSON.stringify(entry) + "\n");
  });

  afterAll(() => {
    rmSync(repoPath, { recursive: true, force: true });
    rmSync(baseDir, { recursive: true, force: true });
  });

  it("without sinceRef it counts whole repo", () => {
    const edits = getEditAuthorship(repoPath, baseDir);
    expect(edits.found).toBe(true);
    expect(edits.totalLines).toBe(2); // base.txt + feature.txt
    expect(edits.aiLines).toBe(1); // feature.txt
    expect(edits.aiPercent).toBe(50);
  });

  it("with sinceRef it scopes to the branch diff", () => {
    const edits = getEditAuthorship(repoPath, baseDir, "main");
    expect(edits.found).toBe(true);
    expect(edits.totalLines).toBe(1); // Only feature.txt changed
    expect(edits.aiLines).toBe(1); // feature.txt was AI written
    expect(edits.aiPercent).toBe(100);
  });
});
