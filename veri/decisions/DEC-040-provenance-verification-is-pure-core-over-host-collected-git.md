---
id: DEC-040
type: decision
title: "Provenance verification is pure core over host-collected git facts"
status: active
approved: 2026-08-18
created: 2026-08-18
updated: 2026-08-18
links:
  - id: WO-044
    rel: constrains
  - id: DEC-037
    rel: follows-from
  - id: REQ-021
    rel: satisfies
  - id: DEC-003
    rel: follows-from
---

## Choice

Receipt verification and the derived "implemented in" index are implemented as pure functions in core (`provenance.ts`) operating on a `GitFacts` value — the repository's commit list as plain data: per commit, its full SHA, subject line, and changed file paths. Core never spawns a process; the facts are collected by the host layer that already owns process access. The CLI gains a `collectGitFacts(cwd)` adapter (one `git log --name-only` subprocess) and passes the result into core's checks; the Electron main process and any future host can reuse the same core functions with their own collector. When no facts are collectable (not a git repository, git absent, shallow clone), the host passes nothing and verification skips with a note — the pure checks never run on partial history.

## Rejected alternatives

- **Git subprocess directly in core** — simplest wiring, but reverses DEC-037's explicit purity ruling for core and the MCP server; every consumer would inherit a child-process dependency, and pure-function tests would need real repositories.
- **All verification logic in the CLI package** — keeps core untouched, but the UI and MCP could not reuse it ("core API for the UI and MCP to consume later" is in scope for WO-044), and the receipt parser would live outside the package that owns the receipt convention (DEC-003).
- **A libgit2/isomorphic-git library dependency in core** — process-free git reading, but adds a heavyweight dependency to a package that is deliberately `yaml` + `zod`, for data one `git log` invocation already provides.
- **Caching git facts in a file under veri/** — violates derive-don't-book-keep (REQ-021 explicitly requires no stored index) and creates a sync problem with the repository it mirrors.

## Rationale

DEC-037 already ruled that core and the MCP server are deliberately subprocess-free, and rejected a git-history scan for id allocation on exactly that ground — this decision keeps that posture while still delivering git-backed verification. Splitting "what git says" (host adapter, trivial) from "what it means" (core, all the parsing and matching logic) puts every line worth testing behind a pure interface: fixture tests construct GitFacts literals instead of building throwaway repositories, and the UI's existing git shelling (snapshot pipeline) can feed the same functions without core changing. It is the same shape as DEC-025's advisory chassis: core computes findings from inputs; hosts decide how to gather inputs and where to print outputs.
