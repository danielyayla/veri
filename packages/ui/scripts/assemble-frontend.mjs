// Assemble the frontend Tauri serves (WO-073): renderer/ (index.html,
// stylesheets, fonts, shim.js — the only shell-specific file) plus the
// esbuild bundle, flattened into dist/frontend/ so every reference is a
// sibling. The renderer bundle itself ships byte-identical (SRC-038).
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(pkgDir, 'dist', 'frontend');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(pkgDir, 'renderer'), out, { recursive: true });
cpSync(join(pkgDir, 'dist', 'renderer', 'app.bundle.js'), join(out, 'app.bundle.js'));
console.log(`assemble-frontend: ${out} ready`);
