// npm run build:yandex-lead — the lead endpoint as one Yandex Cloud Function.
//
// yandex/lead/index.ts (+ server/lead/) → yandex/lead-dist/index.js, one
// CommonJS file for Node.js 22 with no runtime dependencies, and
// yandex/lead-dist/lead.zip with that file at its root, for direct upload
// (beside it a package.json that pins CommonJS, whatever surrounds the file).
// Entry point in Yandex: index.handler. Secrets are NOT in the bundle — the
// function reads them from its environment (Lockbox).
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'yandex/lead-dist');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [resolve(root, 'yandex/lead/index.ts')],
  outfile: resolve(out, 'index.js'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  legalComments: 'none',
  logLevel: 'warning',
});

writeFileSync(resolve(out, 'package.json'), `${JSON.stringify({ type: 'commonjs' })}\n`);

execFileSync('zip', [
  '-q',
  '-X',
  '-j',
  resolve(out, 'lead.zip'),
  ...['index.js', 'package.json'].map((f) => resolve(out, f)),
]);

const kb = (file) => `${(statSync(resolve(out, file)).size / 1024).toFixed(1)} KB`;
console.log(`yandex/lead-dist/index.js  ${kb('index.js')}`);
console.log(
  `yandex/lead-dist/lead.zip  ${kb('lead.zip')}  — entry point: index.handler (Node.js 22)`,
);
