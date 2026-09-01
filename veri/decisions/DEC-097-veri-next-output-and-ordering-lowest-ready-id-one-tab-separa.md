---
id: DEC-097
type: decision
title: "veri next output and ordering — lowest ready id, one tab-separated line, exit 1 on an empty queue"
status: superseded
superseded_by: DEC-143
approved: 2026-08-25
created: 2026-08-25
updated: 2026-09-01
links:
  - id: WO-098
    rel: constrains
  - id: DEC-038
    rel: consistent-with
  - id: DEC-070
    rel: builds-on
  - id: SRC-046
    rel: follows-from
---

## Choice

`veri next` prints exactly one line for the queue head — `<id>\t<title>\t<repo-relative path>`, tab-separated so a shell can `IFS=$'\t' read -r id title path` — and exits 1 with a human hint on stdout when no work order is ready. The head is the ready work order with the lowest id, compared numerically ([[DEC-070]]'s `compareIds`): filing order, stable across runs, independent of clock or stamp-date granularity (several work orders stamped the same day still order deterministically). The derivation (`nextDispatchable`) is a pure core function over parsed documents, per the parity principle of [[DEC-038]], so any future surface — a dispatcher, the MCP server, the app — reads the one implementation.

## Rejected alternatives

- **JSON output by default** — heavier to consume from a shell one-liner, the primary caller ([[WO-101]]'s CI recipe); a `--json` flag can arrive with a consumer that wants it.
- **Printing the full context package** — conflates "what is next" with "brief me"; `veri context <id>` already exists and the dispatcher composes the two.
- **Ordering by approval date** — day-granular stamps tie constantly and same-day order would fall back to something arbitrary; id order is what the stamp date would approximate anyway.
- **Listing all ready work orders** — a queue surface, not a polling primitive; `veri list work-order` already shows the full board, and one-at-a-time is the contract a dispatcher loop wants.
- **Silent empty output on exit 1** — costs the human nothing to have the hint and pollers branch on the exit code, not the text.

## Rationale

The command exists to be the deterministic, token-free polling primitive of finding F1 ([[SRC-046]]): a dispatcher calls it on a schedule, branches on the exit code, and spends agent tokens only when a line comes back. One line, one head, stable ordering — everything a cron loop needs and nothing it has to parse.
