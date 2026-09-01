import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Current version of the veri/ on-disk format (REQ-015). The marker is a
 * plain-text `veri/format` file holding one integer (DEC-030) — readable
 * before any document parsing, so classification never depends on the very
 * format it reports. A directory without the file predates the marker and
 * is format 0, the oldest — always openable, never rejected.
 */
// WO-109 bumps this to 2: `withdrawn` joins every type's status enum, and a
// reader that predates it rejects such a document's frontmatter outright —
// dropping it from the document set and then misreporting every inline
// reference to it as a broken link. That is the exact failure WO-104 names,
// and the format bump is its remedy: a stale reader states the format and
// refuses, instead of opening the project and lying about it.
// WO-121 bumps to 3: the product document type (REQ-037) joins the
// discriminated union — an older reader drops every PRD document and
// misreports its inline references, the same WO-104 failure class, so the
// bump ships with the type per the RELEASING.md rule.
// WO-131 bumps to 4: the method document type (REQ-040, DEC-130) joins the
// discriminated union and MET- joins ID_RE — a format-3 reader drops every
// method document and misreports its inline references, the same WO-104
// failure class the last two bumps answered.
// WO-143 bumps to 5 (DEC-143): `ready` leaves the work-order status enum —
// approval and dispatch are one gesture. The first bump that *removes* a
// value, so the migration is real for the first time: on-disk ready work
// orders return to backlog with their stamps preserved (clearance granted,
// not yet spent by dispatch), and a format-5 reader rejects a `ready`
// document's frontmatter outright — the WO-104 failure class, remedied by
// the marker's refusal plus this migration.
export const CURRENT_FORMAT = 5;

export const FORMAT_FILE = 'format';

export type FormatClassification =
  | { kind: 'current'; version: number }
  | { kind: 'older'; version: number }
  | { kind: 'newer'; version: number }
  | { kind: 'pre-marker'; version: 0 }
  | { kind: 'invalid'; raw: string };

function toPath(veriDir: string | URL): string {
  return typeof veriDir === 'string' ? veriDir : fileURLToPath(veriDir);
}

export function classifyFormat(veriDir: string | URL): FormatClassification {
  let raw: string;
  try {
    raw = readFileSync(join(toPath(veriDir), FORMAT_FILE), 'utf8');
  } catch {
    return { kind: 'pre-marker', version: 0 };
  }
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return { kind: 'invalid', raw: trimmed };
  const version = Number.parseInt(trimmed, 10);
  if (version === CURRENT_FORMAT) return { kind: 'current', version };
  return version < CURRENT_FORMAT ? { kind: 'older', version } : { kind: 'newer', version };
}

/** Human sentence for any non-current classification; null when current. */
export function formatStatement(c: FormatClassification): string | null {
  switch (c.kind) {
    case 'current':
      return null;
    case 'pre-marker':
      return `format 0 (pre-marker, the oldest format) — "veri migrate" brings it to format ${CURRENT_FORMAT}`;
    case 'older':
      return `format ${c.version} — "veri migrate" brings it to format ${CURRENT_FORMAT}`;
    // DEC-139: a bump breaks readers already *running*, not only already
    // installed, and this sentence is the only thing such a reader shows. It
    // names both repairs unconditionally rather than trying to work out which
    // party is stale — a running process cannot reliably locate the source it
    // was built from, and guessing wrong is worse than saying both.
    case 'newer':
      return `this project uses veri format ${c.version}, but this Veri understands only up to format ${CURRENT_FORMAT} — update Veri to open it, and restart this reader (a running process keeps the format it started with, so a live MCP session must reconnect)`;
    case 'invalid':
      return `veri/format is unreadable ("${c.raw}") — expected a single integer; restore it, or remove the file to treat the project as pre-marker`;
  }
}

/** Newer or unreadable formats must never be operated on, only reported. */
export function isOperableFormat(
  c: FormatClassification,
): c is Extract<FormatClassification, { kind: 'current' | 'older' | 'pre-marker' }> {
  return c.kind !== 'newer' && c.kind !== 'invalid';
}

