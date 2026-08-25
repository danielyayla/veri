---
id: DEC-101
type: decision
title: "Claims are stamped frontmatter written by the start transition — ready is the only door into in-progress"
status: active
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-099
    rel: constrains
  - id: DEC-096
    rel: follows-from
  - id: DEC-038
    rel: consistent-with
  - id: DEC-002
    rel: consistent-with
---

## Choice

A work order's claim is two frontmatter fields, `claimed_by` (free-text session or agent identity) and `claimed_at` (local calendar date per [[DEC-076]]), written by one core transition: `startWorkOrder`, surfaced as `veri start <WO-id> --as <session>` and the MCP `start_work_order` tool — one implementation behind both channels, the [[DEC-038]] parity discipline. The transition opens only from `ready`: backlog is refused toward `veri approve` (execution must spend a user-stamped dispatch clearance, [[DEC-096]]), and an already-claimed in-progress work order is refused with the holder named — the write-time collision guard. The two fields travel together (half a claim is invalid frontmatter), an in-progress work order without a claim is a check violation (`unclaimed-wo`), one identity holding two in-progress work orders that do not reference each other is an advisory (`shared-claim` — work orders chained by a link or inline ref are exempt: a session that splits out a prerequisite and starts it holds both deliberately), and at `done` the claim persists as provenance — superseded by the terminal status, read by no check. Claims are declarations in the knowledge base, checked mechanically; never OS-level locks, PIDs, or lockfiles.

## Rejected alternatives

- **Claims in a lockfile or state file outside the documents** — [[DEC-002]]: markdown files are the source of truth; a side file desyncs from the corpus and is invisible to context packages and diffs.
- **OS-level enforcement (file locks, PID checks)** — ruled out by the work order itself; locks die with crashed processes and mean nothing across machines, while a stale declaration is visible, diffable history the stale-claim advisory can surface.
- **Allowing `veri start` from backlog** — would let an agent bypass the user's dispatch clearance; the whole point of `ready` ([[DEC-096]]) is that execution begins only on stamped work.
- **Clearing the claim at done** — an extra edit that erases who executed the work; receipts record sessions' commits, but the claim records the holder, and history-preserving frontmatter is the repo's idiom (`approved:` also persists).
- **Advising on every shared identity, chains included** — the lived pattern in this very repo is a session discovering a prerequisite mid-work-order, filing it, and starting it; flagging the declared chain would train everyone to ignore the advisory. The link is the mechanical distinction between nesting and collision.
- **Making a shared identity across two in-progress work orders a violation** — a human maintainer legitimately juggling two would fail the gate; the one-session-one-work-order convention is for parallel agent runs, so it informs (advisory) rather than blocks, consistent with [[REQ-026]]'s multi-committer semantics.

## Rationale

The lived failure (finding F2 of [[SRC-046]]) is concurrent sessions colliding with detection by human heuristics — fresh mtimes, uncommitted diffs. A claim written at the same moment the status flips makes holding a work order a recorded fact: the second session's `start` is refused at write time, a hand-flipped in-progress without a claim fails check, and the flip rides the same line-targeted frontmatter edit discipline as the approve stamp, so files stay byte-stable outside the touched lines. Requiring `ready` as the sole entrance completes [[WO-098]]'s loop: `veri next` names the head, `veri start` claims it, and the claim spends exactly the clearance the user stamped.
