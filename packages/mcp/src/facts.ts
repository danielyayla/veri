import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { TestFact } from '@verikb/core';

/**
 * The MCP server's host-side fact collectors (WO-089): filesystem only,
 * never a subprocess — the server's WF-001 posture holds, so git facts are
 * deliberately not collected here and the git-backed check tier reports as
 * skipped (DEC-081). These mirror the CLI's adapters (packages/cli/src/
 * testfacts.ts) rather than importing them: surfaces never
 * couple sideways (DEC-060), and fact collection stays out of core
 * (DEC-040) — each host owns its collectors. The parity test in
 * check.test.ts compares this surface against the CLI on one corpus, so
 * the mirrors cannot drift apart silently.
 */

/** Test-existence facts (WO-088): an identifier is a repo-root-relative
    file path, optionally `::name` — the name must appear in the file's
    text. Grep-level on purpose: deterministic and runner-agnostic. */
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
