import type { VeriDocument } from './types.ts';

/**
 * The approval gate's predicate in a dependency-free module, exposed as the
 * '@verikb/core/pending' subpath so the browser-bundled renderer imports the
 * one real implementation (DEC-046, DEC-092). Node-side consumers reach it
 * through the main entry.
 */

/** A document awaiting the user's approval and therefore not binding (REQ-008). */
export function isPending(doc: VeriDocument): boolean {
  return (
    (doc.type === 'requirement' && doc.status === 'draft') ||
    (doc.type === 'decision' && doc.status === 'proposed') ||
    (doc.type === 'workflow' && doc.status === 'draft') ||
    (doc.type === 'product' && doc.status === 'draft')
  );
}

/**
 * A document taken out of play (DEC-110): terminal, non-binding, and never
 * gated. It is neither pending (nothing awaits a stamp) nor live — checks
 * that skip planning skip withdrawal for the same reason, and assembly leaves
 * it out of context packages while its inbound [[ID]] links keep resolving.
 * Lives beside `isPending` so the browser-bundled renderer reaches the one
 * real implementation through the same dependency-free subpath (DEC-046).
 */
export function isWithdrawn(doc: VeriDocument): boolean {
  return doc.status === 'withdrawn';
}

/**
 * A requirement's effective epistemic kind (REQ-032, WO-114): absent means
 * constraint, so every reader — CLI, context assembly, the renderer — agrees
 * on the default through this one function instead of each re-deciding it.
 * Lives here so the browser-bundled renderer reaches the one real
 * implementation through the same dependency-free subpath (DEC-046).
 */
export function requirementKind(doc: Pick<VeriDocument, 'kind'>): 'constraint' | 'hypothesis' {
  // The shared `kind` field also carries source kinds (REQ-038); only the
  // requirement vocabulary is meaningful here — anything else defaults.
  return doc.kind === 'hypothesis' ? 'hypothesis' : 'constraint';
}

/** One rendering of an outcome declaration — `metric target` — shared by
    every surface that shows it, or null when none is declared. */
export function outcomeLabel(doc: Pick<VeriDocument, 'outcome'>): string | null {
  return doc.outcome === undefined ? null : `${doc.outcome.metric} ${doc.outcome.target}`;
}

/**
 * The outcome link vocabulary (REQ-033, WO-115): how a source reports what
 * reality said about a requirement. `tests` claims relevance without a
 * verdict; `supports` and `refutes` carry one. Direction is fixed — the
 * evidence points at the bet, source → requirement — and check validates it
 * (checkOutcomeLinks). Lives on the dependency-free subpath so every surface
 * shares the one vocabulary (DEC-046).
 */
export const OUTCOME_RELS = ['tests', 'supports', 'refutes'] as const;

export type OutcomeRel = (typeof OUTCOME_RELS)[number];

/** Whether `rel` is one of the outcome relations (tests/supports/refutes). */
export function isOutcomeRel(rel: string): rel is OutcomeRel {
  return (OUTCOME_RELS as readonly string[]).includes(rel);
}

/** The rel an outcome source uses toward the work order that shipped the
    change it observed (REQ-033): source → work-order, validated by check. */
export const OUTCOME_OF_REL = 'outcome-of';

/**
 * The source kind vocabulary (REQ-038, WO-122): a source's epistemic class,
 * mirroring what REQ-032 did for requirements. `reference` is the neutral
 * default for the absent field — chosen so the existing corpus (imported
 * material of every stripe) needs no migration and no false labels; a
 * design note is only a `design` source once someone says so.
 */
export const SOURCE_KINDS = ['design', 'user-feedback', 'metric', 'external-eval', 'investigation', 'outcome', 'reference'] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];

/**
 * A source's effective kind: absent means reference, decided here once so
 * every reader — CLI, context assembly, the renderer — agrees on the
 * default (the requirementKind pattern, DEC-046).
 */
export function sourceKind(doc: Pick<VeriDocument, 'kind'>): SourceKind {
  return (SOURCE_KINDS as readonly string[]).includes(doc.kind ?? '') ? (doc.kind as SourceKind) : 'reference';
}

/**
 * The product layer's sanctioned files (REQ-037, WO-121), veri/-relative:
 * filename is the singleton's identity, so there is no facet field to drift
 * from it. The set is closed — a new member is a decision, not a habit
 * (DEC-111's filter). Lives on the dependency-free subpath so every surface
 * shares the one list (DEC-046).
 */
export const PRODUCT_FILES = [
  'product/vision.md',
  'product/users.md',
  'product/principles.md',
  'product/current-focus.md',
] as const;

/** The veri/-relative path of the current-focus singleton (REQ-037). */
export const CURRENT_FOCUS_FILE = 'product/current-focus.md';
