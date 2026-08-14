---
id: DEC-027
type: decision
title: "Finder launch falls back to MRU, then a native folder picker"
status: active
approved: 2026-08-14
created: 2026-08-14
updated: 2026-08-14
links:
  - id: WO-027
    rel: constrains
  - id: DEC-010
    rel: extends
  - id: DEC-017
    rel: extends
---

## Choice

When the app starts without a usable project root — no explicit
argument and no Veri project on the walk up from cwd, which is every
Finder/Dock launch (cwd `/`) — the main process resolves the root
through a fallback chain before any window exists:

1. the most recent MRU entry that still passes `isVeriProject`
   ([[DEC-010]], [[DEC-017]]);
2. failing that, a native open-directory dialog. A picked folder that
   is a project opens; one that is not gets a native message box
   offering *Choose Again* or *Quit*. Cancel quits cleanly. Nothing is
   written in any branch.

The renderer is never booted without a valid project root, so the
existing snapshot contract is unchanged.

## Rejected alternatives

- **A project-less welcome state in the renderer** (open/new buttons,
  recents list) — a real designed surface: [[DEC-012]] gate, renderer
  state for "no project", and a second boot path through
  `buildSnapshot`. Right long-term shape, wrong size for unbreaking
  the packaged launch; nothing here forecloses it later.
- **Auto-opening the bundled demo** — surprising ("whose files are
  these?"), and the demo inside a packaged app bundle is not a place
  user work should land ([[DEC-007]] ships it as scaffold material,
  not as a workspace).
- **Error dialog and exit** — treats a normal double-click as a
  failure; first-run users would bounce off the app with no path
  forward.

## Rationale

Every launch path funnels into the same invariant — `projectRoot` is a
valid project before `createWindow` — which is exactly the invariant
the rest of main.ts already assumes (watchers, snapshot, MRU writes).
The chain reuses two decided mechanisms (MRU list, shape-based
detection) and adds only native OS chrome, so the design gate stays
satisfied by a note ([[DEC-026]]).
