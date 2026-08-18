---
id: WO-027
type: work-order
title: Survive launches from outside a project (Finder/Dock)
status: done
created: 2026-08-14
updated: 2026-08-18
links:
  - id: SRC-011
    rel: designed-by
  - id: REQ-004
    rel: extends
  - id: DEC-027
    rel: constrained-by
  - id: DEC-010
    rel: constrained-by
  - id: DEC-017
    rel: constrained-by
---

## Summary

The packaged app dies to a black window when opened from Finder: cwd
is `/`, `findProjectRoot` falls back to it, `watchProject` throws
`ENOENT` on `watch('/veri')` inside `createWindow` before `loadFile`
runs, and the unhandled rejection leaves the bare `backgroundColor`.
Even without the watcher crash, the renderer cannot boot — `snapshot`
throws when the root has no `veri/`. The app has never had a
launched-outside-a-project mode; give it the minimal one decided in
[[DEC-027]]: fall back to the most recent MRU project, then a native
folder picker. Additionally the packaged binary reads CLI args at a
different offset than `electron .` (no app-path argument), so the
explicit-root argument is read from the wrong slot.

## In scope

- Resolve the launch root through the [[DEC-027]] chain: explicit
  argument → cwd walk-up → most recent valid MRU entry → native
  open-directory dialog with a Choose Again / Quit loop for
  non-project picks. Cancel quits cleanly before any window exists.
- Read the explicit argument at the right index for both launch
  modes (`app.isPackaged` picks argv[1] vs argv[2]).
- Guard `watchProject` so a non-project root can never throw out of
  `createWindow` (belt-and-braces behind the chain).
- All in `packages/ui/src/main.ts` + `lib/` — main process only.

## Out of scope

- Any renderer change: no welcome view, no new state, no styles.
  (Native OS dialogs only — the [[SRC-011]] exemption.)
- Packaging scripts or distribution work.
- Changes to `packages/core`, `packages/cli`, `packages/mcp`.
- Scaffolding a new project from the picker (the WO-018 sheet stays
  the only create path).

## Requirements

Extends [[REQ-004]] — the desktop UI must open from the OS shell,
not only from a terminal inside a project.

## Acceptance tests

- [x] Launch with cwd `/` and no args, MRU holding a valid project →
      that project opens and renders.
- [x] Same launch with an empty (or all-stale) MRU → native picker;
      choosing a project folder opens it. (Superseded by [[WO-030]]:
      the cold-start path now lands on the welcome screen, SRC-013 —
      verified 2026-08-18: empty and all-stale MRU both render the
      welcome screen, and its picker opens a chosen project.)
- [x] Picking a non-project folder → message box loops back to the
      picker; Quit and Cancel exit cleanly; nothing written.
      (Superseded by [[WO-030]]: a bad pick returns to the welcome
      screen with an inline notice and Cancel returns there too —
      the app never quits; the message-box loop survives only on the
      [[REQ-015]] format-mismatch path. Verified 2026-08-18: refused
      folder left untouched, MRU written only after a successful
      open.)
- [x] Stale MRU entries are skipped, not opened.
- [x] Explicit path argument still wins in dev (`electron . <path>`)
      and works in the packaged binary.
- [x] `veri check` and `npm test` are clean.

## Receipts

- 2026-08-14 — commit dab4590 — packages/ui/src/main.ts,
  packages/ui/src/lib/{root,root.test}.ts, DEC-027, SRC-011 —
  claude-code session: DEC-027 fallback chain (MRU → native picker),
  watchProject guard, launchArg for the packaged argv offset; verified
  headlessly via VERI_UI_SHOT (Finder-condition render, stale-MRU skip,
  packaged explicit arg) and empty-MRU launch sits on the picker
  without crashing; 218 tests pass, veri check clean. Dialog
  click-through (open-from-picker, Choose Again loop, Quit/Cancel)
  left for manual confirmation — two acceptance boxes open, status
  stays in-progress.
- 2026-08-18 — 160e17a — ["veri/work-orders/WO-027-survive-launches-from-outside-a-project-finder-dock.md"] — claude-code session: closeout. The two open boxes described the pre-WO-030 bare-picker loop; WO-030's approved welcome screen (SRC-013) superseded that path, so they are checked with supersession notes after verifying current behavior end to end. Headless (isolated --user-data-dir): launch from / with empty MRU and with all-stale MRU (deleted dir + non-project dir) both render the welcome screen, stale entries skipped, MRU file untouched. Click-driven on the real headed app: welcome picker → non-project folder shows the inline "No veri/ directory inside …" notice (app stays alive, refused folder left empty); Cancel returns to the welcome screen; picking this repo opens the full project home, and only that success writes the MRU. 250 tests and veri check clean.
