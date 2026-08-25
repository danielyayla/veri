import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { buildImportedSource, deriveIntakeTitle, extractIntake, loadProject, localToday, nextIdNumber, originalStoragePath, recordIssuedId, slugifyTitle } from '@verikb/core';
import type { IntakeKind } from '@verikb/core';

/**
 * Host side of the app's file-import surface (WO-096): the sidecar owns all
 * file access; every derivation is core's pure intake module (DEC-060,
 * DEC-093, DEC-094). Two phases, matching the review-first design (SRC-045):
 * inspect reads and derives without writing anything, so the sheet can show
 * what each file would become and Cancel abandons with zero side effects;
 * commit re-derives ids at write time and files the accepted rows in the
 * CLI adapter's order — original first, document second, id record last,
 * both writes `wx`.
 */

export interface InspectRow {
  /** Absolute path the shell delivered (drag-drop or picker). */
  path: string;
  name: string;
  /** Byte size, for the sheet's size label. 0 when unreadable. */
  size: number;
  ok: boolean;
  /** Extraction kind when ok. */
  kind?: IntakeKind;
  /** Derived title when ok — the sheet's editable prefill. */
  title?: string;
  /** Refusal or read error when not ok — shown as the refused row's text. */
  message?: string;
}

export interface CommitRequest {
  path: string;
  /** The sheet's (possibly edited) title. Blank falls back to the derived one. */
  title: string;
}

export interface CommittedSource {
  id: string;
  /** veri/-relative document path. */
  file: string;
  /** veri/-relative preserved-original path. */
  original: string;
  title: string;
}

/** Read and derive, write nothing. One row per requested path, same order. */
export function inspectIntake(paths: string[]): InspectRow[] {
  return paths.map((path) => {
    const name = basename(path);
    let bytes: Buffer;
    try {
      bytes = readFileSync(path);
    } catch (err) {
      return { path, name, size: 0, ok: false, message: `cannot read ${name}: ${err instanceof Error ? err.message : String(err)}` };
    }
    const size = statSync(path).size;
    const extraction = extractIntake(name, bytes);
    if (!extraction.ok) return { path, name, size, ok: false, message: extraction.message };
    return { path, name, size, ok: true, kind: extraction.kind, title: deriveIntakeTitle(name, extraction) };
  });
}

/**
 * File the accepted rows as source documents. Ids are allocated here, at
 * write time — the sheet's provisional ids are display only, so a document
 * filed by another session between inspect and commit can never collide.
 * Throws on the first failure; rows already committed stay committed (each
 * is a complete, check-passing document the moment it lands).
 */
export async function commitIntake(projectRoot: string, requests: CommitRequest[]): Promise<CommittedSource[]> {
  const veriDir = join(projectRoot, 'veri');
  const date = localToday();
  const committed: CommittedSource[] = [];
  for (const request of requests) {
    const name = basename(request.path);
    const bytes = readFileSync(request.path);
    const extraction = extractIntake(name, bytes);
    if (!extraction.ok) throw new Error(extraction.message);

    const { documents } = await loadProject(veriDir);
    const next = nextIdNumber(
      veriDir,
      'SRC',
      documents.map((doc) => doc.id),
    );
    const id = `SRC-${String(next).padStart(3, '0')}`;
    const title = request.title.trim() === '' ? deriveIntakeTitle(name, extraction) : request.title.trim();
    const original = originalStoragePath(id, name);
    const file = `sources/${id}-${slugifyTitle(title)}.md`;
    const text = buildImportedSource({ id, title, date, original, text: extraction.text });

    mkdirSync(join(veriDir, 'originals'), { recursive: true });
    writeFileSync(join(veriDir, original), bytes, { flag: 'wx' });
    writeFileSync(join(veriDir, file), text, { flag: 'wx' });
    recordIssuedId(veriDir, 'SRC', next);
    committed.push({ id, file, original, title });
  }
  return committed;
}
