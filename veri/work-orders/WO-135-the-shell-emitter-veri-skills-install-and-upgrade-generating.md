---
id: WO-135
type: work-order
title: "The shell emitter — veri skills install and upgrade, generating thin pointers from accepted methods"
status: backlog
created: 2026-08-27
updated: 2026-08-27
links:
  - id: DEC-125
    rel: implements
  - id: DEC-130
    rel: constrained-by
  - id: REQ-040
    rel: implements
  - id: DEC-018
    rel: constrained-by
  - id: SRC-060
    rel: derived-from
  - id: WO-131
    rel: depends-on
  - id: WO-132
    rel: depends-on
  - id: WO-129
    rel: consistent-with
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

The half of [[DEC-125]] that makes a method document reachable: the generator that writes a harness-native `SKILL.md` under `.claude/skills/` from each **accepted** method, as a trigger description plus a pointer and nothing else. Same relationship `AGENTS.md` and `CLAUDE.md` already have to `veri/workflow.md` ([[DEC-018]]), one level down.

Two commands. `veri skills install` writes shells for the accepted methods a project has. `veri skills upgrade` re-derives Veri's shipped method documents and writes the differences as **proposed amendments the user reviews** — never a silent overwrite, per [[DEC-125]]. Upgrade matches on `upstream:`, and a method with no `upstream:` is the project's own and is never touched ([[DEC-130]]).

Nothing is written at install time and nothing is written without asking: [[DEC-125]] is explicit that installing is a statement of interest, not consent to restructure a repository. Where a project has no `veri/` at all, scaffolding goes through the `init` path of [[WO-129]] rather than a second implementation.

## In scope

- `veri skills install` — emit one shell per `accepted` method into the harness directory, each containing the method's `description:` verbatim and a pointer to its `MET-` id, and no coaching content
- `veri skills upgrade` — match shipped methods to project methods on `upstream:`, write differences as `draft` amendments for review, and leave methods without `upstream:` alone
- A single emitter interface with Claude Code as its first implementation, structured so a second harness is a new emitter rather than a fork ([[DEC-125]])
- Idempotence: a second run over an unchanged project writes nothing and says so
- Refusing to emit for `draft` and `retired` methods, and removing (or reporting) a shell whose method has since been retired
- Asking before the first write, and a `--yes` for non-interactive use
- The **tiering input**: which accepted methods get shells on a default install. The authority is [[REQ-040]], which enumerates the nine defaults by name — wayfinder, product-discovery, evidence-intake, define, decide, plan-work, implement, did-it-work, health. The five advanced skills ship as method documents and get no shell unless asked for. Read the tiering from that list, not from prose — [[SRC-060]]'s own "Editorial notes" section records why its body's counting cannot be used for this

## Out of scope

- The drift advisories — a separate work order in the host-fed tier
- A trigger *runner* over [[WO-130]]'s corpus. It becomes possible once shells exist, and it is its own work order with its own floor from [[DEC-129]]
- Emitters for harnesses other than Claude Code
- Whether shells are emitted per project or installed once per user — [[DEC-125]] deferred it and [[DEC-130]] left it open. This work order implements per-project because that is what `veri init` already does; if the per-user shape is chosen later it is an addition, not a rewrite
- Publishing anything to npm, and any new `v*` tag ([[DEC-075]])
- Editing method content. The emitter reads methods and writes shells; it never writes into `veri/methods/` except as `upgrade`'s reviewable amendments

## Requirements

- [[DEC-125]] — implements
- [[DEC-130]] — constrained-by
- [[REQ-040]] — implements
- [[DEC-018]] — constrained-by
- [[SRC-060]] — derived-from
- [[WO-131]] — depends-on
- [[WO-132]] — depends-on
- [[WO-129]] — consistent-with

## Acceptance tests

- [ ] `veri skills install` on a project with three accepted and two draft methods writes exactly three shells
- [ ] Each shell contains the method's `description:` byte-identically and a resolvable pointer to its `MET-` id, and contains no section of the method body — the thin-pointer property [[DEC-018]] requires, asserted, not assumed
- [ ] A second `install` over an unchanged project writes no file and reports no-op
- [ ] `upgrade` on a project whose method was locally edited produces a reviewable amendment and does **not** modify the accepted file in place
- [ ] `upgrade` leaves a method with no `upstream:` completely untouched, including one whose title matches a shipped method exactly
- [ ] Retiring a method and re-running `install` removes or reports its shell; the method document itself survives, with inbound `[[MET-nnn]]` links intact
- [ ] Neither command writes anything before the user is asked, verified on a repo with no `veri/` directory
- [ ] `veri check` reports 0 issues after each command

## Receipts

(none yet)
