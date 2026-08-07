import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * The project root for a launch: an explicit argument wins; otherwise walk up
 * from cwd to the nearest directory containing veri/ (so `npm start -w
 * @veri/ui` — whose cwd is packages/ui — finds the repo root by itself).
 */
/** A directory qualifies as a Veri project iff it contains a veri/ subdirectory. */
export function isVeriProject(dir: string): boolean {
  return existsSync(join(dir, 'veri'));
}

export function findProjectRoot(explicit: string | undefined, cwd: string): string {
  if (explicit !== undefined) return resolve(explicit);
  let dir = resolve(cwd);
  for (;;) {
    if (existsSync(join(dir, 'veri'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(cwd);
    dir = parent;
  }
}
