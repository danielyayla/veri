---
id: DEC-139
type: decision
title: "A format bump is breaking for running readers, not just installed ones — the bumping change restarts them and the refusal names restart"
status: active
approved: 2026-08-29
created: 2026-08-28
updated: 2026-08-29
links:
  - id: SRC-064
    rel: derived-from
  - id: DEC-030
    rel: extends
  - id: REQ-015
    rel: informed-by
  - id: WO-131
    rel: follows-from
---

## Choice

A `CURRENT_FORMAT` bump is treated as a breaking change for every
reader **already running**, not only for every reader already
installed. Two consequences, and deliberately nothing else:

- **`RELEASING.md`'s format-bump checklist stops being release-scoped.**
  Its heading becomes "Before any format bump", releases become one item
  under it, and it gains a second: the bump takes effect for running
  readers the instant the marker changes, so every live MCP session
  against the project must reconnect, and any long-running host process
  must restart. A work order that bumps `CURRENT_FORMAT` carries that
  restart as an acceptance criterion, next to the migration step it
  already carries.

- **The `newer` refusal sentence names both repairs.** `formatStatement`
  currently ends "update Veri to open it", which is right for an
  installed reader that is behind and wrong for a process whose own
  source is already current. It states the update and the restart
  together, unconditionally, without trying to work out which applies.

No detection, no handshake, no new check rule, and no change to the
guard itself: `guardFormat()` keeps re-classifying per call.

## Rejected alternatives

- **Nothing — the guard already behaves correctly** — and it does:
  [[SRC-064]] records it satisfying [[WO-131]]'s acceptance test on a
  live stale reader. But the refusal being correct is not the same as
  the operator knowing what it costs or what clears it. The gap is that
  a bump silently acquires a second obligation nobody wrote down, and
  the one sentence the operator does see names the repair that does not
  apply.
- **Detect it: the running server compares its own `CURRENT_FORMAT`
  against the source tree's and says "restart" only when it is
  genuinely the stale party** — the most helpful message, and not worth
  what it costs. A process would have to locate and read the code it was
  built from, across cases that do not resemble each other (a built
  `dist` beside its source, an installed package, a global binary with
  no source at all), and be wrong in whichever case was not anticipated.
  It also inverts the dependency direction — core reading a build tree —
  to improve a string.
- **A version handshake: the server advertises its format at connect so
  the host can flag a stale one** — the structurally right answer if
  hosts acted on it, and today none is obliged to. Veri also cannot
  restart itself from inside the process that needs restarting, so the
  handshake would end at the same sentence this decision is already
  fixing. Revisit if a host gains a reconnect affordance to drive.
- **A `veri check` rule or advisory for the stale-reader case** — fails
  structurally, not on taste. `guardFormat()` runs before any handler
  body, so over MCP the tool that would carry the advisory is refused by
  the same guard. The advisory would be visible only where the problem
  is not.
- **Freeze the classification at process start, so a running reader
  keeps working until it is restarted** — this makes the lockout go away
  by restoring the failure it exists to prevent: a reader operating on a
  format it does not understand, dropping documents and misreporting
  every reference to them ([[WO-104]]'s failure class). The per-call
  freshness is the feature.
- **Amend [[REQ-015]] instead** — nothing in it is wrong. Its "Checked."
  clause promised a clear statement rather than a misparse and got
  exactly that. What is missing is operational: an obligation on the act
  of bumping, which is a decision's shape, not a requirement's.

## Rationale

The failure this prevents is cheap in isolation and expensive in
aggregate: an agent session that cannot read the knowledge base cannot
do anything Veri-shaped at all, and the sentence it is handed points at
the wrong repair. [[SRC-064]] records a maintainer of this very
repository, holding a current build, locked out and told to update.

Both halves are prose-and-a-string, because that is the entire size of
the gap. The system's behaviour is already right; only its account of
itself is short. Spending code on detection would buy a better message
in the case where the message is easiest to reason about anyway — the
maintainer who just ran the bump — and risk being wrong in the cases
nobody modelled.

Scoping the checklist to bumps rather than to releases is the load-
bearing half. A bump and a release are different events that happened to
coincide until they did not: this one landed on `main` with no release
anywhere near it, and stranded a reader in the same working tree
seconds later.
