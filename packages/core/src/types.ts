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
  /** Display name of the maintainer who stamped the approval (DEC-071). */
  approvedBy?: string;
  /** Code this work order claims (WO-088): repo-root-relative path globs
      and test identifiers (`path` or `path::name`). Only on work orders
      that declare a `binds:` block. */
  binds?: { paths: string[]; tests: string[] };
  /** A requirement's epistemic kind (REQ-032, WO-114): `constraint` must be
      satisfied and stay satisfied; `hypothesis` is a bet tested by shipping.
      Absent means constraint — use `requirementKind` for the effective value. */
  kind?: 'constraint' | 'hypothesis';
  /** What would confirm or refute a hypothesis (REQ-032): a metric and its
      target, normalized to strings. Only on requirements that declare one. */
  outcome?: { metric: string; target: string };
  /** Who holds this work order (WO-099): free-text session/agent identity,
      written by the start transition. Only on claimed work orders. */
  claimedBy?: string;
  /** Local calendar date the claim was taken (DEC-076). */
  claimedAt?: string;
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
  | { kind: 'drift-approved-edited'; file: string; id: string; sha: string; message: string }
  // Binding drift (WO-088, REQ-021): code and its claims disagree. For
  // unclaimed changes `file` is the first unclaimed repo-root-relative path
  // and `id` the short sha — no document anchors a commit, so document-keyed
  // surfaces (the UI's per-document grouping) naturally skip it. The other
  // two anchor to the work order that carries the binding.
  | { kind: 'drift-unclaimed-change'; file: string; id: string; sha: string; message: string }
  | { kind: 'drift-stale-wo'; file: string; id: string; message: string }
  // Claim semantics (WO-099, REQ-026): declarations in the knowledge base,
  // checked mechanically — never OS-level locks. Advisories, because a
  // maintainer's slow-but-live work must inform, not fail, a shared gate.
  | { kind: 'shared-claim'; file: string; id: string; otherId: string; claimedBy: string; message: string }
  | { kind: 'stale-claim'; file: string; id: string; message: string }
  | { kind: 'drift-missing-test'; file: string; id: string; test: string; message: string }
  // Observed architecture (WO-067, REQ-022): the code contains an edge an
  // active decision forbids. Advisory — intended-vs-observed deviation is
  // drift, and drift informs, never blocks (DEC-025). `file` is the
  // importing source file, project-root-relative; `id` anchors the finding
  // to its governing decision, the document that holds the rationale.
  // Team semantics (DEC-071): a stamp with no approver name in a project
  // that declares maintainers. Advisory — every stamp made before the team
  // formed is grandfathered as a warning, never a failure.
  | { kind: 'missing-approver'; file: string; id: string; message: string }
  // The untested bet (REQ-033, WO-115): a hypothesis requirement whose
  // linked work orders have all shipped but which no outcome source has
  // reported on. Advisory by design — the open loop must inform, never
  // block; judging the evidence stays a human act.
  | { kind: 'untested-bet'; file: string; id: string; workOrderIds: string[]; message: string }
  // The design gate's advisory tiers (WO-113, DEC-114). `design-mention` is
  // the demoted v1 heuristic: prose names a gated path but the work order
  // declares no binds paths and links no design — a nudge to declare or
  // design, pure over documents. `design-undeclared-touch` is the diff tier:
  // an in-progress work order's claimed commits touched a gated path it
  // never declared — git-backed, so advisory (DEC-081: the git tier is out
  // of reach over MCP, and an issue only some surfaces could compute would
  // fork the gate's verdict).
  | { kind: 'design-mention'; file: string; id: string; path: string; message: string }
  | { kind: 'design-undeclared-touch'; file: string; id: string; sha: string; path: string; message: string }
  | {
      kind: 'arch-violation';
      file: string;
      id: string;
      from: string;
      to: string;
      specifier: string;
      forbiddenBy: string[];
      message: string;
    };

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
  // Claim semantics (WO-099): in-progress asserts a session holds the work,
  // and the claim is how it says which one — absence is unaccounted work.
  | { kind: 'unclaimed-wo'; file: string; id: string; message: string }
  | {
      kind: 'gated-wo';
      file: string;
      id: string;
      targetId: string;
      targetStatus: string;
      message: string;
    }
  | { kind: 'missing-approval'; file: string; id: string; message: string }
  // Requirement kinds (REQ-032, WO-114): a hypothesis is a bet, and a bet
  // with no declared outcome cannot be confirmed or refuted — an untestable
  // claim is an issue, never a silent no-op (the DEC-058 posture).
  | { kind: 'hypothesis-without-outcome'; file: string; id: string; message: string }
  // Team semantics (DEC-071): approved_by names someone the workflow's
  // maintainers list does not — a misattributed stamp fails, unlike a
  // merely missing one (see the missing-approver advisory).
  | { kind: 'unknown-approver'; file: string; id: string; approver: string; message: string }
  | { kind: 'format-mismatch'; file: string; problem: 'newer' | 'invalid'; message: string }
  // Outcome link relations (REQ-033, WO-115): tests/supports/refutes point
  // from a source at a requirement, and outcome-of from a source at the work
  // order that shipped the change. A misdirected outcome rel would silently
  // fail to count as evidence — an issue, never a no-op (the DEC-058
  // posture). `id` is the linking document, `targetId` the link's target.
  | { kind: 'invalid-outcome-link'; file: string; id: string; targetId: string; rel: string; message: string }
  | { kind: 'ui-wo-without-design'; file: string; id: string; message: string }
  | {
      kind: 'done-wo-violation';
      file: string;
      id: string;
      problem: 'unchecked-criteria' | 'no-receipt';
      message: string;
    }
  // Architecture constraints (DEC-058, WO-066): a rule that cannot fire is
  // an issue, never a silent no-op — and two active decisions contradicting
  // each other about the same edge is a conflict the corpus must resolve.
  | { kind: 'arch-unknown-module'; file: string; id: string; module: string; message: string }
  | {
      kind: 'arch-conflict';
      file: string;
      from: string;
      to: string;
      allowedBy: string[];
      forbiddenBy: string[];
      message: string;
    }
  // Constraint severity (DEC-062, WO-069): a violation of an error-severity
  // constraint is a check issue — counted, exit 1 — with the same shape as
  // the advisory-tier arch-violation. `file` is the importing source file;
  // `id` anchors the oldest forbidding decision (DEC-061). Blocking power
  // arrives only through the user's approval stamp on the governing decision.
  | {
      kind: 'arch-violation';
      file: string;
      id: string;
      from: string;
      to: string;
      specifier: string;
      forbiddenBy: string[];
      message: string;
    };
