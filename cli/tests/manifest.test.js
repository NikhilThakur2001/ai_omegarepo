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
