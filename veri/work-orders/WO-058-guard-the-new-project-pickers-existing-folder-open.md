---
id: WO-058
type: work-order
title: "Guard the new-project picker's existing-folder open"
status: done
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-016
    rel: implements
  - id: SRC-026
    rel: designed-by
---

## Summary

[[WO-054]] put the dirty-buffer guard ([[SRC-026]] "Dirty buffers stop
the switch") on the switcher rows, ⌘O, and Open Project, but one reload
path stayed unguarded: the new-project picker's side path, where the
chosen folder already holds `veri/` and is opened as an existing
project. Today the main process opens it inside the
`veri:new-project-pick` handler itself, so the window reloads before
the renderer can check for dirty editors. This work order routes that
open through the same `guardDirtyReload` continuation: the pick handler
reports the existing folder back to the renderer instead of opening it,
and the renderer switches (guarded) so Cancel aborts with nothing
reloaded — the [[DEC-051]] IPC re-shape.

## In scope

- `veri:new-project-pick` stops calling `pointAppAt` for an existing
  project; `NewProjectPick` reports `{ kind: 'existing', dir }` (the
  now-unproduced `opened`/`error` variants retire)
- `switchProject` carries the optional `'existing'` notice so the
  post-reload "veri/ was already here" message survives unchanged
- Both renderer pick sites (the ⌘⇧N / New Project entry and the
  sheet's "Change…") route the existing-folder case through
  `guardDirtyReload`; "Change…" drops the sheet first since it cannot
  scaffold into an existing project

## Out of scope

- The scaffold path's reload (`createProject`): the sheet is reached
  by choosing a fresh folder and the guard question there is design
  work, not a mechanical extension of [[SRC-026]]
- The welcome screen's open path (cold-start mode has no editors, so
  no dirty buffers can exist)
- Any change to the guard prompt itself or to [[WO-054]]'s
  persistence/restore behavior

## Requirements

- [[REQ-016]] — implements
- [[SRC-026]] — designed-by

## Acceptance tests

- [x] New Project… onto a folder that already holds `veri/` with a
      dirty editor open raises Save/Discard/Cancel; Cancel leaves the
      current project, the dirty buffer, and the MRU untouched
- [x] Save and Discard both proceed to the switch, and the reloaded
      window still shows the "Opened the existing project" notice
- [x] The sheet's "Change…" onto an existing project closes the sheet
      and takes the same guarded path
- [x] With no dirty buffers the pick opens the project exactly as
      before; `veri check` stays at zero issues; typecheck and the ui
      test suite pass

## Receipts

- 2026-08-19 — a3a5c2b — packages/ui/src/main.ts, packages/ui/src/renderer/api.ts, packages/ui/src/renderer/app.ts, packages/ui/src/preload.mts, veri/decisions/DEC-051-the-new-project-picker-reports-an-existing-folder-instead-of-op.md, veri/ids — The new-project pick reports an existing folder back (`kind: 'existing'`) instead of opening it in the main process; both renderer pick sites route the switch through `guardDirtyReload` via `switchProject(dir, 'existing')`, so Cancel aborts and the post-reload notice survives. Typecheck clean, 215 ui tests green, veri check 0 issues / 14 advisories (baseline). The three picker-flow boxes were verified manually by Daniel in the running app on 2026-08-19 (Cancel aborts intact, Save/Discard proceed with the notice, "Change…" closes the sheet and guards); done.
