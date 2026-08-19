---
id: WO-051
type: work-order
title: "Incremental snapshots"
status: done
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-004
    rel: implements
  - id: SRC-031
    rel: designed-by
  - id: SRC-016
    rel: derived-from
---

## Summary

The desktop app's snapshot pipeline stops paying full price per keystroke: every watcher tick today re-reads and re-parses the whole corpus serially and runs six git processes, one of them a full-history `git log --name-only` — invisible at 100 documents, keystroke-latency at 2,000 ([[SRC-016]], scale). Per [[SRC-031]], a `SnapshotBuilder` in `ui/src/lib/snapshot.ts` gains two in-memory caches — documents keyed by path+mtime+size, git facts keyed by HEAD+dirty — so a rebuild re-parses only changed files and re-runs the expensive log only when HEAD moves. Everything downstream (graph, checks, provenance, drift) recomputes in full from cached inputs; the Snapshot/IPC shape is unchanged; nothing is persisted. The switcher's per-project full snapshots and verify-connection's throwaway build move off the heavy path too.

## In scope

- A `SnapshotBuilder` owning the document cache (path → mtime/size/doc, readdir reconcile for adds/deletes, concurrent reads) and the git-facts cache (full-history log re-run only on HEAD change)
- Wiring the builder into the `veri:snapshot` IPC path and project switch/watcher re-arm (cache reset on project change)
- `veri:list-recent-projects` moves to a light stat (readdir count, no parse, no git)
- `veri:verify-connection` reuses the builder's snapshot instead of building a throwaway one
- The equivalence test: incremental build after arbitrary file-event sequences deep-equals a from-scratch `buildSnapshot`; fallback-to-full on cache doubt (stat failure, absent cache)

## Out of scope

- Any change to the watcher itself (fs.watch, 150 ms debounce, bare `veri:changed`)
- The Snapshot/IPC shape, including full document bodies over IPC
- CLI `veri check` and MCP request paths (stateless per run by design)
- Persisting any cache to disk ([[DEC-002]] — files are truth; caches die with the process)
- Moving git execution into core ([[DEC-040]] holds)

## Requirements

- [[REQ-004]] — implements
- [[SRC-031]] — designed-by
- [[SRC-016]] — derived-from

## Acceptance tests

- [x] Editing one document re-parses only that document (observable via the builder's instrumentation in tests) and produces a snapshot deep-equal to a cold build
- [x] Add, delete, and rename under `veri/` all reconcile correctly through the readdir pass
- [x] The full-history `git log` runs only when HEAD changes; a worktree-only change (dirty flip) does not re-run it; drift/provenance advisories still update on commit
- [x] Opening the project switcher spawns no full snapshot builds and no git log processes for MRU entries
- [x] `veri check` stays at zero issues; full typecheck and test suite pass

## Receipts

- 2026-08-19 — 28799de — packages/ui/src/lib/snapshot.ts, packages/ui/src/lib/snapshot.test.ts, packages/ui/src/main.ts, veri/decisions/DEC-047-switcher-rows-carry-a-live-issue-count-only-for-the-current.md — Agent session (Claude Code): SnapshotBuilder with path+mtime+size document cache and HEAD-keyed git-facts cache per SRC-031 — changed files re-parse concurrently, the full-history git log re-runs only on HEAD moves, downstream recomputes fully, doubt falls back to cold loadProject; wired into veri:snapshot with reset on project switch, switcher rows moved to a light readdir count (DEC-047 proposed for the issue-dot trade), verify-connection reuses the builder's snapshot; invariant tests deep-equal incremental builds against cold buildSnapshot across edit/add/delete/rename/template/commit events; typecheck clean, 394 tests green, veri check 0 issues.
