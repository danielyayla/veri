---
id: DEC-002
type: decision
title: Markdown files are the source of truth; no database in v1
status: active
approved: 2026-08-10
created: 2026-08-06
updated: 2026-08-06
links:
  - id: REQ-001
    rel: constrains
  - id: WO-001
    rel: constrains
---

## Choice

The `veri/` directory of markdown files with YAML frontmatter is the entire
data model. All state — documents, links, statuses, receipts — lives in
those files. Git provides versioning, history, and team sync.

## Rejected alternatives

- **SQLite as primary store** — proven, but makes the knowledge base opaque,
  requires export tooling, and breaks the "your files, your repo, no
  lock-in" pitch. May return later as a derived cache/index if directory
  scans become slow (>1000 docs), never as the source of truth.
- **Graph database / knowledge-graph-native storage** — the more elegant
  long-term architecture, but unproven for this use case and impossible to
  hand-edit. Documents-as-views was explored and deliberately deferred;
  links in frontmatter give us the graph without the bet.
- **JSON files** — machine-friendly, human-hostile. Docs must be pleasant
  to read raw on GitHub.

## Rationale

Every future capability (index, embeddings, sync, UI) can be rebuilt from
the files. Nothing can rebuild the files from a lost database. Reversible
beats elegant for v1.
