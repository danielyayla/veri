/**
 * Pure logic behind the editor island (WO-022): frontmatter geometry, the
 * guarded ranges that enforce the approval boundary in-editor (REQ-009 §4,
 * mirroring core's save-time guard), and the disk-reconciliation rules for
 * external changes (REQ-009 §5). No CodeMirror, no DOM — colocated-testable.
 */

export interface GuardRange {
  /** Absolute offsets of the guarded line, inclusive of both line edges so
      edits that touch either boundary (joining lines) are caught. */
  from: number;
  to: number;
  key: 'id' | 'approved';
}

/**
 * The frontmatter region as [from, to) offsets: the fenced block when the
 * closing fence exists, else the whole text — the same parse-degraded
 * fallback as core's save guard, so a half-deleted fence can't free a
 * guarded line.
 */
export function frontmatterRegion(text: string): { from: number; to: number } | null {
  if (!/^---\r?\n/.test(text)) return null;
  const close = /\r?\n---(\r?\n|$)/.exec(text);
  return { from: 0, to: close === null ? text.length : close.index + close[0].length };
}

/** The `id:` and `approved:` lines inside the frontmatter region. */
export function guardedRanges(text: string): GuardRange[] {
  const region = frontmatterRegion(text);
  if (region === null) return [];
  const ranges: GuardRange[] = [];
  const lineRe = /^(id|approved):.*$/gm;
  let match: RegExpExecArray | null;
  while ((match = lineRe.exec(text)) !== null) {
    if (match.index >= region.to) break;
    ranges.push({ from: match.index, to: match.index + match[0].length, key: match[1] as GuardRange['key'] });
  }
  return ranges;
}

/** The guard a set of change ranges trips, or null when the edit is free. */
export function touchedGuard(
  changes: ReadonlyArray<{ from: number; to: number }>,
  guards: readonly GuardRange[],
): GuardRange | null {
  for (const change of changes) {
    for (const guard of guards) {
      if (change.to >= guard.from && change.from <= guard.to) return guard;
    }
  }
  return null;
}

export const GUARD_NOTICE: Record<GuardRange['key'], string> = {
  id: 'id is immutable',
  approved: 'approval is set via veri approve',
};

/**
 * What an editor buffer should do when the file on disk changes (REQ-009 §5).
 * `ackDisk` is the disk content the user chose "Keep mine" against — it stays
 * acknowledged until the next save or reload.
 */
export type DiskAction = 'none' | 'reload' | 'conflict' | 'deleted' | 'closed';

export function reconcileDisk(
  buffer: { baseText: string; dirty: boolean; ackDisk: string | null },
  disk: string | null,
): DiskAction {
  if (disk === null) return buffer.dirty ? 'deleted' : 'closed';
  if (disk === buffer.baseText) return 'none';
  if (!buffer.dirty) return 'reload';
  return disk === buffer.ackDisk ? 'none' : 'conflict';
}

/** Strip Electron's IPC wrapping from a rejected save so the status row shows
    the guard's own words ("approved is set via veri approve"). */
export function ipcErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/^Error invoking remote method '[^']*': /, '').replace(/^[A-Za-z]*Error: /, '');
}
