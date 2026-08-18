---
id: DEC-037
type: decision
title: A veri/ids high-water file makes issued ids permanent
status: active
approved: 2026-08-18
created: 2026-08-18
updated: 2026-08-18
links:
  - id: WO-038
    rel: designs
  - id: REQ-001
    rel: follows-from
  - id: DEC-030
    rel: follows-from
  - id: SRC-016
    rel: informed-by
---

## Choice

Record the highest id ever issued per type in a plain-text `veri/ids`
file — one `PREFIX N` line per type, e.g. `REQ 20` — next to the
`veri/format` marker. Id allocation becomes a single shared function in
core: `next = max(highest existing file, recorded high-water) + 1`, and
every successful create bumps the record. Both existing allocators (the
document-creation path and the MCP decision write-back) call it; the
duplicated max+1 blocks are deleted.

The file is a floor, not a source of truth: if it is absent or a line is
unparseable, allocation falls back to the scan of existing documents and
the next write repairs the record. A new project needs no ids file until
its first document. No format bump — the file is additive, ignored by
every existing reader, and inspectable at a glance on GitHub, exactly
like the [[DEC-030]] format marker.

## Rejected alternatives

- **Git-history scan** (union of ids ever seen in `git log`) — zero new
  state, but it adds a subprocess dependency to core and the MCP server
  (both deliberately pure), silently degrades to today's behavior in
  non-git projects, and taxes every create with repo-history cost.
- **Never-delete convention** (retire/supersede instead of deleting) —
  already the social norm and it already failed once; a convention cannot
  fix an allocator that trusts the filesystem alone.
- **Scanning link references for deleted ids** — only sees ids some
  surviving document happens to mention; the actual incident (an
  unreferenced scratch file) is exactly what it misses.
- **Do nothing** — leaves AGENTS.md's "never reused" as an aspiration the
  tooling contradicts, and leaves two copies of the allocator to drift.

## Rationale

The filesystem genuinely cannot remember a deleted file, so *some*
persistent record is required; the only question is which. A dedicated
single-purpose text file is the established Veri answer ([[DEC-030]]):
file-native, diffable, works without git, and free of the settings-creep
objection that killed `veri.json` — it holds one fact the documents
cannot hold themselves. Making the record a self-healing floor keeps
files-as-truth intact ([[DEC-002]]): a hand-edited or lost `veri/ids`
can never block work or contradict existing documents, it can only
forget deletions that happened while it was gone. Collapsing the two
allocators into one is the same move as DEC-009's shared search — one
concept, one implementation.
