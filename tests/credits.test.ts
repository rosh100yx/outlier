import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { recordCredit, getCredits, calculatePoints } from "../src/credits";
import { runWrap } from "../src/observe";
import { join } from "path";
import { spawnSync } from "bun";
import { rmSync, mkdirSync, writeFileSync } from "fs";

describe("Non-code contribution credits", () => {
  const repoPath = join(process.cwd(), "tests/fixtures/credits-repo");
  const baseDir = join(process.cwd(), "tests/fixtures/credits-basedir");

  beforeAll(() => {
    rmSync(repoPath, { recursive: true, force: true });
    rmSync(baseDir, { recursive: true, force: true });
    mkdirSync(repoPath, { recursive: true });
    mkdirSync(baseDir, { recursive: true });

    spawnSync(["git", "init"], { cwd: repoPath });
    spawnSync(["git", "config", "user.email", "docwriter@example.com"], { cwd: repoPath });
    spawnSync(["git", "config", "user.name", "Doc Writer"], { cwd: repoPath });
    
    mkdirSync(join(repoPath, "docs"));
    writeFileSync(join(repoPath, "docs", "README.md"), "Initial docs");
    spawnSync(["git", "add", "."], { cwd: repoPath });
    spawnSync(["git", "commit", "-m", "init docs"], { cwd: repoPath });
  });

  afterAll(() => {
    rmSync(repoPath, { recursive: true, force: true });
    rmSync(baseDir, { recursive: true, force: true });
  });

  it("should calculate points correctly", () => {
    recordCredit({
      repo: "credits-repo",
      branch: "main",
      contributor: "test1@example.com",
      contributionType: "documentation",
      details: "Modified 1 doc",
      points: 2
    }, baseDir);

    recordCredit({
      repo: "credits-repo",
      branch: "main",
      contributor: "test1@example.com",
      contributionType: "research",
      details: "Modified 1 paper",
      points: 5
    }, baseDir);

    recordCredit({
      repo: "credits-repo",
      branch: "main",
      contributor: "test2@example.com",
      contributionType: "review",
      details: "Reviewed PR",
      points: 10
    }, baseDir);

    const credits = getCredits(baseDir, "credits-repo");
    expect(credits.length).toBe(3);

    const pts = calculatePoints(credits);
    expect(pts["test1@example.com"]).toBe(7);
    expect(pts["test2@example.com"]).toBe(10);
  });

  it("should automatically award points on runWrap for docs", () => {
    // Modify docs
    const scriptPath = join(repoPath, "modify_docs.sh");
    writeFileSync(scriptPath, `#!/bin/sh\necho "New doc line" >> ${join(repoPath, "docs", "README.md")}`);
    spawnSync(["chmod", "+x", scriptPath]);

    // runWrap uses bash to run modify_docs.sh
    runWrap([scriptPath], repoPath, baseDir);

    const credits = getCredits(baseDir, "credits-repo");
    const docCredits = credits.filter(c => c.contributor === "docwriter@example.com" && c.contributionType === "documentation");
    
    expect(docCredits.length).toBeGreaterThan(0);
    expect(docCredits[0]?.points).toBe(2);
  });
});
