import fs from 'fs';
import path from 'path';

export function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw new Error(`Failed to parse ${filePath}: ${err.message}`);
  }
}

export function writeJson(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, filePath);
}

export function mergeMcp(existing, patch, force) {
  const existingServers =
    existing && typeof existing.mcpServers === 'object' && existing.mcpServers !== null
      ? existing.mcpServers
      : {};
  const result = { mcpServers: { ...existingServers } };
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

  // enabledPlugins — key-level merge
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

  // extraKnownMarketplaces — key-level merge
  if (patch.extraKnownMarketplaces) {
    result.extraKnownMarketplaces = result.extraKnownMarketplaces ?? {};
    for (const [key, value] of Object.entries(patch.extraKnownMarketplaces)) {
      if (!force && result.extraKnownMarketplaces[key] !== undefined) {
        skipped.push(`marketplace:${key}`);
      } else {
        result.extraKnownMarketplaces[key] = value;
      }
    }
  }

  // hooks — array append by matcher
  if (patch.hooks) {
    result.hooks = result.hooks ?? {};
    for (const [event, newEntries] of Object.entries(patch.hooks)) {
      result.hooks[event] = result.hooks[event] ?? [];
      for (const entry of newEntries) {
        const exists = result.hooks[event].some(e => e.matcher === entry.matcher);
        if (!force && exists) {
          skipped.push(`hook:${event}:${entry.matcher}`);
        } else {
          result.hooks[event].push(entry);
        }
      }
    }
  }

  return { ...result, skipped };
}

export function applyConfigPatch(projectRoot, patch, force) {
  const mcpPath = path.join(projectRoot, '.mcp.json');
  const settingsPath = path.join(projectRoot, '.claude', 'settings.json');
  const written = [];
  const allSkipped = [];

  if (patch.mcp) {
    const existing = readJson(mcpPath) ?? { mcpServers: {} };
    const { skipped, ...merged } = mergeMcp(existing, patch.mcp, force);
    writeJson(mcpPath, merged);
    written.push('.mcp.json');
    allSkipped.push(...skipped);
  }

  if (patch.settings) {
    const existing = readJson(settingsPath) ?? {};
    const { skipped, ...merged } = mergeSettings(existing, patch.settings, force);
    writeJson(settingsPath, merged);
    written.push('.claude/settings.json');
    allSkipped.push(...skipped);
  }

  return { written, skipped: allSkipped };
}
