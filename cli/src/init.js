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
    console.log('\n  It is strongly recommended to install all required tools before running ai-omega init.');
    console.log('  Skipping components that depend on missing tools.\n');
  }

  console.log('');
  const results = { ok: [], failed: [], skipped: [] };

  for (const c of selectedComponents) {
    const requiresMissing = c.install_steps.some(s => {
      const first = s.command.trim().split(/\s+/)[0];
      return BINARY_INSTALL_HINTS[first] && missing.includes(first);
    });
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

    try {
      applyConfigPatch(process.cwd(), c.config_patch, force);
      console.log('✓');
      results.ok.push(c.id);
    } catch (err) {
      console.log(`✗ config patch failed: ${err.message}`);
      results.failed.push(c.id);
    }
  }

  const allFailed = results.ok.length === 0 && results.failed.length > 0;
  if (allFailed) {
    console.log(`\n  ✗ All components failed.`);
    console.log(`  Failed: ${results.failed.join(', ')}`);
    console.log('  Re-run ai-omega init to retry.');
  } else {
    console.log('\n  ✓ Done.');
    if (results.failed.length) {
      console.log(`  ${results.failed.length} failed: ${results.failed.join(', ')}`);
      console.log('  Re-run ai-omega init to retry failed components.');
    }
    console.log('  Restart Claude Code to activate.\n');
  }
}
