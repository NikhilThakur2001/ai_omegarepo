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
