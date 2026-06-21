import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

export interface CapabilitiesStats {
  mcps: string[];
  skills: string[];
  hasOrchestration: boolean;
}

export async function getCapabilitiesStats(repoPath: string = process.cwd()): Promise<CapabilitiesStats> {
  const stats: CapabilitiesStats = {
    mcps: [],
    skills: [],
    hasOrchestration: false
  };

  // Check for AGENTS.md (Orchestration Policy)
  if (existsSync(join(repoPath, 'AGENTS.md'))) {
    stats.hasOrchestration = true;
  }

  // Scan local project skills
  const projectSkillsPath = join(repoPath, '.agents', 'skills');
  if (existsSync(projectSkillsPath)) {
    try {
      const skills = readdirSync(projectSkillsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      stats.skills.push(...skills);
    } catch (e) {}
  }

  // Scan global skills (Gemini / Claude)
  const geminiSkillsPath = join(homedir(), '.gemini', 'skills');
  if (existsSync(geminiSkillsPath)) {
    try {
      const skills = readdirSync(geminiSkillsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      // Only add if not already added (dedupe)
      for (const skill of skills) {
        if (!stats.skills.includes(skill)) stats.skills.push(skill);
      }
    } catch (e) {}
  }

  // Scan MCPs from gemini config
  const geminiMcpPath = join(homedir(), '.gemini', 'antigravity-cli', 'mcp');
  if (existsSync(geminiMcpPath)) {
    try {
      const mcps = readdirSync(geminiMcpPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      stats.mcps.push(...mcps);
    } catch (e) {}
  }

  // Also check Claude settings for legacy MCPs/Plugins
  const claudeSettingsPath = join(homedir(), '.claude', 'settings.json');
  if (existsSync(claudeSettingsPath)) {
    try {
      const claudeSettings = require(claudeSettingsPath);
      if (claudeSettings.enabledPlugins) {
        Object.keys(claudeSettings.enabledPlugins).forEach(plugin => {
          if (claudeSettings.enabledPlugins[plugin] && !stats.mcps.includes(plugin)) {
            stats.mcps.push(`plugin:${plugin}`);
          }
        });
      }
    } catch (e) {}
  }

  return stats;
}
