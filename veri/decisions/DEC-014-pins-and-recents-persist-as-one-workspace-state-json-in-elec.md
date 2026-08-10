---
id: DEC-014
type: decision
title: "Pins and recents persist as one workspace-state JSON in Electron userData"
status: active
approved: 2026-08-10
created: 2026-08-10
updated: 2026-08-10
links:
  - id: WO-014
    rel: constrains
  - id: DEC-010
    rel: follows-from
---

> Filed by an agent during the [[WO-014]] session (the decision schema has
> no lower-authority status than `active`). Pending Daniel's review —
> flag or supersede if the format should change.

## Choice

`packages/ui` stores per-project workspace state — pinned doc ids and recently-opened doc ids — in a single `userData/config/workspace-state.json` shaped `{ version: 1, projects: { [absolute project root]: { pinned: string[], recents: string[] } } }`. The renderer loads it once at boot over IPC and saves on every pin/unpin/reorder/doc-open; recents are capped at 10 on save; ids that no longer resolve are dropped at load; a missing or corrupt file starts clean. Nothing is ever written into `veri/`.

## Rejected alternatives

- **A dotfile inside `veri/` or the project root** — syncs one person's navigation state through git to the whole team and pollutes the knowledge base; forbidden by the SRC-005 workspace-vs-knowledge split and against the spirit of DEC-002.
- **Renderer `localStorage`** — opaque binary-ish storage per Electron partition, not inspectable or fixable as a file, invisible to backup, and diverges from the DEC-010 precedent of JSON under `userData/config`.
- **One file per project (hash-named)** — needs a naming scheme, leaves orphan files behind deleted projects, and spreads state across files for no gain at this scale; `recent-projects.json` already proves the single-file shape.

## Rationale

Workspace state is not knowledge (SRC-005 principle 1): it must survive restarts per project but never ride in the repo. A single keyed JSON follows the DEC-010 precedent exactly (plain, inspectable, hand-editable file under `userData/config`), and because the state is disposable navigation convenience, starting clean on corruption is strictly safer than failing.
