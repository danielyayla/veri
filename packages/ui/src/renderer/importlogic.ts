import type { CommitRequest, CommittedSource, InspectRow } from './api.ts';

/**
 * Pure logic behind the file-import surface (WO-096, SRC-045): the review
 * sheet's state, its labels, and the commit payload. Everything here is
 * testable without a DOM; app.ts owns only rendering and IPC.
 */

export interface SheetRow extends InspectRow {
  /** The sheet's editable title, seeded from the derived one. */
  editedTitle: string;
}

export interface ImportSheet {
  rows: SheetRow[];
  busy: boolean;
  error: string | null;
}

/** Open a sheet from inspect results: accepted rows get editable titles. */
export function sheetFromInspect(rows: InspectRow[]): ImportSheet {
  return {
    rows: rows.map((row) => ({ ...row, editedTitle: row.title ?? '' })),
    busy: false,
    error: null,
  };
}

/** Rows the confirm button will file. */
export function acceptedRows(sheet: ImportSheet): SheetRow[] {
  return sheet.rows.filter((row) => row.ok);
}

/** The commit payload: accepted rows with their (possibly edited) titles. */
export function commitRequests(sheet: ImportSheet): CommitRequest[] {
  return acceptedRows(sheet).map((row) => ({ path: row.path, title: row.editedTitle }));
}

/** Provisional target ids for display — SRC-045's per-card id chip. Real
    allocation happens at commit (intakehost); these only preview the
    sequence starting after the corpus's current high-water mark. */
export function provisionalIds(sheet: ImportSheet, nextSrcNumber: number): (string | null)[] {
  let n = nextSrcNumber;
  return sheet.rows.map((row) => (row.ok ? `SRC-${String(n++).padStart(3, '0')}` : null));
}

/** The next free SRC number implied by a corpus's ids — display only; real
    allocation consults the id store at commit (DEC-037). */
export function nextSrcNumber(ids: Iterable<string>): number {
  let max = 0;
  for (const id of ids) {
    const m = /^SRC-(\d+)$/.exec(id);
    if (m !== null) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

/** "1.2 MB" / "48 KB" / "312 B" — one decimal above KB, none below. */
export function sizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** The card's format note: "md → text" (SRC-045's `<ext> → text` label). */
export function formatLabel(row: InspectRow): string {
  return row.kind === undefined ? '' : `${row.kind} → text`;
}

/** Basenames for the drop overlay's file chips. */
export function baseNames(paths: string[]): string[] {
  return paths.map((path) => path.split('/').pop()?.split('\\').pop() ?? path);
}

/** Confirm button label: "Import 2 files" (SRC-045). */
export function confirmLabel(sheet: ImportSheet): string {
  const n = acceptedRows(sheet).length;
  return n === 1 ? 'Import 1 file' : `Import ${n} files`;
}

/** The quiet toast after filing (SRC-045): count + preservation note. */
export function toastText(committed: CommittedSource[]): string {
  return committed.length === 1 ? '✓ 1 source filed · original preserved' : `✓ ${committed.length} sources filed · originals preserved`;
}
