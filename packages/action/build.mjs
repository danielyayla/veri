// Bundle the runner into the committed action entry (WO-076). GitHub fetches
// an action's repo without installing anything, so the bundle at
// action/dist/index.js is what actually runs — CI verifies it matches source.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: '../../action/dist/index.js',
  // ESM bundles lose CommonJS's implicit require; some transitive deps call
  // it at runtime, so hand them a real one.
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  legalComments: 'none',
  logLevel: 'warning',
});
