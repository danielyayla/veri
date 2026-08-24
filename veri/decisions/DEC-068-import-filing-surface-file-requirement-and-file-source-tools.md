---
id: DEC-068
type: decision
title: "Import filing surface: file_requirement and file_source tools; manifests defined by imported-via links"
status: active
approved: 2026-08-24
created: 2026-08-24
updated: 2026-08-24
links:
  - id: WO-075
    rel: constrains
  - id: REQ-024
    rel: implements
  - id: DEC-002
    rel: consistent-with
  - id: DEC-003
    rel: extends
---

## Choice

Two new MCP writeback tools complete the import filing surface: `file_requirement` (born `status: draft`, per REQ-008) and `file_source` (born `status: imported`). An import batch has no registry or marker file: the agent files one ordinary source as the import manifest, then links every mined document to it with `rel: imported-via` and to its evidence sources with `rel: derived-from`. A manifest is mechanically defined as "a source with inbound imported-via links" — grouping in the review queue, the provenance banner line, and import progress all derive from these links alone. `file_receipt` is extended to accept, besides work orders, a source that has inbound imported-via links; the receipt on the manifest is the agent's completion signal (the app's import-done state keys on it).

## Rejected alternatives

- **A dedicated manifest document type or frontmatter marker** — a new type expands the format (REQ-015 migration surface) for what links already express; a magic `kind:` field is a registry hiding in frontmatter.
- **Identifying manifests by title prefix ("Import manifest — …")** — titles are prose, not schema; renaming a document must never change mechanics (REQ-021 spirit: provenance is mechanical, not social).
- **Letting the agent edit the manifest body directly to mark completion** — free-form edits bypass the validated writeback path; receipts are the existing, append-only, never-clobbered completion record (DEC-003) and extending their target set is the smaller change.
- **A bulk file_documents import tool** — one oversized call hides partial failure; per-document tools keep each landing atomic and visible in the app's live feed as it happens.

## Rationale

Everything the import surfaces need — batch membership, evidence provenance, progress, completion — becomes derivable from documents and links on disk, honoring DEC-002 (kill the app mid-import and nothing is corrupt) and REQ-024's mandatory provenance. Reusing the receipt idiom for completion means no new append mechanism and no new schema. DEC-003's scope grows from "work orders" to "work orders and import manifests"; receipts on any other source remain an error.
