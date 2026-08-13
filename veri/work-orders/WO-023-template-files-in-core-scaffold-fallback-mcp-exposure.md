---
id: WO-023
type: work-order
title: Template files in core — scaffold, fallback, MCP exposure
status: in-progress
created: 2026-08-13
updated: 2026-08-13
links:
  - id: REQ-010
    rel: implements
  - id: DEC-023
    rel: constrained-by
  - id: DEC-002
    rel: constrained-by
---

## Summary

Give every project ownership of its document body templates per
[[REQ-010]] and [[DEC-023]]: the scaffold writes the built-in defaults
to `veri/templates/<type>.md`, document creation reads the project's
file with fallback to the built-ins, the loader keeps templates out of
the document graph, and the MCP layer exposes each type's effective
template so agents draft documents in the project's structure. Pure
core/CLI/MCP work — the settings UI ships separately as [[WO-024]] on
top of the core APIs this work order adds.

## In scope

- **Scaffold**: `scaffoldProject` writes `veri/templates/` with one
  body-only markdown file per built-in type (requirement, decision,
  work-order, source, workflow), content identical to today's
  `BODY_TEMPLATES`. Applies to empty and demo scaffolds (demo keeps
  its own files where it ships them).
- **Effective-template API in core**: `getTemplate(veriDir, type)`
  returning the body plus its provenance (`project` | `builtin`), and
  a customized check (project file present and differing from the
  built-in, whitespace-insensitive). Built-in defaults stay exported
  as the fallback.
- **Creation fallback**: `createDocument` uses the project's template
  file when present, the built-in constant when absent. Read fresh on
  every creation — no caching, so an edit takes effect on the next
  created document without restart.
- **Loader exclusion**: `veri/templates/` is not scanned as documents;
  doc counts, the graph, and `veri check` are unaffected by any
  template content, valid or not.
- **MCP exposure**: an MCP-connected agent can retrieve the effective
  template for any type as writing guidance. If the mechanism (context
  package section vs. dedicated retrieval) turns into a non-trivial
  shape choice, file it as a proposed decision per [[WF-001]].
- Colocated `node --test` coverage: scaffold output, project-file
  override, builtin fallback, customized detection, loader exclusion,
  no-restart freshness.

## Out of scope

- The settings UI in the desktop app — that is [[WO-024]], gated on
  its design artifact per [[DEC-012]].
- Any enforcement: `veri check` gains no template-conformance issues,
  not even advisory ones ([[DEC-023]] is generative-only in v1).
- User-defined document types, per-type assembly-policy configuration,
  or the schema-derived checks of [[REQ-006]] — separate work.
- Frontmatter templating of any kind.

## Requirements

Delivers the non-UI acceptance criteria of [[REQ-010]], constrained by
[[DEC-023]] (templates are plain files under `veri/templates/`, out of
the graph, generative-only) and [[DEC-002]] (files are the source of
truth — no second store, no cache).

## Acceptance tests

- [ ] A fresh `veri init` produces `veri/templates/` with five files
      matching the built-in defaults, and `veri check` passes
- [ ] `veri new <type>` in a project with an edited template scaffolds
      the edited body; deleting the file falls back to the built-in
- [ ] The desktop app's creation flow (shared `createDocument` path)
      honors the same override without UI changes
- [ ] A project with arbitrary content in `veri/templates/` shows the
      same document count and check results as without it
- [ ] An MCP-connected agent can retrieve the effective template for
      every built-in type, reflecting project overrides
- [ ] Editing a template file and immediately creating a document uses
      the new content — no restart, no rebuild
- [ ] `npm test` passes with new colocated coverage for all of the
      above

## Receipts

(none yet)
