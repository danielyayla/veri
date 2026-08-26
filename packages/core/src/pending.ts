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
    (doc.type === 'workflow' && doc.status === 'draft')
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
  return doc.kind ?? 'constraint';
}

/** One rendering of an outcome declaration — `metric target` — shared by
    every surface that shows it, or null when none is declared. */
export function outcomeLabel(doc: Pick<VeriDocument, 'outcome'>): string | null {
  return doc.outcome === undefined ? null : `${doc.outcome.metric} ${doc.outcome.target}`;
}
