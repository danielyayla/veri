---
id: DEC-089
type: decision
title: "Registry entries may declare responsibilities — an additive, validated list feeding the module detail panel"
status: active
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-068
    rel: constrains
  - id: DEC-059
    rel: extends
  - id: DEC-058
    rel: follows-from
---

## Choice

A module registry entry ([[DEC-059]]) may carry an optional
`responsibilities:` list — short declared statements of what the module
owns — rendered in the Architecture view's detail panel under
"Responsibilities — declared · registry" ([[SRC-036]]). Absent, surfaces
fall back to the entry's one-line `purpose`.

```yaml
modules:
  - name: core
    path: packages/core
    purpose: Pure domain logic
    responsibilities:
      - Owns parse, validate, check, and assembly
      - Pure functions over veri/ — no I/O, no surface imports
```

The field joins the registry entry's zod schema in core, so a malformed
list (a bare string, an empty item) is an invalid-frontmatter issue on the
workflow document — the DEC-058 posture that a machine-read field silently
misparsing is worse than no field. Nothing else consumes it: constraints,
the projection, the check tier, and every CLI printout are unchanged, and
registries without the field parse byte-identically.

## Rejected alternatives

- **Deriving responsibilities from code (exports, README headings)** — the
  panel's other sections are already discovered; this section exists to
  carry *intent*, which only humans can assert. The derived/authored split
  says write only what code cannot explain — and what a module is *for* is
  exactly that.
- **Prose in the workflow body instead of frontmatter** — invisible to the
  panel without a parsing convention, and DEC-059 already established the
  registry as structured frontmatter; splitting an entry's fields across
  frontmatter and body would be the three-places drift problem again.
- **A separate per-module document type** — dozens of documents restating
  a list; rejected for the registry itself in DEC-058's survey and no new
  evidence since.
- **Leaving it passthrough-only (no schema)** — REQ-001 would preserve the
  key anyway, but unvalidated: a `responsibilities: everything` typo would
  render nothing and fail nowhere.

## Rationale

The registry rides an approved workflow document, so declared
responsibilities inherit the same approval and drift story as the module
list itself ([[DEC-059]]'s loudness: editing the list moves the document
out from under its stamp). One optional schema field buys the detail
panel's only missing declared section at zero cost to every existing
corpus — the narrowest change that keeps the panel's provenance tags
honest.
