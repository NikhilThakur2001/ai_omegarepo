# ai-omega CLI — Design Spec

**Date:** 2026-04-18  
**Status:** Approved  
**Target:** Public open-source CLI for bootstrapping Claude Code dev environments

---

## Overview

`ai-omega` is a Node.js CLI that sets up a curated Claude Code toolkit on any project with a single interactive command. It fetches a manifest from this repo, presents components grouped by category, installs selected ones, and merges config into `.mcp.json` and `.claude/settings.json`.

---

## Architecture

```
ai_omegarepo/
├── omega.manifest.json          ← hosted in repo, fetched fresh each run
├── cli/
│   ├── package.json             ← name: "ai-omega", bin: "ai-omega"
│   └── src/
│       ├── index.js             ← entry point, parses commands
│       ├── init.js              ← interactive init flow
│       ├── manifest.js          ← fetch + validate manifest from GitHub raw URL
│       ├── installer.js         ← executes install_steps[] per component
│       └── config.js            ← merges config_patch into .mcp.json / settings.json
```

**Flow:**
```
ai-omega init
    │
    ▼
fetch omega.manifest.json (raw GitHub URL, main branch)
    │
    ▼
interactive prompt — components grouped by category, user toggles
    │
    ▼
for each selected component:
    run install_steps[] (shell commands)
    merge config_patch into .mcp.json / .claude/settings.json
    │
    ▼
print summary → "Restart Claude Code to activate."
```

**Install:** `npm install -g ai-omega`  
**Usage:** `ai-omega init` (run in project root)

---

## Manifest Format (`omega.manifest.json`)

```json
{
  "version": "1",
  "components": [
    {
      "id": "lean-ctx",
      "name": "lean-ctx MCP",
      "description": "Token-efficient context server. Replaces Read/Grep/Shell with compressed equivalents.",
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
      "description": "Codebase indexer. Symbol search, call graphs, routes. 7500→200 tokens per lookup.",
      "category": "mcp",
      "recommended": true,
      "install_steps": [
        { "type": "shell", "command": "pip install \"symdex[local]\"" },
        { "type": "shell", "command": "SYMDEX_STATE_DIR=.symdex symdex index . --repo {project_name}" }
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
      "name": "Superpowers plugin",
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
    }
  ]
}
```

**Schema rules:**
- `config_patch.mcp` → merged into `.mcp.json` under `mcpServers`
- `config_patch.settings` → merged into `.claude/settings.json`
- `install_steps[].type` → `shell` for now; extensible to typed `npm`/`pip` variants
- `{project_name}` → template variable substituted from `package.json` name or cwd folder name
- `recommended: true` → pre-selected in prompt; others default off

---

## CLI Interactive Flow

```
$ ai-omega init

  ╔══════════════════════════════════╗
  ║  ai-omega — Claude Code toolkit  ║
  ╚══════════════════════════════════╝

  Fetching manifest... ✓ (12 components)

  Project name: [ai_omegarepo]

  ┌ MCP Servers ──────────────────────────────┐
  │ ◉ lean-ctx       Token-efficient context   │
  │ ◉ symdex         Codebase indexer          │
  └───────────────────────────────────────────┘

  ┌ Plugins ──────────────────────────────────┐
  │ ◉ superpowers    Skills library            │
  │ ◉ claude-mem     Persistent memory         │
  │ ◉ caveman        Compressed comms mode     │
  │ ○ ui-ux-pro-max  UI/UX design skills       │
  └───────────────────────────────────────────┘

  ┌ Hooks ────────────────────────────────────┐
  │ ○ graphify       Knowledge graph checks   │
  └───────────────────────────────────────────┘

  Install 5 components? (Y/n)

  Installing lean-ctx...       ✓
  Installing symdex...         ✓ (indexed 47 files)
  Installing superpowers...    ✓
  Installing claude-mem...     ✓
  Installing caveman...        ✓

  Written: .mcp.json
  Written: .claude/settings.json

  ✓ Done. Restart Claude Code to activate.
```

**UX decisions:**
- `◉` = recommended (pre-selected), `○` = optional (default off)
- Arrow keys + space to toggle, Enter to confirm — uses `@inquirer/checkbox`
- Grouped by category (`mcp`, `plugin`, `hook`)
- Project name auto-detected from `package.json` name or cwd, shown as editable default
- Re-running is safe — config merge is additive, never overwrites existing keys

---

## Error Handling

### Missing dependencies
- CLI checks for required binaries (`claude`, `pip`/`uv`, `uvx`) before install begins
- Missing dep → warn with install link, skip that component, continue others
- **It is strongly recommended to install all required tools before running `ai-omega init` for the best experience.**

### Manifest fetch failure
- Network down → fall back to last bundled manifest version shipped with the CLI
- Always print: `⚠ Could not fetch latest manifest. Falling back to pre-installed version (X.Y.Z). For the latest components, visit github.com/<repo>.`
- No silent fallback — user always knows they're on stale manifest

### Config merge conflicts
- Key already exists in `.mcp.json` or `.claude/settings.json` → skip, print: `lean-ctx already configured, skipping`
- `--force` flag available to overwrite existing config for clean reset

### Install step failures
- Shell command exits non-zero → print stderr, mark component failed, continue remaining
- Summary at end: `2 failed, 3 succeeded` with rerun hint

### Missing `.claude/` directory
- CLI creates it automatically via `mkdir -p .claude`

### Cross-platform paths
- `path.join` everywhere — no hardcoded separators
- Writes to project-local `.claude/` only, not global Claude config

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `@inquirer/checkbox` | Interactive multi-select prompt |
| `@inquirer/input` | Project name prompt |
| `node-fetch` / native `fetch` | Manifest fetch (Node 18+) |

Node 18+ required (native fetch). No other runtime dependencies.

---

## Publishing

- npm package name: `ai-omega`
- Global install: `npm install -g ai-omega`
- Manifest always fetched from: `https://raw.githubusercontent.com/NikhilThakur2001/ai_omegarepo/main/omega.manifest.json`
- Adding new components: push to `omega.manifest.json` on `main` — no CLI release needed
