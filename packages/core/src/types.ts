import type { DocType } from './ids.ts';

export interface Link {
  id: string;
  rel: string;
}

export interface VeriDocument {
  id: string;
  type: DocType;
  title: string;
  status: string;
  created: string;
  updated: string;
  links: Link[];
  /** Only present on superseded decisions. */
  supersededBy?: string;
  /** Date the user approved this document (requirements and decisions, REQ-008). */
  approved?: string;
  /** Full validated frontmatter; unknown extra keys are preserved here. */
  frontmatter: Record<string, unknown>;
  body: string;
  /** Path relative to the veri/ directory, forward slashes. */
  file: string;
  /** [[ID]] references found in the body, deduplicated. */
  inlineRefs: string[];
}

/**
 * An advisory finding (DEC-025): same file + one-line message shape as an
 * issue, but a separate tier — advisories never affect the issue count,
 * check's exit code, or any gate.
 */
export type Advisory =
  | {
      kind: 'missing-section';
      file: string;
      id: string;
      /** The expected `##` heading text, without the `##` marker. */
      section: string;
      message: string;
    }
  // Receipt verification (WO-044, REQ-021): a receipt's git claims did not
  // check out against collected history. Advisory by design — provenance
  // informs, never blocks (DEC-025).
  | { kind: 'receipt-commit-missing'; file: string; id: string; sha: string; message: string }
  | { kind: 'receipt-prefix'; file: string; id: string; sha: string; subject: string; message: string }
  | { kind: 'receipt-files'; file: string; id: string; sha: string; message: string }
  | { kind: 'receipt-unverified'; file: string; id: string; message: string }
  // Drift (WO-045, REQ-021): the knowledge base moved out from under its
  // own stamps. Advisories whisper — they inform and never block (DEC-025).
  | { kind: 'drift-superseded-link'; file: string; id: string; targetId: string; message: string }
  | { kind: 'drift-edited-after-done'; file: string; id: string; workOrderId: string; sha: string; message: string }
  | { kind: 'drift-approved-edited'; file: string; id: string; sha: string; message: string };

export type Issue =
  | {
      kind: 'invalid-frontmatter';
      file: string;
      /** Dotted path of the offending field, or null when the file/YAML itself is broken. */
      field: string | null;
      message: string;
    }
  | { kind: 'duplicate-id'; id: string; files: string[]; message: string }
  | {
      kind: 'broken-link';
      file: string;
      sourceId: string;
      targetId: string;
      via: 'frontmatter' | 'inline' | 'superseded_by';
      message: string;
    }
  | { kind: 'wo-without-requirement'; file: string; id: string; message: string }
  | {
      kind: 'gated-wo';
      file: string;
      id: string;
      targetId: string;
      targetStatus: string;
      message: string;
    }
  | { kind: 'missing-approval'; file: string; id: string; message: string }
  | { kind: 'format-mismatch'; file: string; problem: 'newer' | 'invalid'; message: string }
  | { kind: 'ui-wo-without-design'; file: string; id: string; message: string }
  | {
      kind: 'done-wo-violation';
      file: string;
      id: string;
      problem: 'unchecked-criteria' | 'no-receipt';
      message: string;
    };
