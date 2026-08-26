/**
 * The status control's write policy and its one write path (WO-111,
 * SRC-051). Pure decision + a promise wrapper, so both are testable without
 * a DOM and shared by the segment control and the undo toast.
 */
import { ipcErrorMessage } from './editlogic.ts';

/**
 * Why pressing `target` on a work order currently at `current` refuses to
 * write, or null when the write may proceed. One table for both input paths —
 * the radiogroup's ↩/Space activation lands on the same button press a click
 * does.
 *
 * Entry gate (WO-103, DEC-096): `ready` is entered only by the user's stamp.
 * Exit gate (WO-111, SRC-051): leaving `ready` discards that stamp, so it is
 * refused symmetrically — a deliberate demotion is a git act, dispatch is
 * `veri start`, and no click writes out of `ready`.
 */
export function segmentRefusal(current: string, target: string): string | null {
  if (target === current) return null;
  if (target === 'ready') return 'ready is entered via veri approve — the stamp is the only path';
  if (current !== 'ready') return null;
  if (target === 'backlog') {
    return 'leaving ready discards the approval stamp — a deliberate demotion is a file edit committed in git, not a click';
  }
  if (target === 'in-progress') {
    return 'a ready work order is started with veri start <id> — the claim records who holds it, a click would not';
  }
  return 'a ready work order reaches done through veri start and a receipt — dispatch is veri start, not a status click';
}

/**
 * The one status write path: run the write, then `done` on success — and on
 * refusal (the writable-status guard, core validation, a race with an
 * external edit) hand the reason to `refused` instead of letting it vanish
 * into a void-ed promise (WO-111: no status write may fail silently).
 */
export async function writeStatus(
  set: (id: string, status: string) => Promise<void>,
  id: string,
  status: string,
  done: () => void | Promise<unknown>,
  refused: (message: string) => void,
): Promise<void> {
  try {
    await set(id, status);
  } catch (err) {
    refused(ipcErrorMessage(err));
    return;
  }
  await done();
}
