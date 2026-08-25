import type { VeriDocument } from './types.ts';
import { compareIds } from './ids.ts';

/**
 * The dispatch queue's head (WO-098): among ready work orders, the lowest id
 * wins — filing order, stable under re-runs, independent of clock or stamp
 * granularity. Pure derivation over parsed documents so every surface (CLI
 * `veri next`, any future dispatcher) reads one implementation.
 */
export function nextDispatchable(documents: VeriDocument[]): VeriDocument | undefined {
  return documents
    .filter((doc) => doc.type === 'work-order' && doc.status === 'ready')
    .sort((a, b) => compareIds(a.id, b.id))[0];
}
