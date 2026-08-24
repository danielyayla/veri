import { readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ID_RE } from './ids.ts';
import { bumpUpdated } from './save.ts';
import type { Link } from './types.ts';
import { localToday } from './dates.ts';

/**
 * Typed-link editing's write path (WO-056, SRC-028): rewrite ONLY the
 * frontmatter `links:` block, plus the `updated:` bump, byte-preserving
 * everything else — body untouched, every other frontmatter line untouched,
 * unknown keys and formatting quirks included. The links block itself is
 * re-serialized in the canonical shape every Veri-written file already
 * carries (two-space `- id:`, four-space `rel:`), so on such files a
 * removal leaves the remaining entries byte-for-byte as they were.
 *
 * Same posture as save.ts: the file is the document (DEC-002), validity is
 * `veri check`'s report, and the approval boundary (REQ-008) is the one
 * thing this write may never cross — asserted below.
 */

/** The frontmatter fence, exactly as save.ts sees it. */
const FM_RE = /^---\r?\n[\s\S]*?\r?\n---/;

/**
 * The `links:` line plus its indented continuation lines. Guarded keys can
 * never be swallowed: top-level YAML keys are unindented by construction,
 * so the continuation run (indented lines only) always stops before them.
 */
const LINKS_BLOCK_RE = /^links:[^\n]*(?:\r?\n[ \t]+[^\n]*)*/m;

/** Rels that survive as plain YAML scalars; anything else is quoted. */
const BARE_SCALAR_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;

function relScalar(rel: string): string {
  return BARE_SCALAR_RE.test(rel) ? rel : JSON.stringify(rel);
}

/** The canonical `links:` block for a set of outbound links. */
export function serializeLinks(links: Link[]): string {
  if (links.length === 0) return 'links: []';
  return `links:\n${links.map((l) => `  - id: ${l.id}\n    rel: ${relScalar(l.rel)}`).join('\n')}`;
}

/** A guarded top-level frontmatter line, or null when the key is absent. */
function guardLine(block: string, key: string): string | null {
  return new RegExp(`^${key}:.*$`, 'm').exec(block)?.[0] ?? null;
}

/**
 * Pure half of the rewrite: `raw` with its frontmatter `links:` block
 * replaced by the canonical serialization of `links`, and `updated:` bumped
 * to `date`. Everything outside those two regions is returned byte-for-byte.
 * A file without a `links:` key gains one at the end of the frontmatter —
 * where Veri-written files carry it — unless the new set is empty too.
 */
export function replaceLinksBlock(raw: string, links: Link[], date: string): string {
  for (const link of links) {
    if (!ID_RE.test(link.id)) throw new Error(`not a valid document id: ${link.id}`);
    if (link.rel.trim() === '') throw new Error('rel must not be empty');
  }
  const fm = FM_RE.exec(raw);
  if (fm === null) throw new Error('missing frontmatter block — cannot edit links');
  const block = fm[0];
  const serialized = serializeLinks(links);
  let nextBlock: string;
  if (LINKS_BLOCK_RE.test(block)) {
    nextBlock = block.replace(LINKS_BLOCK_RE, serialized);
  } else if (links.length === 0) {
    nextBlock = block; // no key and nothing to write — the empty set is already true
  } else {
    nextBlock = block.replace(/\r?\n---$/, (fence) => `\n${serialized}${fence}`);
  }
  // id:/approved:/status: sit outside the links block by construction —
  // assert it, so no quirk of a hand-edited file can turn a links write
  // into a backdoor around the editor's guards (REQ-009 §4, REQ-008).
  for (const key of ['id', 'approved', 'status'] as const) {
    if (guardLine(block, key) !== guardLine(nextBlock, key)) {
      throw new Error(`links rewrite would touch ${key}: — refusing`);
    }
  }
  return bumpUpdated(nextBlock + raw.slice(block.length), date);
}

export interface SetLinksResult {
  /** Path relative to the veri/ directory. */
  file: string;
  /** The text actually written. */
  text: string;
}

/**
 * Replace the outbound links of the document at `file` (relative to
 * `veriDir`) — the async half, mirroring saveDocumentFile's shape. Unlike a
 * save there is no restore case: a links edit needs a file to edit.
 */
export async function setDocumentLinks(
  veriDir: string | URL,
  file: string,
  links: Link[],
  date: string = localToday(),
): Promise<SetLinksResult> {
  const root = typeof veriDir === 'string' ? veriDir : fileURLToPath(veriDir);
  if (isAbsolute(file) || file.split(/[\\/]/).includes('..') || !file.endsWith('.md')) {
    throw new Error(`refusing to write outside veri/: ${file}`);
  }
  const path = join(root, file);
  const prev = await readFile(path, 'utf8');
  const next = replaceLinksBlock(prev, links, date);
  await writeFile(path, next);
  return { file, text: next };
}
