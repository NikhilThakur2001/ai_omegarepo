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

## Components

| ID | Category | Default |
|----|----------|---------|
| symdex | mcp | ✓ |
| superpowers | plugin | ✓ |
| claude-mem | plugin | ✓ |
| caveman | plugin | ✓ |
| ui-ux-pro-max | plugin | — |
| graphify | hook | — |

## Options

| Flag | Effect |
|------|--------|
| `--force` | Overwrite existing config keys |

## Adding components

Edit `omega.manifest.json` in the repo root and push to `main`. No CLI release needed — users get new components on their next `ai-omega init`.

## Requirements

- Node 18+
- `claude` CLI (for plugin components)
- `pip` / `uvx` (for MCP components)
