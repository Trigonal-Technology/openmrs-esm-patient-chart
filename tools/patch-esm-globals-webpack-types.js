#!/usr/bin/env node
/**
 * Webpack 5.105+ ships `declare const __webpack_share_scopes__` and
 * `declare var __webpack_init_sharing__` in webpack/module.d.ts.
 * @openmrs/esm-globals declares the same names inside `declare global`, which
 * causes TS2451 when fork-ts-checker pulls both into one program.
 * Re-run after `yarn install` when @openmrs/esm-globals is refreshed.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const target = path.join(root, 'node_modules', '@openmrs', 'esm-globals', 'src', 'types.ts');

if (!fs.existsSync(target)) {
  console.warn('[patch-esm-globals-webpack-types] types.ts not found, skip');
  process.exit(0);
}

const before = fs.readFileSync(target, 'utf8');
const needle = `declare global {
  const __webpack_share_scopes__: Record<
    string,
    Record<string, { loaded?: 1; get: () => Promise<unknown>; from: string; eager: boolean }>
  >;

  // eslint-disable-next-line no-var
  var __webpack_init_sharing__: (scope: string) => Promise<void>;

`;

if (!before.includes(needle)) {
  if (!before.includes('__webpack_share_scopes__')) {
    console.log('[patch-esm-globals-webpack-types] already patched or unexpected layout, skip');
  } else {
    console.warn('[patch-esm-globals-webpack-types] could not match block to remove, skip');
  }
  process.exit(0);
}

const after = before.replace(needle, 'declare global {\n');
fs.writeFileSync(target, after, 'utf8');
console.log('[patch-esm-globals-webpack-types] Removed duplicate __webpack_* globals (webpack 5.105+ provides them)');
