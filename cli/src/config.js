import fs from 'fs';
import path from 'path';

export function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJson(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export function mergeMcp(existing, patch, force) {
  const result = { mcpServers: { ...existing.mcpServers } };
  const skipped = [];
  for (const [key, value] of Object.entries(patch)) {
    if (!force && result.mcpServers[key] !== undefined) {
      skipped.push(key);
    } else {
      result.mcpServers[key] = value;
    }
  }
  return { ...result, skipped };
}

export function mergeSettings(existing, patch, force) {
  const result = { ...existing };
  const skipped = [];
  if (patch.enabledPlugins) {
    result.enabledPlugins = result.enabledPlugins ?? {};
    for (const [key, value] of Object.entries(patch.enabledPlugins)) {
      if (!force && result.enabledPlugins[key] !== undefined) {
        skipped.push(key);
      } else {
        result.enabledPlugins[key] = value;
      }
    }
  }
  return { ...result, skipped };
}

export function applyConfigPatch(projectRoot, patch, force) {
  const mcpPath = path.join(projectRoot, '.mcp.json');
  const settingsPath = path.join(projectRoot, '.claude', 'settings.json');
  const written = [];

  if (patch.mcp) {
    const existing = readJson(mcpPath) ?? { mcpServers: {} };
    const { skipped, ...merged } = mergeMcp(existing, patch.mcp, force);
    writeJson(mcpPath, merged);
    written.push('.mcp.json');
    if (skipped.length) skipped.forEach(k => console.log(`  skipping ${k} (already configured)`));
  }

  if (patch.settings) {
    const existing = readJson(settingsPath) ?? {};
    const { skipped, ...merged } = mergeSettings(existing, patch.settings, force);
    writeJson(settingsPath, merged);
    written.push('.claude/settings.json');
    if (skipped.length) skipped.forEach(k => console.log(`  skipping ${k} (already configured)`));
  }

  return written;
}
