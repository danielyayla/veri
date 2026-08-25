// Stage the sidecar's runtime tree (WO-073): everything the bundled Node
// needs at Resources/sidecar inside the installed app — the compiled
// sidecar + lib, and a real (symlink-free) node_modules closure of the
// runtime dependencies. Real files, not an archive: the app writes the path
// of @verikb/mcp's server.js into .mcp.json for agent clients to run with the
// user's plain `node`, and @verikb/cli scaffolds from real demo files — the
// same constraint that kept asar disabled under Electron (DEC-028).
//
//   node scripts/stage-sidecar.mjs
//
// Output: src-tauri/sidecar-stage/ (gitignored), mapped to Resources/sidecar
// by tauri.conf.json's bundle.resources.
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Path containment must hold on Windows too (WO-092), where join/realpath
    produce backslashes: compare on the native separator. */
const within = (path, base) => path.startsWith(`${base}${sep}`);

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..');
const stage = join(pkgDir, 'src-tauri', 'sidecar-stage');

// The sidecar's direct bare imports; the walk below adds everything they
// declare, transitively, resolved exactly as Node would from this package.
const ROOTS = ['@verikb/core', '@verikb/cli', '@verikb/mcp'];

/** Node's node_modules walk-up, minus exports-map interference: we want the
    package directory itself, not what its entry map exposes. */
function resolvePackageDir(name, fromDir) {
  let dir = fromDir;
  for (;;) {
    const candidate = join(dir, 'node_modules', name);
    if (existsSync(join(candidate, 'package.json'))) return realpathSync(candidate);
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`cannot resolve ${name} from ${fromDir}`);
    dir = parent;
  }
}

const found = new Map(); // name -> real package dir (top level of the stage)
const queue = ROOTS.map((name) => ({ name, fromDir: pkgDir }));
while (queue.length > 0) {
  const { name, fromDir } = queue.shift();
  const dir = resolvePackageDir(name, fromDir);
  const seen = found.get(name);
  if (seen !== undefined) {
    if (seen === dir) continue;
    // A second copy of the same name: fine when it is nested inside a
    // package already staged — packages copy with their own node_modules
    // below, so Node resolves the nested copy exactly as it does here.
    // Two competing top-level copies would silently break resolution.
    if ([...found.values()].some((base) => within(dir, base))) continue;
    throw new Error(`version conflict for ${name}: ${seen} vs ${dir}`);
  }
  if ([...found.values()].some((base) => within(dir, base))) continue; // ships with its parent
  found.set(name, dir);
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  for (const dep of Object.keys(pkg.dependencies ?? {})) queue.push({ name: dep, fromDir: dir });
  // optionalDependencies that resolved get bundled too; missing ones are
  // optional by definition and skipped.
  for (const dep of Object.keys(pkg.optionalDependencies ?? {})) {
    try {
      resolvePackageDir(dep, dir);
      queue.push({ name: dep, fromDir: dir });
    } catch {
      /* optional and absent */
    }
  }
}

rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

// The compiled sidecar and its lib/ imports. The renderer's compiled output
// ships separately (dist/frontend via assemble-frontend.mjs), and tests
// never ship.
cpSync(join(pkgDir, 'dist'), join(stage, 'dist'), {
  recursive: true,
  filter: (src) => !src.includes(`${sep}dist${sep}renderer`) && !/\.test\.[^/\\]+$/.test(src),
});

// Nearest-package.json context for dist/**/*.js: ESM, like the sources.
const ownPkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
writeFileSync(
  join(stage, 'package.json'),
  JSON.stringify({ name: ownPkg.name, version: ownPkg.version, type: 'module', private: true }, null, 2),
);

let total = 0;
for (const [name, dir] of [...found.entries()].sort()) {
  const dest = join(stage, 'node_modules', name);
  mkdirSync(dirname(dest), { recursive: true });
  // Dereference: workspace packages are symlinks in node_modules, and the
  // bundle must carry real files. Nested node_modules ride along — they are
  // the version overrides Node resolved here and must resolve identically
  // inside the bundle.
  cpSync(dir, dest, {
    recursive: true,
    dereference: true,
    filter: (src) => !src.includes(`${sep}.git${sep}`),
  });
  total += 1;
}
console.log(`stage-sidecar: ${total} packages staged into ${stage}`);
