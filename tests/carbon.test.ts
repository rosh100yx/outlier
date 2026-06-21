import { describe, it, expect } from "bun:test";
import { ClaudeLogParser } from "../src/carbon";
import { join } from "path";

describe("ClaudeLogParser", () => {
  it("should parse tokenomics-log.jsonl correctly", async () => {
    const fixtureDir = join(process.cwd(), "tests/fixtures");
    const parser = new ClaudeLogParser(fixtureDir);
    const stats = await parser.parse();

    expect(stats.total).toBe(350); // 100 + 50 + 200
    expect(stats.output).toBe(80); // 20 + 10 + 50
    expect(stats.cache).toBe(270); // 80 + 40 + 150
    expect(stats.sessions).toBe(2); // sess_1, sess_2
  });

  it("should return zeros if file does not exist", async () => {
    const parser = new ClaudeLogParser("/non/existent/path");
    const stats = await parser.parse();

    expect(stats.total).toBe(0);
    expect(stats.sessions).toBe(0);
  });
});
