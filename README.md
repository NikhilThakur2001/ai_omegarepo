# ai_omegarepo

Include the best skills and aim at making the development process on a project as efficient as possible.

---

## MCP Servers

### Project-level (`.mcp.json`)

| Server | Purpose |
|--------|---------|
| **lean-ctx** | Lightweight context server — provides minimal/lean context to Claude for token efficiency |

### Plugin-injected MCPs

| Server | From Plugin | Purpose |
|--------|-------------|---------|
| **mcp-search** | `claude-mem` (thedotmack) | Semantic search over past Claude sessions via a bun-based MCP server |

---

## Enabled Plugins (`.claude/settings.json`)

| Plugin | Marketplace | What it does |
|--------|-------------|--------------|
| **superpowers** | `claude-plugins-official` | Core skills library — TDD, debugging, brainstorming, code review, git worktrees, parallel agents, plan writing/execution, verification workflows |
| **claude-mem** | `thedotmack` | Persistent memory across sessions — preserves context via hooks + MCP search |
| **ui-ux-pro-max** | `ui-ux-pro-max-skill` | UI/UX design intelligence — 67 styles, 161 palettes, component design for React/Next/Vue/Svelte/Flutter/SwiftUI etc. |
| **caveman** | `caveman` | Ultra-compressed communication mode — cuts ~75% token usage while keeping technical accuracy |

---

## Superpowers Marketplace (available to install)

These live in the superpowers marketplace and can be installed via `claude plugin install`:

| Plugin | Purpose |
|--------|---------|
| **superpowers-chrome** | Chrome DevTools Protocol access — browser automation via skills or MCP |
| **elements-of-style** | Writing guidance based on Strunk's style rules |
| **episodic-memory** | Semantic search over past conversations with local AI embeddings |
| **superpowers-lab** | Experimental: tmux automation, MCP discovery, Slack messaging, Windows VM |
| **superpowers-developing-for-claude-code** | Skills/docs for building Claude Code plugins and MCP servers |
| **claude-session-driver** | Launch and control other Claude sessions as workers via tmux |
| **private-journal-mcp** | Private journaling with semantic search |
| **double-shot-latte** | Stops "Would you like me to continue?" — auto-evaluates whether to keep working |

---

## Hooks (auto-wired by plugins)

| Hook | Trigger | Effect |
|------|---------|--------|
| **graphify check** | PreToolUse on Glob/Grep | Reminds to read knowledge graph before raw file searches |
| **caveman-activate** | SessionStart | Loads caveman compression mode |
| **caveman-mode-tracker** | UserPromptSubmit | Tracks whether caveman mode is on/off |
