import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import type { ImportEdge, ModuleEntry } from '@veri/core';

/**
 * The CLI's observed-imports collector (WO-067): the collectGitFacts shape
 * (DEC-040) applied to the codebase — this is the one place the CLI reads
 * source trees, and core compares the resulting edges against the compiled
 * intended architecture. Extraction is deliberately a v1 line heuristic
 * (the design gate's body-mention tier, not a compiler): static
 * import/require/export-from specifiers, resolved to registry modules by
 * package name from each module path's manifest, or by relative paths that
 * cross a module-path boundary. Anything unresolvable is skipped, never
 * guessed. A module path absent from disk is a skip, never a failure.
 */
export interface ImportFactsResult {
  edges: ImportEdge[];
  /** Registry modules whose path is not a directory on disk. */
  skipped: ModuleEntry[];
}

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);

// Static forms only: `import … from 'x'` / `import 'x'`, `export … from 'x'`,
// `require('x')`. Dynamic import() is out of WO-067's scope.
const SPECIFIER_RES = [
  /\bimport\s*(?:[\w*\s{},$]+?from\s*)?["']([^"'\n]+)["']/g,
  /\bexport\s+[\w*\s{},$]+?from\s*["']([^"'\n]+)["']/g,
  /\brequire\(\s*["']([^"'\n]+)["']\s*\)/g,
];

/** Source files under `dir`, depth-first in byte order — deterministic walk.
    node_modules and dot-directories are vendored/hidden, never the module's
    own code; symlinks are not followed. */
function walk(dir: string, files: string[]): void {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) files.push(full);
  }
}

export function collectImportFacts(cwd: string, modules: ModuleEntry[]): ImportFactsResult {
  const roots: Array<{ entry: ModuleEntry; root: string }> = [];
  const skipped: ModuleEntry[] = [];
  for (const entry of modules) {
    const root = resolve(cwd, entry.path);
    if (existsSync(root) && statSync(root).isDirectory()) roots.push({ entry, root });
    else skipped.push(entry);
  }

  // Package-name → module, from each module path's manifest. Longest name
  // first so a nested-scope name wins over a prefix of itself.
  const packageNames: Array<{ name: string; module: string }> = [];
  for (const { entry, root } of roots) {
    const manifest = join(root, 'package.json');
    if (!existsSync(manifest)) continue;
    try {
      const parsed = JSON.parse(readFileSync(manifest, 'utf8')) as { name?: unknown };
      if (typeof parsed.name === 'string' && parsed.name !== '') {
        packageNames.push({ name: parsed.name, module: entry.name });
      }
    } catch {
      // An unreadable manifest just means no package-name mapping for this
      // module — relative crossings still resolve.
    }
  }
  packageNames.sort((a, b) => b.name.length - a.name.length);

  // Which module owns an absolute path — longest path prefix wins, so a
  // nested module path claims its own files from an enclosing one.
  const moduleOf = (abs: string): string | undefined => {
    let best: { module: string; length: number } | undefined;
    for (const { entry, root } of roots) {
      if ((abs === root || abs.startsWith(root + sep)) && (best === undefined || root.length > best.length)) {
        best = { module: entry.name, length: root.length };
      }
    }
    return best?.module;
  };

  const resolveSpecifier = (specifier: string, file: string): string | undefined => {
    if (specifier.startsWith('.')) return moduleOf(resolve(dirname(file), specifier));
    const hit = packageNames.find((pkg) => specifier === pkg.name || specifier.startsWith(pkg.name + '/'));
    return hit?.module;
  };

  const edges: ImportEdge[] = [];
  const seen = new Set<string>();
  for (const { root } of roots) {
    const files: string[] = [];
    walk(root, files);
    for (const file of files) {
      // Ownership by longest prefix, not by which walk found the file —
      // nested module paths get walked twice and must attribute once.
      const from = moduleOf(file)!;
      const text = readFileSync(file, 'utf8');
      for (const line of text.split('\n')) {
        for (const re of SPECIFIER_RES) {
          for (const match of line.matchAll(re)) {
            const specifier = match[1];
            const to = resolveSpecifier(specifier, file);
            if (to === undefined || to === from) continue;
            const relFile = relative(cwd, file).split(sep).join('/');
            const key = `${from}\x00${to}\x00${relFile}\x00${specifier}`;
            if (seen.has(key)) continue;
            seen.add(key);
            edges.push({ from, to, file: relFile, specifier });
          }
        }
      }
    }
  }
  return { edges, skipped };
}
