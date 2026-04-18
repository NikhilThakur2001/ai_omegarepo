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
  const isWin = process.platform === 'win32';
  const result = spawnSync(isWin ? 'where' : 'which', [name], {
    stdio: 'pipe',
    shell: isWin,
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
  const needed = new Set();
  for (const c of components) {
    for (const step of c.install_steps) {
      const first = step.command.trim().split(/\s+/)[0];
      if (BINARY_INSTALL_HINTS[first]) needed.add(first);
    }
  }
  return [...needed];
}
