# ai-omega CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a Node.js CLI (`ai-omega init`) that interactively installs a curated Claude Code toolkit onto any project via a remote manifest.

**Architecture:** A thin Node.js CLI fetches `omega.manifest.json` from GitHub raw on every run, presents components grouped by category via interactive checkboxes, then executes shell install steps and merges config patches into `.mcp.json` and `.claude/settings.json`. Falls back to a bundled manifest copy if network is unavailable.

**Tech Stack:** Node.js 18+, `@inquirer/checkbox`, `@inquirer/input`, native `fetch`, Jest for tests.

---

## File Map

| File | Role |
|------|------|
| `omega.manifest.json` | Hosted manifest — all components, fetched fresh each run |
| `cli/package.json` | npm package config, bin entry, deps, jest config |
| `cli/src/index.js` | Entry point — parses `init` command, calls `runInit()` |
| `cli/src/manifest.js` | Fetch manifest from GitHub, validate schema, fallback to bundled |
| `cli/src/config.js` | Read/write/merge `.mcp.json` and `.claude/settings.json` |
| `cli/src/installer.js` | Check deps, substitute `{project_name}`, run shell steps |
| `cli/src/init.js` | Interactive flow — prompts, orchestrates manifest+installer+config |
| `cli/src/bundled-manifest.json` | Bundled fallback manifest (copy of omega.manifest.json at release time) |
| `cli/tests/manifest.test.js` | Unit tests for manifest fetch, validation, fallback |
| `cli/tests/config.test.js` | Unit tests for merge logic, conflict skip, --force |
| `cli/tests/installer.test.js` | Unit tests for dep checks, template substitution, step execution |

---

## Task 1: Scaffold CLI package

**Files:**
- Create: `cli/package.json`
- Create: `cli/src/index.js`
- Create: `cli/src/bundled-manifest.json`

- [ ] **Step 1: Create `cli/package.json`**

```json
{
  "name": "ai-omega",
  "version": "0.1.0",
  "description": "Interactive Claude Code toolkit installer",
  "type": "module",
  "bin": {
    "ai-omega": "./src/index.js"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "@inquirer/checkbox": "^3.0.0",
    "@inquirer/input": "^4.0.0"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  },
  "scripts": {
    "test": "node --experimental-vm-modules node_modules/.bin/jest --testPathPattern=tests/"
  },
  "jest": {
    "transform": {}
  },
  "files": [
    "src/"
  ]
}
```

- [ ] **Step 2: Create `cli/src/index.js`**

```js
#!/usr/bin/env node
import { runInit } from './init.js';

const [,, command, ...args] = process.argv;
const force = args.includes('--force');

if (command === 'init') {
  runInit({ force }).catch(err => {
    console.error(err.message);
    process.exit(1);
  });
} else {
  console.log('Usage: ai-omega init [--force]');
  process.exit(1);
}
```

- [ ] **Step 3: Create `cli/src/bundled-manifest.json` (minimal stub for now)**

```json
{
  "version": "1",
  "_bundled": true,
  "_bundled_version": "0.1.0",
  "components": []
}
```

- [ ] **Step 4: Install deps**

```bash
cd cli && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Commit**

```bash
git add cli/
git commit -m "feat: scaffold cli package"
```

---

## Task 2: manifest.js — fetch, validate, fallback

**Files:**
- Create: `cli/src/manifest.js`
- Create: `cli/tests/manifest.test.js`

- [ ] **Step 1: Write failing tests**

Create `cli/tests/manifest.test.js`:

```js
import { validateManifest, applyFallback } from '../src/manifest.js';

const VALID = {
  version: '1',
  components: [
    {
      id: 'lean-ctx',
      name: 'lean-ctx MCP',
      description: 'desc',
      category: 'mcp',
      recommended: true,
      install_steps: [],
      config_patch: {}
    }
  ]
};

test('validateManifest accepts valid manifest', () => {
  expect(() => validateManifest(VALID)).not.toThrow();
});

test('validateManifest throws on missing version', () => {
  expect(() => validateManifest({ components: [] })).toThrow('version');
});

test('validateManifest throws on missing components', () => {
  expect(() => validateManifest({ version: '1' })).toThrow('components');
});

test('validateManifest throws when component missing required field', () => {
  const bad = { version: '1', components: [{ id: 'x' }] };
  expect(() => validateManifest(bad)).toThrow('name');
});

