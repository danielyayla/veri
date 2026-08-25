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
