---
id: WO-044
type: work-order
title: "Receipt verification against git"
status: backlog
created: 2026-08-18
updated: 2026-08-18
links:
  - id: SRC-016
    rel: derived-from
  - id: DEC-025
    rel: constrained-by
  - id: DEC-003
    rel: constrained-by
---

## Summary

Receipts are the proof that a work order happened, but nothing checks them: a receipt cites a commit SHA, a file list, and a summary, and all three are taken on faith. This work order makes provenance mechanical. Core gains a verifier that, for each receipt, confirms the cited commit exists in the repository, its message carries the matching `WO-nnn:` prefix, and the files it touched overlap the files the receipt names. Mismatches surface as advisories on the DEC-025 chassis — opinions, not blocks. The same machinery, run in reverse over the `WO-nnn:` commit convention, derives an "implemented in" mapping: for any file, which work orders' commits touched it; for any work order, which commits realized it. The mapping is exposed through core and the CLI (`veri implemented <path>` or equivalent) so both humans and agents can ask "why does this line exist?" and get an answer traced to a work order.

## In scope

- A core receipt parser: extract date, SHA, and file list from `## Receipts` entries (the existing convention, unchanged).
- Verification checks, advisory tier (DEC-025): cited commit missing from history; commit message lacking the `WO-nnn:` prefix for that work order; receipt file list disjoint from the commit's actual changed files; a `done` work order with no verifiable receipt.
- The derived "implemented in" index: file → work orders and work order → commits, computed on demand from `git log` — never stored (manifesto: derive, don't book-keep).
- CLI access to the derived index; core API for the UI and MCP to consume later.
- Graceful degradation outside a git repository or on shallow clones: skip with a note, never a hard failure.
- Tests with fixture repositories covering each advisory and the derivation.

## Out of scope

- Any new UI surface (hover cards, an "implemented in" panel) — that is a follow-up work order behind the design gate (DEC-012).
- Blocking behavior: receipt problems are advisories, never `veri check` failures (DEC-025).
- Rewriting or migrating existing receipts; historical receipts that predate the convention verify as far as they can and no further.
- Changing the receipt format or the `WO-nnn:` commit convention itself.

## Requirements

- [[SRC-016]] — derived-from
- [[DEC-025]] — constrained-by
- [[DEC-003]] — constrained-by

## Acceptance tests

- [ ] A receipt citing a SHA absent from history yields an advisory naming the work order and the SHA.
- [ ] A receipt whose commit touched none of the files the receipt names yields an advisory.
- [ ] A commit cited by WO-nnn whose message lacks the `WO-nnn:` prefix yields an advisory.
- [ ] A `done` work order with no verifiable receipt yields an advisory.
- [ ] `veri implemented <path>` (or the agreed spelling) lists the work orders whose commits touched the file, derived live from git.
- [ ] Outside a git repo, verification skips with a note and `veri check` still passes.
- [ ] All existing receipts in this repo verify clean, or each mismatch is a true finding.
- [ ] Full suite and `veri check` clean.

## Receipts

(none yet)
