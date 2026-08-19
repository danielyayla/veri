---
id: SRC-031
type: source
title: Design — Incremental snapshots
status: imported
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-004
    rel: designs
  - id: SRC-016
    rel: derived-from
  - id: DEC-040
    rel: constrained-by
  - id: DEC-002
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
---

> Drafted 2026-08-19 by an agent session (Claude Code) for the
> incremental snapshots work order, per the DEC-012 design gate (the
> pipeline lives in `packages/ui`), under Daniel's P2 implementation
> directive. Pending Daniel's review. Written spec only.

[[SRC-016]], scale: the snapshot pipeline "strains — full reparse +
git shells per file event". The audit puts numbers on it: every
watcher tick re-reads and re-parses the whole corpus serially, and
runs **six git processes**, one of which is `git log --name-only`
over the *entire repository history*. At 100 documents this is
invisible; at 2,000 it is a keystroke-latency full rebuild. Manifesto
5 — derive, don't book-keep — cuts both ways: derivation must be
cheap enough to re-derive on every save.

## The shape: caches keyed by what actually changed

A `SnapshotBuilder` in `ui/src/lib/snapshot.ts` owns two in-memory
caches. Core stays pure and stateless ([[DEC-040]]: core never runs
git); nothing is ever persisted — a restart rebuilds from files,
because files are truth ([[DEC-002]]) and the cache is derived state.

- **Document cache** — `path → { mtime, size, doc }`. A build stats
  every `.md` under `veri/` (readdir is kept — it is the truth about
  what exists) and re-reads + re-parses only files whose mtime/size
  changed, plus additions; deletions drop out via the readdir
  reconcile. Unchanged documents are reused by reference. Reads
  happen concurrently (today they are serial `await`s in a loop).
- **Git facts cache** — keyed by `HEAD` sha + dirty flag (both
  already fetched cheaply by `gitInfo`). The expensive
  full-history `git log --name-only` re-runs only when `HEAD`
  moves; a dirty-flag flip alone re-runs nothing (drift and
  provenance derive from commits, not the worktree). This collapses
  the six processes to three cheap ones per rebuild in the steady
  state.

Everything downstream — `buildGraph`, `checkProject`, provenance and
drift advisories — recomputes in full from the cached documents and
commit list every build. They are pure in-memory passes over ~N docs;
the audit shows drift indexing is global over the commit list by
construction, so per-file drift updates are impossible anyway and
not attempted. The IPC contract and `Snapshot` shape are unchanged.

**The invariant, tested**: an incremental build after any sequence of
file events deep-equals a from-scratch `buildSnapshot`. Fallback to a
full rebuild on anything doubtful: cache absent, stat failure, or
clock skew making mtime unreliable (mtime equal but size changed
still reparses; same-mtime-same-size edits within the watcher's
150 ms debounce are accepted as the standard mtime-granularity
trade).

## Two adjacent leaks, same pipeline

- `veri:list-recent-projects` builds a **full snapshot per MRU
  project** (up to 20 loads and ~120 git processes) just to show doc
  counts in the switcher popover. It moves to a light stat: readdir
  count + name, no parse, no git.
- `veri:verify-connection` builds a snapshot only to pick a sample
  id; it reuses the builder's current snapshot instead.

## Everything unchanged

The watcher (fs.watch, 150 ms trailing debounce, bare `veri:changed`
— event coalescing already exists there), the renderer's
refresh-on-changed contract, the `Snapshot`/IPC shape including full
bodies, `veri check`'s own CLI path (stateless by design), MCP's
per-request loads (a server request is not a keystroke), advisory
semantics.
