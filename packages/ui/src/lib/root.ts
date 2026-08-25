import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { VERI_SUBDIRS } from '@verikb/core';

/**
 * A directory qualifies as a Veri project iff its `veri` entry is a directory
 * that looks like a knowledge base: at least one of the four REQ-001
 * subdirectories inside. The name alone is not enough — a git clone named
 * `veri` sitting in ~/Projects made the bare existsSync check treat the whole
 * Projects folder as a project (the WO-018 picker then "opened" it instead of
 * offering to create). Every tree `veri init` produces passes this test; the
 * degenerate case (a `veri/` with none of the four) is handled downstream by
 * core's scaffold guard, which still refuses to write over any `veri` entry.
 */
export function isVeriProject(dir: string): boolean {
  const veri = join(dir, 'veri');
  try {
    if (!statSync(veri).isDirectory()) return false;
  } catch {
    return false;
  }
  return VERI_SUBDIRS.some((sub) => existsSync(join(veri, sub)));
}

/**
 * The project root for a launch: an explicit argument wins; otherwise walk up
 * from cwd to the nearest Veri project (so `npm start -w @verikb/ui` — whose cwd
 * is packages/ui — finds the repo root by itself). The result is not
 * guaranteed to be a project — callers that record or open it must gate on
 * isVeriProject themselves.
 */
/**
 * The explicit-root CLI argument for this launch. `electron .` spends
 * argv[1] on the app path; a packaged binary does not, so the first user
 * argument shifts to argv[1] (WO-027). Flag-style arguments (leading `-`,
 * e.g. --enable-logging while debugging) are never project paths.
 */
export function launchArg(argv: readonly string[], packaged: boolean): string | undefined {
  return argv.slice(packaged ? 1 : 2).find((a) => !a.startsWith('-'));
}

export function findProjectRoot(explicit: string | undefined, cwd: string): string {
  if (explicit !== undefined) return resolve(explicit);
  let dir = resolve(cwd);
  for (;;) {
    if (isVeriProject(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(cwd);
    dir = parent;
  }
}
