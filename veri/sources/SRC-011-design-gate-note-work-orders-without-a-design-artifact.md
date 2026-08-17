---
id: SRC-011
type: source
title: "Design-gate note — work orders without a design artifact"
status: imported
created: 2026-08-13
updated: 2026-08-17
links:
  - id: DEC-012
    rel: documents
---

Note-style source document (per [[WO-010]]'s backfill clause and
[[DEC-026]]): the design-gate check flags any started work order whose
body mentions `packages/ui` but links no design document. The work
orders below link this note with `rel: designed-by` because no separate
design artifact exists for them — each for a recorded reason, not as an
oversight. This note is the explicit exemption record.

## Work orders linking this note

- **[[WO-010]]** — core/CLI work implementing the design-gate check
  itself. Its body necessarily quotes the literal heuristic string
  (`packages/ui`) while defining the rule; the work order changes no UI
  code.
- **[[WO-019]]** — the `veri open` CLI command. The body mentions
  `packages/ui` only when describing the manual launch invocation the
  command replaces; the work changed `packages/cli` only.
- **[[WO-021]]** — workflow document and harness pointer files. Its
  Out-of-scope section explicitly forbids `packages/ui` changes; the
  receipt records only a mechanical type-completion (adding the
  `workflow` doc type to existing exhaustive switches), no designed
  surface.
- **[[WO-025]]** — assembly policy and advisory structure checks in
  core. The receipt lists `packages/ui/src/lib/snapshot.ts` among
  touched files (a mechanical pass-through of the new `CheckResult`
  shape); every visible surface for advisories was deferred to
  [[WO-026]], which carries its own design ([[SRC-010]]).
- **[[WO-027]]** — surviving launches from outside a project. Main
  process only: launch-root fallback and native OS dialogs
  ([[DEC-027]]); no renderer file changes and no designed surface.
- **[[WO-028]]** — packaged releases and auto-update. Build
  configuration, CI, and main-process updater wiring only; renderer
  update UI is in the work order's Out-of-scope list. The whole
  update UX is native OS chrome: a system message box offering
  Restart Now / Later when an update finishes downloading, and the
  standard About panel for version visibility. Nothing to design.
- **[[WO-032]]** — knowledge-base format versioning. Core, CLI, and
  MCP-server work; the app's only surface is a native message box
  stating a format mismatch when a project cannot be opened. No
  renderer changes and no designed surface.
- **[[WO-031]]** — support and feedback loop. Main-process work only:
  a native Help-menu item opening a prefilled GitHub issue, and
  file logging with rotation. The report path is deliberately native
  OS chrome (application menu + default browser); renderer support UI
  is in the work order's Out-of-scope list. No designed surface.
- **[[WO-033]]** — release-CI duplicate-release race fix. Pure CI
  workflow change; the heuristic catches the receipt's mention of
  `packages/ui/package.json` (the version bump for the acceptance
  run). No app code and no designed surface.

Pre-DEC-012 UI work orders (WO-005, WO-006, WO-007) are not listed
here: their designs exist — the [[SRC-001]] mockup line and the
[[SRC-002]] handoff — and they were backfilled with direct
`designed-by` links instead.
