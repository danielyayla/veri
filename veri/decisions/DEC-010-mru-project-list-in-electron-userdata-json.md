---
id: DEC-010
type: decision
title: "MRU project list stored as JSON in Electron userData"
status: active
approved: 2026-08-10
created: 2026-08-07
updated: 2026-08-07
links:
  - id: WO-006
    rel: constrains
  - id: DEC-002
    rel: follows-from
---

## Choice

The project switcher's MRU list lives in a single JSON file under
Electron's per-user `userData` directory
(`userData/config/recent-projects.json`): an ordered array of
`{dir, name, accentColor, docCount, issueCount}`, most recent first,
capped at 20 entries. Accent colors are assigned round-robin on first
add and kept stable thereafter. Doc/issue counts are refreshed live
(via `buildSnapshot` per project) whenever the switcher opens; the
persisted counts are just a cache and never authoritative.

## Rejected alternatives

- **A file inside each project's `veri/` directory** — "which projects
  has this user opened" is app-level, per-machine state, not project
  knowledge; writing it into `veri/` would leak one user's history into
  a shared repo and violate the spirit of [[DEC-002]] (project files
  describe the project, not the tooling session).
- **`localStorage` in the renderer** — survives reloads but is scoped to
  the renderer profile, invisible to the main process (which owns
  `projectRoot` and the folder-picker dialog), and awkward to inspect or
  clear; the main process is the natural owner of this state.
- **A settings database (electron-store or SQLite)** — a dependency for
  one small list; DEC-002's no-database stance extends naturally to app
  config this trivial. Plain JSON is diffable and debuggable.

## Rationale

The main process already owns the project root and window lifecycle, so
it owns the MRU too. One JSON file under `userData` is the platform's
blessed location for exactly this kind of state, costs zero
dependencies, and keeps project directories byte-for-byte free of
per-user tooling residue.
