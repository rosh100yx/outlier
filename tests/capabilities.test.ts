import { describe, it, expect } from "bun:test";
import { getCapabilitiesStats } from "../src/capabilities";
import { join } from "path";

describe("Capabilities Engine", () => {
  it("should detect local and global capabilities", async () => {
    const repoPath = join(process.cwd(), "tests/fixtures/repo");
    const homePath = join(process.cwd(), "tests/fixtures/home");

    const stats = await getCapabilitiesStats(repoPath, homePath);

    expect(stats.hasOrchestration).toBe(true);
    expect(stats.skills).toContain("dummy-skill");
    expect(stats.skills).toContain("global-skill");
    expect(stats.mcps).toContain("dummy-mcp");
  });

  it("should handle empty directories gracefully", async () => {
    const stats = await getCapabilitiesStats("/non/existent/repo", "/non/existent/home");

    expect(stats.hasOrchestration).toBe(false);
    expect(stats.skills.length).toBe(0);
    expect(stats.mcps.length).toBe(0);
  });
});
