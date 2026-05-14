#!/usr/bin/env node
/**
 * openmrs develop puts webpack MF URLs as http://localhost:<port>/...
 * On macOS, localhost often resolves to IPv6 first while webpack-dev-server is IPv4-only.
 * Re-run after `yarn install` when node_modules/openmrs is refreshed.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = [
  path.join(root, 'node_modules', 'openmrs', 'dist', 'utils', 'importmap.js'),
  path.join(root, 'node_modules', 'openmrs', 'src', 'utils', 'importmap.ts'),
];

function patchContent(content) {
  let c = content;
  // Newer openmrs (optional chaining default)
  c = c.split('?? `http://localhost:${port}`').join('?? `http://127.0.0.1:${port}`');
  // Older / compiled: const host = `http://localhost:${port}`;
  c = c.split('`http://localhost:${port}`').join('`http://127.0.0.1:${port}`');
  return c;
}

for (const file of files) {
  if (!fs.existsSync(file)) {
    continue;
  }
  const rel = path.relative(root, file);
  const before = fs.readFileSync(file, 'utf8');
  const after = patchContent(before);
  if (after === before) {
    continue;
  }
  fs.writeFileSync(file, after, 'utf8');
  console.log(`[patch-openmrs-localhost-mf] Patched ${rel}`);
}
