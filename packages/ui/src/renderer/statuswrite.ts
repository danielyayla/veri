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
 * The `ready` segment and its entry/exit gates (WO-103, DEC-096; WO-111,
 * SRC-051) retired with the state itself (DEC-143, WO-143): the lifecycle
 * is backlog → in-progress → done, entered through the user's dispatch
 * gesture. The rest of the control is the follow-up design pass's business.
 */
export function segmentRefusal(current: string, target: string): string | null {
  if (target === current) return null;
  // WO-110 (SRC-052): withdrawn is terminal — no click can resurrect a
  // withdrawn work order (git is the undo, DEC-002).
  if (current === 'withdrawn') {
    return 'a withdrawn work order is terminal — restoring it is a git edit, not a status click';
  }
  return null;
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
