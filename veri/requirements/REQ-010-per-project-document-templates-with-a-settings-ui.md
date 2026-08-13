---
id: REQ-010
type: requirement
title: Per-project document templates with a settings UI
status: accepted
approved: 2026-08-13
created: 2026-08-13
updated: 2026-08-13
links:
  - id: REQ-006
    rel: extends
  - id: REQ-004
    rel: depends-on
  - id: REQ-009
    rel: depends-on
  - id: DEC-002
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
  - id: DEC-018
    rel: informed-by
---

## Purpose

Every document type ships with an opinionated default structure, but
that structure is currently frozen in code. [[REQ-006]] centralized
the per-type rules into one schema owned by core and explicitly
deferred user-editable schemas as future work. This requirement is
that future work: each project owns its own body templates, so one
project can require every decision to carry Context / Decision /
Alternatives Considered / Consequences while another uses a different
shape — and teams can experiment to find the structure that produces
the best results for both humans and agents.

Target user: a project owner tuning their documentation workflow, and
every human or agent who creates documents afterward. Success means:
changing a template changes what every new document of that type
starts from — in the CLI, the desktop app, and agent-drafted
documents — without touching Veri's code.

## What is configurable

The markdown **body** of each document type, per project. The
frontmatter contract — `id`, `type`, `status`, `approved`, `created`,
`updated`, `links` — is *not* configurable: it is what the graph, the
approval gate ([[REQ-008]]), and line-targeted edits depend on, and it
must stay identical across every Veri project. User-defined document
types remain out of scope.

Templates are **generative, not enforced**: they define what a new
document starts from, never a gate on saving or a `veri check`
failure. Structural drift from the template may surface as advisory
guidance at most (see the governing decision for storage and
enforcement posture).

## Settings UI

The desktop app gets a per-project settings view for templates:

1. **Browse** — a Templates section lists every document type; picking
   one shows that project's current template for reading.
2. **Edit** — the template opens in the same markdown editor as any
   document ([[REQ-009]]); saving persists the project's template file
   on disk ([[DEC-002]] — the file is the source of truth, and an
   agent or outside editor sees the same content).
3. **Default vs. customized** — the view distinguishes a type still on
   the built-in default from one the project has customized, and
   offers "reset to default" for a customized type.
4. **Immediate effect** — the next document created (UI, `veri new`,
   or an agent following the context package) starts from the edited
   template. No restart, no rebuild.

Being UI work, implementation requires a design artifact first per
[[DEC-012]].

## Acceptance criteria

- [ ] A project can override the body template for each built-in
      document type; `veri new` and the desktop app's creation flow
      both honor the override, falling back to the built-in default
      when no override exists
- [ ] Frontmatter shape is unaffected by any template customization
- [ ] The settings UI lists all document types, shows each template,
      marks customized types, and supports editing and reset-to-default
- [ ] A template edit takes effect for the next created document
      without restarting the app
- [ ] Context packages expose the project's templates so an
      MCP-connected agent drafting a document follows the project's
      structure
- [ ] `veri check` passes on a project with customized templates and
      never fails a document for diverging from its template
