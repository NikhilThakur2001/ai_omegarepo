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
  } catch (err) {
    console.warn(`[manifest] fetch failed (${err.message}), using bundled fallback`);
    return applyFallback();
  }
}
