---
id: WO-160
type: work-order
title: "The Stage-6 page — operational feedback through the evidence door"
status: backlog
created: 2026-09-02
updated: 2026-09-02
links:
  - id: REQ-012
    rel: implements
  - id: SRC-066
    rel: derived-from
  - id: WO-145
    rel: follows-from
  - id: MET-004
    rel: relates-to
  - id: MET-008
    rel: relates-to
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
verify: test -f site/docs/operational-feedback.html
---

## Summary

The one SRC-066 recommendation with no landing work order. The capability exists end to end — veri:evidence-intake is the door, file_source the mechanism, tests/supports/refutes and outcome-of the edges, veri:did-it-work the judgment — but no page tells an adopter the pattern, so the playbook's sixth stage reads as absent when it is actually undocumented. One docs page closes it at the cost the playbook itself prescribes: a page, not a platform. Detection stays deterministic and stays in the user's own monitoring stack; a breach briefs a headless session that runs veri:evidence-intake; the source lands on the graph linked to the bets it bears on; the human judges. The page also carries the harness-side verification pattern WO-145 deferred as "documented, not productized" — which was never documented.

## In scope

- `site/docs/operational-feedback.html`: the loop walked with the real gate and tool names, from deterministic alert to human judgment, including a worked example brief for a headless session
- A plain statement of what Veri does not do: no watching, no subprocesses, no auto-judgment (DEC-037, REQ-042's third clause)
- The harness-side verification pattern WO-145 deferred: the dispatch prompt running `verify:`, hooks and test-edit locks as harness configuration
- Navigation links wherever sibling docs pages are listed

## Out of scope

- Any product mechanism — no bands machinery, no network calls, no monitoring code, no schedulers
- Changes to methods or the corpus
- The morning-after habit itself (a cadence is the user's to keep, not a page's to promise)

## Acceptance tests

- [ ] The page exists — the declared verify command proves it — and walks alert → evidence-intake → linked source → judgment with real names throughout
- [ ] It states plainly what Veri does not do, citing the subprocess-free constraint
- [ ] The WO-145-deferred harness verification pattern is documented on it
- [ ] The docs navigation links it wherever sibling pages are listed

## Receipts

(none yet)
