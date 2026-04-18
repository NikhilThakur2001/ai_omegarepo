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
