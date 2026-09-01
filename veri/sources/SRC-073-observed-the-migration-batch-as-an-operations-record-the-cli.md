---
id: SRC-073
type: source
title: "Observed — the migration batch as an operations record: the CLI solo-carried the lifecycle, parallel sessions held their claims"
status: imported
kind: outcome
created: 2026-09-02
updated: 2026-09-02
links:
  - id: REQ-002
    rel: supports
  - id: REQ-026
    rel: supports
  - id: SRC-064
    rel: builds-on
---

> First-hand record, filed 2026-09-02 at Daniel's direction from the
> session that ran the 2026-09-01 migration batch. Filed as evidence
> rather than as a story: two accepted requirements with no recorded
> evidence — [[REQ-002]] (the CLI) and [[REQ-026]] (more than one
> committer) — have now both been tested by operations under load,
> and this is where reality's answer gets written down.

## The CLI carried the full lifecycle solo, twice

Both format bumps closed the MCP surface mid-session — the format-4
bump on 2026-08-27 ([[SRC-064]] records the episode and named the CLI
as the repair path) and the format-5 bump on 2026-09-01 (WO-143's
receipt records the refusal). Each time, every running server refused
the repo until restarted, and the CLI became the only door.

On 2026-09-01 that door carried an entire migration batch with no
degradation: `veri context` served the context packages, `veri
dispatch --as` performed every claim, `veri new` plus direct edits
did the filing, receipts were appended per DEC-142's pointer form,
and `veri check` was the authoritative verdict throughout — eleven
work orders (WO-141–WO-154's sessions) ran the full path this way
before the MCP server was restarted. [[REQ-002]]'s bet — a CLI
complete enough to operate the project's lifecycle and health — held
under the least friendly condition available: as the *only* surface.

## Parallel sessions held their claims

The batch ran as genuinely concurrent committers: the maintainer plus
multiple agent sessions in one repository, two of them long-lived
in-flight claims (WO-125 held by opus-wo125, WO-140 by its own
session) that the batch worked around for two days without a
collision. The claim mechanics did the governing — `claimed_by` named
every holder, dispatch refuses a claim another session holds, and an
in-progress work order without a claim fails the check. The working
practices REQ-026 anticipates showed up as real necessities, not
hypotheticals: sessions committed with explicit paths because other
sessions' uncommitted work sat in the same tree, and two work orders'
stray uncommitted files (WO-144's action bundle, WO-149's id bump)
were caught and committed under the right subjects at hand-off
verification. Zero cross-session overwrites across the batch.

## Limits of this evidence

The committers were one maintainer directing agent sessions, not
multiple humans with independent judgment — [[REQ-026]]'s hardest
case (two people who disagree) is untested. And the CLI's solo runs
were both forced by the format guard, not chosen; nothing here
compares the CLI experience against the MCP path it substituted for.
