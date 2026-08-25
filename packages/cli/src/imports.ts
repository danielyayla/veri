import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import type { ImportEdge, ModuleEntry } from '@verikb/core';

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
  /** Per-file scan detail (WO-068): every scanned source file with the
      static import specifiers it contains — the same walk and line
      heuristic as `edges`, kept whole so the desktop app's contents
      drill-down (module → directory → file → imports) never rescans.
      `file` is cwd-relative with forward slashes; specifiers are as
      written, deduplicated per file in first-seen order. */
  files: ModuleFileFact[];
}

export interface ModuleFileFact {
  module: string;
  file: string;
  imports: string[];
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
  const fileFacts: ModuleFileFact[] = [];
  const seenFiles = new Set<string>();
  for (const { root } of roots) {
    const files: string[] = [];
    walk(root, files);
    for (const file of files) {
      // Ownership by longest prefix, not by which walk found the file —
      // nested module paths get walked twice and must attribute once.
      const from = moduleOf(file)!;
      const relFile = relative(cwd, file).split(sep).join('/');
      const firstVisit = !seenFiles.has(relFile);
      seenFiles.add(relFile);
      const specifiers: string[] = [];
      const text = readFileSync(file, 'utf8');
      for (const line of text.split('\n')) {
        for (const re of SPECIFIER_RES) {
          for (const match of line.matchAll(re)) {
            const specifier = match[1];
            if (firstVisit && !specifiers.includes(specifier)) specifiers.push(specifier);
            const to = resolveSpecifier(specifier, file);
            if (to === undefined || to === from) continue;
            const key = `${from}\x00${to}\x00${relFile}\x00${specifier}`;
            if (seen.has(key)) continue;
            seen.add(key);
            edges.push({ from, to, file: relFile, specifier });
          }
        }
      }
      if (firstVisit) fileFacts.push({ module: from, file: relFile, imports: specifiers });
    }
  }
  return { edges, skipped, files: fileFacts };
}

// ---- Entry-point export discovery (WO-068, DEC-087) -----------------------

// The same regex tier as import scanning, pointed at export forms. Brace
// groups may span lines ([^}] admits newlines), so these run over the whole
// text rather than per line.
const EXPORT_NAME_RES = [
  /\bexport\s+(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/g,
  /\bexport\s+(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/g,
  /\bexport\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g,
  /\bexport\s+(?:interface|type|enum)\s+([A-Za-z_$][\w$]*)/g,
  /\bexport\s*\*\s*as\s+([A-Za-z_$][\w$]*)\s+from/g,
];
const EXPORT_BRACE_RE = /\bexport\s+(?:type\s+)?\{([^}]*)\}/g;
const EXPORT_STAR_RE = /\bexport\s*\*\s*from\s*["']([^"'\n]+)["']/g;
const EXPORT_DEFAULT_RE = /\bexport\s+default\b/;

/** JSON string leaves of a manifest `exports` value, however nested. */
function exportsLeaves(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value !== 'object' || value === null) return [];
  return Object.values(value).flatMap(exportsLeaves);
}

/** Resolve a relative re-export specifier the way the runtime would, at the
    heuristic tier: exact file, then +ext, then /index+ext. Module-local only. */
function resolveRelative(fromFile: string, specifier: string, root: string): string | undefined {
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [
    base,
    ...[...SOURCE_EXTENSIONS].map((ext) => base + ext),
    ...[...SOURCE_EXTENSIONS].map((ext) => join(base, `index${ext}`)),
  ];
  for (const candidate of candidates) {
    if (!candidate.startsWith(root + sep) && candidate !== root) continue;
    if (existsSync(candidate) && statSync(candidate).isFile() && SOURCE_EXTENSIONS.has(extname(candidate))) {
      return candidate;
    }
  }
  return undefined;
}

/** Exported names of one file, following relative `export * from` one module
    deep at a time (cycle-guarded). Names land in `out`. */
function exportedNames(file: string, root: string, visited: Set<string>, out: Set<string>): void {
  if (visited.has(file)) return;
  visited.add(file);
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return;
  }
  for (const re of EXPORT_NAME_RES) {
    for (const match of text.matchAll(re)) out.add(match[1]);
  }
  for (const match of text.matchAll(EXPORT_BRACE_RE)) {
    for (const piece of match[1].split(',')) {
      const name = piece.trim().replace(/^type\s+/, '');
      if (name === '') continue;
      const asAt = name.split(/\s+as\s+/);
      out.add((asAt.length > 1 ? asAt[1] : asAt[0]).trim());
    }
  }
  if (EXPORT_DEFAULT_RE.test(text)) out.add('default');
  for (const match of text.matchAll(EXPORT_STAR_RE)) {
    if (!match[1].startsWith('.')) continue;
    const target = resolveRelative(file, match[1], root);
    if (target !== undefined) exportedNames(target, root, visited, out);
  }
}

/**
 * Entry-point export discovery (WO-068): the public interface of each
 * registry module, at the same line-heuristic tier as import scanning
 * (DEC-087). Entry points are every file that exists among the manifest's
 * `main`/`module`/`exports` leaves plus the `index.*` / `src/index.*`
 * conventions; their exported names are unioned, with relative
 * `export * from` chains followed inside the module. A module with no
 * discoverable entry point maps to an empty list — a fact, never a failure.
 * Returns names sorted, keyed by module in registry order.
 */
export function collectExportFacts(cwd: string, modules: ModuleEntry[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const entry of modules) {
    const root = resolve(cwd, entry.path);
    if (!existsSync(root) || !statSync(root).isDirectory()) continue;
    const candidates: string[] = [];
    const manifest = join(root, 'package.json');
    if (existsSync(manifest)) {
      try {
        const parsed = JSON.parse(readFileSync(manifest, 'utf8')) as Record<string, unknown>;
        for (const key of ['main', 'module']) {
          if (typeof parsed[key] === 'string') candidates.push(parsed[key]);
        }
        candidates.push(...exportsLeaves(parsed['exports']));
      } catch {
        // No readable manifest — the index conventions below still apply.
      }
    }
    for (const ext of SOURCE_EXTENSIONS) candidates.push(`index${ext}`, `src${sep}index${ext}`);
    const names = new Set<string>();
    const visited = new Set<string>();
    for (const candidate of candidates) {
      const abs = resolve(root, candidate);
      if (!abs.startsWith(root + sep)) continue;
      if (!existsSync(abs) || !statSync(abs).isFile() || !SOURCE_EXTENSIONS.has(extname(abs))) continue;
      exportedNames(abs, root, visited, names);
    }
    result[entry.name] = [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }
  return result;
}