test('applyFallback returns bundled manifest with warning flag', () => {
  const result = applyFallback();
  expect(result._usedFallback).toBe(true);
  expect(result.components).toBeDefined();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd cli && npm test -- --testPathPattern=manifest
```

Expected: FAIL — `manifest.js` not found.

- [ ] **Step 3: Implement `cli/src/manifest.js`**

```js
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const MANIFEST_URL =
  'https://raw.githubusercontent.com/NikhilThakur2001/ai_omegarepo/main/omega.manifest.json';

const REQUIRED_COMPONENT_FIELDS = ['id', 'name', 'description', 'category', 'install_steps', 'config_patch'];

export function validateManifest(manifest) {
  if (!manifest.version) throw new Error('Manifest missing field: version');
  if (!manifest.components) throw new Error('Manifest missing field: components');
  for (const c of manifest.components) {
    for (const field of REQUIRED_COMPONENT_FIELDS) {
      if (c[field] === undefined) throw new Error(`Component "${c.id ?? '?'}" missing field: ${field}`);
    }
  }
}

export function applyFallback() {
  const bundled = require('./bundled-manifest.json');
  return { ...bundled, _usedFallback: true };
}

export async function fetchManifest() {
  try {
    const res = await fetch(MANIFEST_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const manifest = await res.json();
    validateManifest(manifest);
    return { ...manifest, _usedFallback: false };
  } catch {
    const fallback = applyFallback();
    return fallback;
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd cli && npm test -- --testPathPattern=manifest
```

Expected: 5 passed, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add cli/src/manifest.js cli/tests/manifest.test.js
git commit -m "feat: manifest fetch, validate, fallback"
```

---

## Task 3: config.js — merge .mcp.json and settings.json

**Files:**
- Create: `cli/src/config.js`
- Create: `cli/tests/config.test.js`

- [ ] **Step 1: Write failing tests**

Create `cli/tests/config.test.js`:

```js
import { mergeMcp, mergeSettings } from '../src/config.js';

test('mergeMcp adds new server to empty object', () => {
  const existing = { mcpServers: {} };
  const patch = { 'lean-ctx': { command: 'lean-ctx', type: 'stdio', args: [], env: {} } };
  const result = mergeMcp(existing, patch, false);
  expect(result.mcpServers['lean-ctx']).toBeDefined();
  expect(result.skipped).toEqual([]);
});

test('mergeMcp skips existing key when force=false', () => {
  const existing = { mcpServers: { 'lean-ctx': { command: 'lean-ctx' } } };
  const patch = { 'lean-ctx': { command: 'lean-ctx-new' } };
  const result = mergeMcp(existing, patch, false);
  expect(result.mcpServers['lean-ctx'].command).toBe('lean-ctx');
  expect(result.skipped).toContain('lean-ctx');
});

test('mergeMcp overwrites existing key when force=true', () => {
  const existing = { mcpServers: { 'lean-ctx': { command: 'old' } } };
  const patch = { 'lean-ctx': { command: 'new' } };
  const result = mergeMcp(existing, patch, true);
  expect(result.mcpServers['lean-ctx'].command).toBe('new');
  expect(result.skipped).toEqual([]);
});

test('mergeSettings adds enabledPlugins to empty object', () => {
  const existing = {};
  const patch = { enabledPlugins: { 'superpowers@claude-plugins-official': true } };
  const result = mergeSettings(existing, patch, false);
  expect(result.enabledPlugins['superpowers@claude-plugins-official']).toBe(true);
  expect(result.skipped).toEqual([]);
});

test('mergeSettings skips existing plugin key when force=false', () => {
  const existing = { enabledPlugins: { 'superpowers@claude-plugins-official': true } };
  const patch = { enabledPlugins: { 'superpowers@claude-plugins-official': false } };
  const result = mergeSettings(existing, patch, false);
  expect(result.enabledPlugins['superpowers@claude-plugins-official']).toBe(true);
  expect(result.skipped).toContain('superpowers@claude-plugins-official');
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd cli && npm test -- --testPathPattern=config
```

Expected: FAIL — `config.js` not found.

- [ ] **Step 3: Implement `cli/src/config.js`**

```js
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
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd cli && npm test -- --testPathPattern=config
```

Expected: 5 passed, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add cli/src/config.js cli/tests/config.test.js
git commit -m "feat: config merge for .mcp.json and settings.json"
```

---

## Task 4: installer.js — dep checks, template substitution, shell execution

**Files:**
- Create: `cli/src/installer.js`
- Create: `cli/tests/installer.test.js`

- [ ] **Step 1: Write failing tests**

Create `cli/tests/installer.test.js`:

```js
import { substituteTemplates, checkBinary, BINARY_INSTALL_HINTS } from '../src/installer.js';

test('substituteTemplates replaces {project_name}', () => {
  const cmd = 'symdex index . --repo {project_name}';
  expect(substituteTemplates(cmd, 'myapp')).toBe('symdex index . --repo myapp');
});

test('substituteTemplates leaves string unchanged if no tokens', () => {
  const cmd = 'pip install symdex';
  expect(substituteTemplates(cmd, 'myapp')).toBe('pip install symdex');
});

test('checkBinary returns true for node (always present in test env)', async () => {
  const result = await checkBinary('node');
  expect(result).toBe(true);
});

test('checkBinary returns false for nonexistent binary', async () => {
  const result = await checkBinary('__definitely_not_a_real_binary__');
  expect(result).toBe(false);
});

test('BINARY_INSTALL_HINTS contains claude, pip, uvx', () => {
  expect(BINARY_INSTALL_HINTS).toHaveProperty('claude');
  expect(BINARY_INSTALL_HINTS).toHaveProperty('pip');
  expect(BINARY_INSTALL_HINTS).toHaveProperty('uvx');
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd cli && npm test -- --testPathPattern=installer
```

Expected: FAIL — `installer.js` not found.

- [ ] **Step 3: Implement `cli/src/installer.js`**

```js
import { execSync, spawnSync } from 'child_process';

export const BINARY_INSTALL_HINTS = {
  claude: 'https://claude.ai/code — install Claude Code',
  pip: 'https://pip.pypa.io/en/stable/installation/',
  uv: 'https://docs.astral.sh/uv/getting-started/installation/',
  uvx: 'https://docs.astral.sh/uv/getting-started/installation/',
};

export function substituteTemplates(command, projectName) {
  return command.replaceAll('{project_name}', projectName);
}

export async function checkBinary(name) {
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], {
    stdio: 'pipe',
  });
  return result.status === 0;
}

export async function runInstallSteps(steps, projectName) {
  const results = [];
  for (const step of steps) {
    const cmd = substituteTemplates(step.command, projectName);
    try {
      execSync(cmd, { stdio: 'pipe', cwd: process.cwd() });
      results.push({ cmd, ok: true });
    } catch (err) {
      results.push({ cmd, ok: false, stderr: err.stderr?.toString() ?? err.message });
    }
  }
  return results;
}

export async function getRequiredBinaries(components) {
  const binaryMap = {
    claude: ['plugin', 'hook'],
    pip: [],
    uvx: [],
  };
  // Derive from install_steps commands
  const needed = new Set();
  for (const c of components) {
    for (const step of c.install_steps) {
      const first = step.command.split(' ')[0];
      if (BINARY_INSTALL_HINTS[first]) needed.add(first);
    }
  }
  return [...needed];
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd cli && npm test -- --testPathPattern=installer
```

Expected: 5 passed, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add cli/src/installer.js cli/tests/installer.test.js
git commit -m "feat: installer dep checks, template substitution, shell execution"
```

---

## Task 5: init.js — interactive flow

**Files:**
- Create: `cli/src/init.js`

*(No unit tests — init.js is pure orchestration/UI. Covered by manual smoke test in Task 7.)*

- [ ] **Step 1: Implement `cli/src/init.js`**

```js
import checkbox from '@inquirer/checkbox';
import input from '@inquirer/input';
import path from 'path';
import { createRequire } from 'module';
import { fetchManifest } from './manifest.js';
import { applyConfigPatch } from './config.js';
import { runInstallSteps, checkBinary, BINARY_INSTALL_HINTS, getRequiredBinaries } from './installer.js';

const require = createRequire(import.meta.url);

function detectProjectName() {
  try {
    const pkg = require(path.join(process.cwd(), 'package.json'));
    if (pkg.name) return pkg.name;
  } catch {}
  return path.basename(process.cwd());
}

function groupByCategory(components) {
  const groups = {};
  for (const c of components) {
    groups[c.category] = groups[c.category] ?? [];
    groups[c.category].push(c);
  }
  return groups;
}

function printBanner() {
  console.log('\n  ╔══════════════════════════════════╗');
  console.log('  ║  ai-omega — Claude Code toolkit  ║');
  console.log('  ╚══════════════════════════════════╝\n');
}

export async function runInit({ force = false } = {}) {
  printBanner();

  process.stdout.write('  Fetching manifest... ');
  const manifest = await fetchManifest();

  if (manifest._usedFallback) {
    const version = manifest._bundled_version ?? 'unknown';
    console.log(`\n  ⚠ Could not fetch latest manifest. Falling back to pre-installed version (${version}).`);
    console.log('    For the latest components, visit https://github.com/NikhilThakur2001/ai_omegarepo\n');
  } else {
    console.log(`✓ (${manifest.components.length} components)\n`);
  }

  const projectName = await input({
    message: 'Project name:',
    default: detectProjectName(),
  });

  const groups = groupByCategory(manifest.components);
  const choices = [];
  for (const [category, components] of Object.entries(groups)) {
    choices.push({ type: 'separator', separator: `\n── ${category.toUpperCase()} ──` });
    for (const c of components) {
      choices.push({
        name: `${c.name.padEnd(20)} ${c.description}`,
        value: c.id,
        checked: c.recommended === true,
      });
    }
  }

  const selected = await checkbox({
    message: 'Select components to install:',
    choices,
    pageSize: 20,
  });

  if (selected.length === 0) {
    console.log('\n  Nothing selected. Exiting.');
    return;
  }

  const selectedComponents = manifest.components.filter(c => selected.includes(c.id));

  // Dep check
  const needed = await getRequiredBinaries(selectedComponents);
  const missing = [];
  for (const bin of needed) {
    const ok = await checkBinary(bin);
    if (!ok) missing.push(bin);
  }
  if (missing.length) {
    console.log('\n  ⚠ Missing required tools:');
    for (const bin of missing) {
      console.log(`    • ${bin} — ${BINARY_INSTALL_HINTS[bin] ?? 'install manually'}`);
    }
    console.log('\n  **It is strongly recommended to install all required tools before running ai-omega init.**');
    console.log('  Skipping components that depend on missing tools.\n');
  }

  console.log('');
  const results = { ok: [], failed: [], skipped: [] };

  for (const c of selectedComponents) {
    const requiresMissing = c.install_steps.some(s => missing.includes(s.command.split(' ')[0]));
    if (requiresMissing) {
      console.log(`  ${c.name.padEnd(24)} ⚠ skipped (missing dependency)`);
      results.skipped.push(c.id);
      continue;
    }

    process.stdout.write(`  ${c.name.padEnd(24)} `);
    const stepResults = await runInstallSteps(c.install_steps, projectName);
    const failed = stepResults.filter(r => !r.ok);

    if (failed.length) {
      console.log('✗ failed');
      failed.forEach(r => console.log(`    stderr: ${r.stderr}`));
      results.failed.push(c.id);
      continue;
    }

    applyConfigPatch(process.cwd(), c.config_patch, force);
    console.log('✓');
    results.ok.push(c.id);
  }

  console.log('\n  ✓ Done.');
  if (results.failed.length) {
    console.log(`  ${results.failed.length} failed: ${results.failed.join(', ')}`);
    console.log('  Re-run ai-omega init to retry failed components.');
  }
  console.log('  Restart Claude Code to activate.\n');
}
```

- [ ] **Step 2: Commit**

```bash
git add cli/src/init.js
git commit -m "feat: interactive init flow"
```

---

## Task 6: omega.manifest.json — full manifest

**Files:**
- Create: `omega.manifest.json` (repo root)
- Update: `cli/src/bundled-manifest.json`

- [ ] **Step 1: Create `omega.manifest.json` at repo root**

```json
{
  "version": "1",
  "components": [
    {
      "id": "lean-ctx",
      "name": "lean-ctx MCP",
      "description": "Token-efficient context server. Replaces Read/Grep/Shell.",
      "category": "mcp",
      "recommended": true,
      "install_steps": [],
      "config_patch": {
        "mcp": {
          "lean-ctx": {
            "type": "stdio",
            "command": "lean-ctx",
            "args": [],
            "env": {}
          }
        }
      }
    },
    {
      "id": "symdex",
      "name": "Symdex MCP",
      "description": "Codebase indexer. Symbol search, call graphs, routes.",
      "category": "mcp",
      "recommended": true,
      "install_steps": [
        { "type": "shell", "command": "pip install \"symdex[local]\"" },
        { "type": "shell", "command": "symdex index . --repo {project_name}" }
      ],
      "config_patch": {
        "mcp": {
          "symdex": {
            "type": "stdio",
            "command": "uvx",
            "args": ["symdex", "serve"],
            "env": { "SYMDEX_STATE_DIR": ".symdex" }
          }
        }
      }
    },
    {
      "id": "superpowers",
      "name": "Superpowers",
      "description": "TDD, debugging, brainstorming, code review, plan writing/execution skills.",
      "category": "plugin",
      "recommended": true,
      "install_steps": [
        { "type": "shell", "command": "claude plugin install superpowers@claude-plugins-official" }
      ],
      "config_patch": {
        "settings": {
          "enabledPlugins": { "superpowers@claude-plugins-official": true }
        }
      }
    },
    {
      "id": "claude-mem",
      "name": "claude-mem",
      "description": "Persistent memory across Claude sessions.",
      "category": "plugin",
      "recommended": true,
      "install_steps": [
        { "type": "shell", "command": "claude plugin install claude-mem@thedotmack" }
      ],
      "config_patch": {
        "settings": {
          "enabledPlugins": { "claude-mem@thedotmack": true }
        }
      }
    },
    {
      "id": "caveman",
      "name": "caveman",
      "description": "Ultra-compressed communication mode. ~75% token reduction.",
      "category": "plugin",
      "recommended": true,
      "install_steps": [
        { "type": "shell", "command": "claude plugin install caveman@caveman" }
      ],
      "config_patch": {
        "settings": {
          "enabledPlugins": { "caveman@caveman": true },
          "extraKnownMarketplaces": {
            "caveman": {
              "source": { "source": "github", "repo": "JuliusBrussee/caveman" }
            }
          }
        }
      }
    },
    {
      "id": "ui-ux-pro-max",
      "name": "ui-ux-pro-max",
      "description": "UI/UX design intelligence — 67 styles, 161 palettes, component design.",
      "category": "plugin",
      "recommended": false,
      "install_steps": [
        { "type": "shell", "command": "claude plugin install ui-ux-pro-max@ui-ux-pro-max-skill" }
      ],
      "config_patch": {
        "settings": {
          "enabledPlugins": { "ui-ux-pro-max@ui-ux-pro-max-skill": true }
        }
      }
    },
    {
      "id": "graphify",
      "name": "graphify hook",
      "description": "Knowledge graph checks before file searches.",
      "category": "hook",
      "recommended": false,
      "install_steps": [],
      "config_patch": {
        "settings": {
          "hooks": {
            "PreToolUse": [
              {
                "matcher": "Glob|Grep",
                "hooks": [
                  {
                    "type": "command",
                    "command": "[ -f graphify-out/graph.json ] && echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"additionalContext\":\"graphify: Knowledge graph exists. Read graphify-out/GRAPH_REPORT.md before searching raw files.\"}}' || true"
                  }
                ]
              }
            ]
          }
        }
      }
    }
  ]
}
```

- [ ] **Step 2: Copy manifest to bundled fallback**

```bash
cp omega.manifest.json cli/src/bundled-manifest.json
```

Then update `_bundled` fields at top of `cli/src/bundled-manifest.json`:

```json
{
  "version": "1",
  "_bundled": true,
  "_bundled_version": "0.1.0",
  "components": [...]
}
```

- [ ] **Step 3: Commit**

```bash
git add omega.manifest.json cli/src/bundled-manifest.json
git commit -m "feat: full omega.manifest.json with all 7 components"
```

---

## Task 7: Smoke test + fix .claude/settings.json hook merge

**Files:**
- Modify: `cli/src/config.js` (add hook merge support)
- Modify: `cli/tests/config.test.js` (add hook merge test)

The graphify hook patches `settings.hooks.PreToolUse` — a nested array. `mergeSettings` currently only handles `enabledPlugins`. We need to handle `hooks` too.

- [ ] **Step 1: Add failing test for hook merge**

Append to `cli/tests/config.test.js`:

```js
test('mergeSettings merges hooks.PreToolUse array additively', () => {
  const existing = { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [] }] } };
  const patch = { hooks: { PreToolUse: [{ matcher: 'Glob|Grep', hooks: [] }] } };
  const result = mergeSettings(existing, patch, false);
  expect(result.hooks.PreToolUse).toHaveLength(2);
  expect(result.skipped).toEqual([]);
});

test('mergeSettings skips duplicate hook matcher when force=false', () => {
  const existing = { hooks: { PreToolUse: [{ matcher: 'Glob|Grep', hooks: [] }] } };
  const patch = { hooks: { PreToolUse: [{ matcher: 'Glob|Grep', hooks: [] }] } };
  const result = mergeSettings(existing, patch, false);
  expect(result.hooks.PreToolUse).toHaveLength(1);
  expect(result.skipped).toContain('hook:PreToolUse:Glob|Grep');
});
```

- [ ] **Step 2: Run tests — verify new tests fail**

```bash
cd cli && npm test -- --testPathPattern=config
```

Expected: 2 new tests FAIL.

- [ ] **Step 3: Update `mergeSettings` in `cli/src/config.js` to handle hooks**

Replace the `mergeSettings` function:

```js
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
```

- [ ] **Step 4: Run all tests — verify they pass**

```bash
cd cli && npm test
```

Expected: all tests pass.

- [ ] **Step 5: Manual smoke test**

```bash
cd /tmp && mkdir smoke-test && cd smoke-test
node /path/to/ai_omegarepo/cli/src/index.js init
```

Select `lean-ctx` only. Verify:
- `.mcp.json` created with `mcpServers.lean-ctx`
- `.claude/settings.json` NOT created (no settings patch for lean-ctx)
- Re-run: prints `skipping lean-ctx (already configured)`

- [ ] **Step 6: Commit**

```bash
git add cli/src/config.js cli/tests/config.test.js
git commit -m "feat: hook and marketplace merge in settings.json"
```

---

## Task 8: npm publish setup

**Files:**
- Modify: `cli/package.json` (add publishConfig, repository, keywords)
- Create: `cli/.npmignore`

- [ ] **Step 1: Update `cli/package.json` publish fields**

Add to `cli/package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/NikhilThakur2001/ai_omegarepo"
  },
  "keywords": ["claude", "claude-code", "ai", "mcp", "toolkit"],
  "license": "MIT",
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 2: Create `cli/.npmignore`**

```
tests/
*.test.js
```

- [ ] **Step 3: Dry-run publish to verify package contents**

```bash
cd cli && npm publish --dry-run
```

Expected: lists `src/` files only, no `tests/`, no `node_modules/`.

- [ ] **Step 4: Commit**

```bash
git add cli/package.json cli/.npmignore
git commit -m "chore: npm publish config"
```

---

## Task 9: README for cli/

**Files:**
- Create: `cli/README.md`

- [ ] **Step 1: Create `cli/README.md`**

```markdown
# ai-omega

Interactive Claude Code toolkit installer.

## Install

```bash
npm install -g ai-omega
```

## Usage

Run in your project root:

```bash
ai-omega init
```

Fetches the latest component manifest, lets you pick what to install, then writes `.mcp.json` and `.claude/settings.json`. Safe to re-run — existing config is never overwritten unless you pass `--force`.

## Options

| Flag | Effect |
|------|--------|
| `--force` | Overwrite existing config keys |

## Adding components

Edit `omega.manifest.json` in the repo root and push to `main`. No CLI release needed — users get new components on their next `ai-omega init`.

## Node version

Requires Node 18+.
```

- [ ] **Step 2: Commit**

```bash
git add cli/README.md
git commit -m "docs: cli README"
```

---

## Self-Review Notes

- All 4 spec sections covered: architecture (Tasks 1-5), manifest format (Task 6), CLI flow (Task 5), error handling (Tasks 2, 3, 4, 7)
- `extraKnownMarketplaces` merge needed for caveman plugin — covered in Task 7
- `SYMDEX_STATE_DIR` env var removed from symdex install step (was env var syntax, not cross-platform in shell step) — config_patch sets it on the MCP server instead ✓
- No TBDs or placeholders remaining
