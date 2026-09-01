import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The veri/ids high-water record (DEC-037): the highest id number ever
 * issued per type, one `PREFIX N` line each, next to the veri/format
 * marker. Ids are never reused (REQ-001), so allocation takes
 * max(existing documents, this record) + 1 — the record remembers
 * deletions the filesystem cannot. It is a floor, not a source of truth:
 * an absent file or invalid line falls back to the document scan, and
 * the next successful create repairs the record.
 */

/** Every id prefix the record tracks, in the order `veri/ids` lists them.
    The one authoritative list (WO-153): anything matching ids elsewhere
    derives from it instead of restating it and falling behind. */
export const PREFIX_ORDER = ['REQ', 'DEC', 'WO', 'SRC', 'WF', 'PRD', 'MET'] as const;
export type IdPrefix = (typeof PREFIX_ORDER)[number];

const ID_LINE_RE = /^(REQ|DEC|WO|SRC|WF|PRD|MET)[ \t]+(\d+)$/;

export function readIdRecord(veriDir: string): Partial<Record<IdPrefix, number>> {
  let text: string;
  try {
    text = readFileSync(join(veriDir, 'ids'), 'utf8');
  } catch {
    return {};
  }
  const record: Partial<Record<IdPrefix, number>> = {};
  for (const line of text.split('\n')) {
    const match = ID_LINE_RE.exec(line.trim());
    if (match === null) continue;
    const prefix = match[1] as IdPrefix;
    const n = Number.parseInt(match[2], 10);
    const seen = record[prefix];
    if (seen === undefined || n > seen) record[prefix] = n;
  }
  return record;
}

/** Next free number for a type: past the record's floor and every existing id. */
export function nextIdNumber(veriDir: string, prefix: IdPrefix, existingIds: string[]): number {
  const taken = existingIds
    .filter((id) => id.startsWith(`${prefix}-`))
    .map((id) => Number.parseInt(id.slice(prefix.length + 1), 10));
  const floor = readIdRecord(veriDir)[prefix] ?? 0;
  return Math.max(floor, ...taken, 0) + 1;
}

/** Record an issued id so it is never reused, keeping valid existing lines. */
export function recordIssuedId(veriDir: string, prefix: IdPrefix, n: number): void {
  const record = readIdRecord(veriDir);
  if ((record[prefix] ?? 0) < n) record[prefix] = n;
  const lines = PREFIX_ORDER.filter((p) => record[p] !== undefined).map((p) => `${p} ${record[p]}`);
  writeFileSync(join(veriDir, 'ids'), `${lines.join('\n')}\n`);
}
