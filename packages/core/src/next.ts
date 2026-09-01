import type { VeriDocument } from './types.ts';
import { compareIds } from './ids.ts';

/**
 * The judgment queue's head (WO-098, re-scoped by DEC-143): with the ready
 * state retired, what awaits is the user's dispatch judgment, and the queue
 * is the backlog. Among backlog work orders, the lowest id wins — filing
 * order, stable under re-runs, independent of clock or stamp granularity.
 * Pure derivation over parsed documents so every surface (CLI `veri next`,
 * the MCP `get_queue`) reads one implementation.
 */
export function nextDispatchable(documents: VeriDocument[]): VeriDocument | undefined {
  return documents
    .filter((doc) => doc.type === 'work-order' && doc.status === 'backlog')
    .sort((a, b) => compareIds(a.id, b.id))[0];
}
