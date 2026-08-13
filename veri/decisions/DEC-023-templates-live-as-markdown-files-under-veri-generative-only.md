---
id: DEC-023
type: decision
title: "Templates live as markdown files under veri/, generative-only"
status: active
approved: 2026-08-13
created: 2026-08-13
updated: 2026-08-13
links:
  - id: REQ-010
    rel: constrains
  - id: REQ-006
    rel: informed-by
  - id: DEC-002
    rel: follows-from
  - id: DEC-018
    rel: follows-from
---

## Choice

Per-project document templates are plain markdown files at
`veri/templates/<type>.md` — one per document type, body only, no
frontmatter. `scaffoldProject` writes the built-in defaults there so
every project starts with visible, editable templates; document
creation in core reads the project's file and falls back to the
built-in constant when the file is absent. The loader excludes
`veri/templates/` from the document graph: templates are content
skeletons, not documents — they have no IDs, no links, no statuses,
and no approval ceremony, mirroring how the scaffolded workflow ships
ready to use ([[DEC-019]]). The desktop app's settings UI reads and
writes these same files — there is no second store.

Templates are generative-only in v1: they seed new documents and ship
in context packages as writing guidance, but `veri check` never fails
a document for diverging from its template. If enforcement is ever
wanted, it enters as advisory warnings, not errors; hard failure stays
reserved for frontmatter, approval gates, and link integrity.

## Rejected alternatives

- **Template settings in Electron `userData` JSON** — not versioned,
  not per-project, invisible to `veri new` and to agents reading the
  repo; contradicts [[DEC-002]].
- **A first-class `template` document type (TPL- ids)** — buys the
  approval workflow and graph membership at the cost of new type
  machinery everywhere (ids, statuses, checks), and approval ceremony
  on a content skeleton punishes the experimentation [[REQ-010]]
  exists to enable.
- **A YAML/JSON schema DSL describing sections** — more machine-
  checkable, but users would hand-write config instead of editing the
  very markdown they want new documents to start from; the template
  file *is* its own preview.
- **Enforced structure in `veri check` from day one** — tightening a
  template would retroactively break existing documents, forcing
  versioning/grandfathering machinery, and would put prose style
  behind the same gate as governance ([[REQ-008]]).

## Rationale

This is the [[DEC-018]] move applied to document bodies: ship the
opinion as editable project content, not code. Files under `veri/`
keep templates versioned, diffable, visible to any agent or editor,
and shared by every surface (CLI, UI, MCP) by construction — the
settings UI becomes a thin view over files the user could equally
edit by hand. Keeping templates out of the graph keeps them free of
ceremony, and keeping v1 generative-only delivers the consistency win
(documents start in the right shape) without the migration questions
enforcement drags in.
