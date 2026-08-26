import { readFileSync, writeFileSync } from 'node:fs';
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
export const CURRENT_FORMAT = 2;

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
    case 'newer':
      return `this project uses veri format ${c.version}, but this Veri understands only up to format ${CURRENT_FORMAT} — update Veri to open it`;
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
];

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
