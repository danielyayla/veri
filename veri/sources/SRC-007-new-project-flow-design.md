---
id: SRC-007
type: source
title: Design handoff — New-project flow (create a Veri project from the app)
status: imported
created: 2026-08-11
updated: 2026-08-13
links:
  - id: WO-018
    rel: designs
  - id: REQ-004
    rel: designs
  - id: WO-020
    rel: designs
---

Design approved by Daniel on 2026-08-11 (in-session review of the
prototype), satisfying the [[DEC-012]] gate for [[WO-018]].

> **Addendum (2026-08-11, approved by Daniel 2026-08-13):** the bundle
> README gains an addendum section — an editable project-name field with
> create-subfolder path composition — as the [[DEC-012]] gate for
> [[WO-020]]. The addendum lives in `design/new-project-flow/`
> (README section + live prototype behavior); [[WO-018]]'s approved
> scope is unchanged by it.

Design handoff for the missing creation path in the desktop UI: today the
app can only open a project that already has a `veri/` directory, so a
first-time user must drop to a terminal for `veri init`. Files live in
`design/new-project-flow/`:

- `README.md` — self-sufficient written spec: the two entry points
  ("New project…" in the project switcher popover and a new `command` row
  kind in the command palette), the picker-first flow, the New project
  sheet (location block, read-only derived name, demo-seed toggle, and a
  what-will-be-written preview), and the three outcomes — created,
  already-a-project, scaffold failed. Copy is final.
- `new-project-flow.html` — self-running prototype, open in a browser.
  The scenario bar switches all seven states; the demo toggle and the
  Create button are live.

No new tokens and no new screens: every value reuses
`packages/ui/renderer/styles.css`, and the sheet borrows the palette's
modal chrome. One existing element changes — the switcher's
"Open project folder…" glyph moves from `+` to `→` so `+` can mean create
on the row beneath it.

Principles carried from the linked decisions: the scaffold is one shared
core function called by both the CLI and the UI ([[DEC-009]]'s reuse
pattern), so `veri init` and the sheet produce byte-identical trees; the
demo toggle copies the shipped demo files verbatim, `COPYFILE_EXCL`
behavior disclosed in the preview ([[DEC-007]]); the sheet shows the write
before it happens and the app holds no project state the files don't
([[DEC-002]]); and the MRU ([[DEC-010]]) is written only after a
successful scaffold, so a failure leaves the list untouched.
