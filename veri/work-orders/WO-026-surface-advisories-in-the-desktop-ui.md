---
id: WO-026
type: work-order
title: "Surface advisories in the desktop UI"
status: done
created: 2026-08-13
updated: 2026-08-13
links:
  - id: REQ-004
    rel: extends
  - id: DEC-025
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
  - id: DEC-002
    rel: constrained-by
  - id: WO-025
    rel: depends-on
  - id: SRC-010
    rel: designed-by
---

## Summary

Make the advisory tier ([[WO-025]], [[DEC-025]]) visible in the
desktop app. Today the UI deliberately shows only issues — the
snapshot passes `checkProject(load).issues` and every health surface
(topbar chip, Home HEALTH card, per-document dots, reader panel)
derives from that list. Advisories exist in the CLI but are invisible
in the app.

This work order extends [[REQ-004]]'s "quiet indicators" language to
the advisory tier: advisories become visible on the affected document
and in the global health area, always visually subordinate to issues
and never counted as one. A project with advisories and no issues
still reads as healthy.

Per [[DEC-012]], implementation may not begin until a design bundle
(`design/<bundle>/`) with a linked source document
(`rel: designed-by`) settles the presentation: where advisories
appear, how the two tiers are distinguished, and what a
zero-issue/some-advisories project looks like. That design is the
first deliverable of this work order, and any policy question it
surfaces (e.g. per-project muting) gets filed as a proposed decision
rather than resolved in the mockup.

## In scope

- **Design bundle first** ([[DEC-012]]): `design/` bundle plus a
  `SRC-` document, linked from this work order with
  `rel: designed-by` before status moves to in-progress.
- **Snapshot carries advisories**: `buildSnapshot` returns the full
  `CheckResult` — `advisories` alongside `issues` — so the renderer
  has both tiers as plain JSON. The `issues` list is untouched.
- **Per-document surfacing**: the reader (and whatever per-document
  indicator the design specifies) shows a document's advisories,
  visually distinct from its issues.
- **Global surfacing**: the Home health area lists advisories after
  issues as a separate sub-tier; the topbar chip's count, color, and
  clean/unhealthy state remain driven by issues alone ([[DEC-025]]).
- **Live per [[DEC-002]]**: editing a template or a document on disk
  updates the advisory display on the next snapshot rebuild, no
  restart.
- Colocated `node --test` coverage: snapshot shape, an
  advisories-by-document derivation mirroring `issuesByDoc`, and the
  health surfaces ignoring advisories.

## Out of scope

- Any change to what counts as an issue, the health chip's
  issue-driven state, or the [[REQ-008]] approval gates — forbidden
  by [[DEC-025]].
- Core, CLI, and MCP behavior — the advisory tier itself shipped in
  [[WO-025]].
- Editing templates from the advisory display — template editing is
  the settings view's job ([[WO-024]]).
- Dismissing, muting, or acknowledging advisories — file a proposed
  decision if the design wants it.
- The check-side `designed-by` enforcement ([[WO-010]] territory).

## Requirements

Extends [[REQ-004]] — "check issues surface as quiet indicators on
affected docs and in a topbar chip" — to the advisory tier
[[REQ-006]] introduced at [[DEC-025]]'s severity. Constrained by
[[DEC-012]] (design artifact before implementation) and [[DEC-002]]
(no caching; the display follows the files).

## Acceptance tests

- [x] This work order links a `designed-by` source document whose
      design bundle covers both the per-document and global surfaces
- [x] The snapshot exposes advisories; the `issues` list and every
      issue-driven count are byte-for-byte unchanged by their presence
- [x] A document missing a template-expected section shows that
      advisory in the UI, visually distinct from issues
- [x] A project with zero issues and some advisories still presents
      as healthy (chip and HEALTH card state), with the advisories
      visible
- [x] Editing the effective template on disk changes the displayed
      advisories without an app restart
- [x] `veri check` stays at 0 issues on this repo and `npm test`
      passes with the new coverage

## Receipts

- 2026-08-13 — commit 91eefcf — packages/ui/src/lib/snapshot.ts,
  packages/ui/src/renderer/{derive,app}.ts,
  packages/ui/src/renderer/views/{home,reader}.ts,
  packages/ui/renderer/styles.css, colocated tests — claude-code session:
  advisory tier surfaced per SRC-010 (Home sub-tier, reader strip with
  template affordance, sidebar hollow ring); chip/board/issue counts
  untouched; live via the recursive veri/ watcher; 209 tests pass.
