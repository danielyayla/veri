/**
 * The discard affordance's decisions and copy (WO-110, SRC-052, DEC-110).
 * Pure — no DOM, no IPC — so the popover's policy (when the control shows,
 * what each verb says, what the toasts announce) is testable without a
 * renderer and cannot drift between the reader and the work-order view.
 */
import type { VeriDocument } from '@verikb/core';
import { isWithdrawn } from '@verikb/core/pending';

/**
 * Whether the document surface offers `discard…` at all. Two absences, per
 * SRC-052: the workflow document (core refuses to withdraw the operating
 * manual) and an already-withdrawn document (already terminal — deleting a
 * withdrawn document stays a CLI/git act).
 */
export function discardOffered(doc: VeriDocument): boolean {
  return doc.type !== 'workflow' && !isWithdrawn(doc);
}

/** The withdraw verb's caption: names the consequence and what is kept. */
export function withdrawCaption(id: string): string {
  return `Keeps the file and its inbound links. ${id} becomes withdrawn — terminal, out of the queues and context packages.`;
}

/** The delete verb's caption when core's guard allows it. */
export function deleteCaption(id: string, file: string): string {
  return `Removes veri/${file} permanently. The id stays issued. Allowed because ${id} was never approved and nothing references it.`;
}

/** The toast after a successful withdraw. */
export function withdrawToast(id: string): string {
  return `${id} withdrawn — file and inbound links kept`;
}

/** The toast after a successful delete. */
export function deleteToast(id: string, file: string): string {
  return `${id} deleted — veri/${file} removed`;
}
