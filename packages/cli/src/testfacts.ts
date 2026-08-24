import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { TestFact } from '@veri/core';

/**
 * The CLI's test-existence collector (WO-088, the DEC-040 split): core names
 * the bound test identifiers, this adapter answers whether each still
 * resolves, and core's checkBoundTests judges the answers. An identifier is
 * a repo-root-relative file path, optionally `::name` — the name must appear
 * in the file's text. Grep-level on purpose: deterministic, runner-agnostic,
 * and never wrong in a way that trains users to ignore it.
 */
export function collectTestFacts(root: string, ids: string[]): TestFact[] {
  return ids.map((id) => ({ id, exists: resolves(root, id) }));
}

function resolves(root: string, id: string): boolean {
  const sep = id.indexOf('::');
  const path = sep === -1 ? id : id.slice(0, sep);
  const name = sep === -1 ? '' : id.slice(sep + 2);
  try {
    if (!statSync(join(root, path)).isFile()) return false;
    if (name === '') return true;
    return readFileSync(join(root, path), 'utf8').includes(name);
  } catch {
    return false;
  }
}