export function writeFormatMarker(veriDir: string | URL, version: number = CURRENT_FORMAT): void {
  writeFileSync(join(toPath(veriDir), FORMAT_FILE), `${version}\n`);
}

export interface MigrationStep {
  from: number;
  to: number;
  summary: string;
  apply: (veriDir: string) => void;
}

/**
 * One step per format bump, contiguous from 0. Step 0→1 writes only the
 * marker: it proves the mechanism without touching content, and doubles as
 * the backfill for every pre-marker project.
 */
export const MIGRATIONS: readonly MigrationStep[] = [
  {
    from: 0,
    to: 1,
    summary: 'write the veri/format marker (no content changes)',
    apply: (veriDir) => writeFormatMarker(veriDir, 1),
  },
  {
    from: 1,
    to: 2,
    summary: 'the withdrawn status joins every type (marker only; documents are already valid)',
    apply: (veriDir) => writeFormatMarker(veriDir, 2),
  },
  {
    from: 2,
    to: 3,
    summary: 'the product document type joins the schema (marker only; documents are already valid)',
    apply: (veriDir) => writeFormatMarker(veriDir, 3),
  },
  {
    from: 3,
    to: 4,
    summary: 'the method document type joins the schema (marker only; documents are already valid)',
    apply: (veriDir) => writeFormatMarker(veriDir, 4),
  },
  {
    from: 4,
    to: 5,
    summary: 'the ready status retires (DEC-143) — ready work orders return to backlog, stamps and claims preserved',
    apply: (veriDir) => {
      retireReadyStatus(veriDir);
      writeFormatMarker(veriDir, 5);
    },
  },
];

/**
 * The 4 → 5 content migration (DEC-143, WO-143): every work-order document
 * at `status: ready` becomes `status: backlog`, one line-targeted edit per
 * file. Everything else — the `approved:`/`approved_by:` stamp above all —
 * is preserved byte for byte: a migration records the format change, it is
 * not a promotion and not a demotion; the stamp stays clearance on record,
 * which dispatch spends without re-asking. Mirrors the loader's skip list
 * (templates/, originals/, amendments/ hold non-documents).
 */
function retireReadyStatus(veriDir: string): void {
  const entries = readdirSync(veriDir, { recursive: true }) as string[];
  for (const entry of entries) {
    const file = entry.split('\\').join('/');
    if (!file.endsWith('.md')) continue;
    if (file.startsWith('templates/') || file.startsWith('originals/') || file.startsWith('amendments/')) continue;
    const path = join(veriDir, file);
    let raw: string;
    try {
      raw = readFileSync(path, 'utf8');
    } catch {
      continue; // a directory named *.md, or a file that vanished mid-walk
    }
    const fm = /^---\r?\n[\s\S]*?\r?\n---/.exec(raw);
    if (fm === null) continue;
    const block = fm[0];
    if (!/^type: work-order\r?$/m.test(block) || !/^status: ready\r?$/m.test(block)) continue;
    const next = block.replace(/^status: ready(\r?)$/m, 'status: backlog$1') + raw.slice(block.length);
    writeFileSync(path, next);
  }
}

export interface MigrateResult {
  from: number;
  to: number;
  /** Summaries of the steps applied, in order; empty when already current. */
  applied: string[];
}

/**
 * Bring a project to the current format, one recorded step at a time.
 * The caller owns consent (REQ-015): this runs only when explicitly
 * invoked, rewrites in place, and leaves the diff to git.
 */
export function migrateProject(veriDir: string | URL): MigrateResult {
  const dir = toPath(veriDir);
  const c = classifyFormat(dir);
  if (!isOperableFormat(c)) throw new Error(formatStatement(c) ?? 'unmigratable format');
  if (c.kind === 'current') return { from: c.version, to: c.version, applied: [] };

  const from = c.version;
  const applied: string[] = [];
  let at = from;
  while (at < CURRENT_FORMAT) {
    const step = MIGRATIONS.find((m) => m.from === at);
    if (step === undefined) throw new Error(`no migration step from format ${at} — cannot reach ${CURRENT_FORMAT}`);
    step.apply(dir);
    applied.push(`${step.from} → ${step.to}: ${step.summary}`);
    at = step.to;
  }
  return { from, to: at, applied };
}
