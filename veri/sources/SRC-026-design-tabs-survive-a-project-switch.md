---
id: SRC-026
type: source
title: Design — Tabs survive a project switch
status: imported
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-016
    rel: designs
  - id: SRC-018
    rel: builds-on
  - id: SRC-016
    rel: derived-from
  - id: DEC-014
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
---

> Drafted 2026-08-19 by an agent session (Claude Code) for the tab
> persistence work order, per the DEC-012 design gate, under Daniel's
> P2 implementation directive. Pending Daniel's review. Written spec
> only.

[[SRC-016]] finding 4: "tabs lost on project switch — in a product
whose core act is following WO → REQ → DEC → SRC trails." Today the
switcher's `pointAppAt` reloads the renderer (`main.ts`), destroying
all tab state; only pins and recents survive, because only they live
in the [[DEC-014]] workspace file. Returning to a project should
return to its open tabs.

## What persists: the open set, not the history

The DEC-014 `WorkspaceState` gains additive fields — one target per
tab. Each open tab persists as its *current* target plus its preview
flag; the active tab persists as an index:

```
tabs?: { target: string; preview: boolean }[]
active?: number
```

[[SRC-018]]'s central clause — "history is session state, in memory
only" — holds. A restored tab starts with a single-entry history;
back/forward stacks and scroll positions die with the session, the
open set does not. This is the Obsidian model and keeps the workspace
file small and inspectable.

- **Saved** whenever the tab set changes — open, close, reorder,
  pin, activate, in-place navigation — through the existing
  `saveWorkspace` funnel, fired from `applyTabs` (the single tab
  mutation funnel in `app.ts`). Fire-and-forget, like pins today.
- **Restored** at boot, after the snapshot: targets that no longer
  resolve (`byId` miss, retired ViewKey) are dropped — the load-time
  twin of `retainTabs`; a preview tab restores as the preview tab;
  an empty or absent list falls back to today's single Home tab.
  `?doc=`/`?view=` query params still win over the restored set.
- **The version stays 1**: the field is additive and optional; a
  file without it (or an older app reading a file with it) behaves
  exactly as today. Missing/corrupt still starts clean.

## Dirty buffers stop the switch

Today a project switch silently destroys dirty editor buffers — a
violation of the [[SRC-018]] clause "a dirty buffer is never silently
dropped" that simply predates anyone noticing. The switch (and the
same reload path in Open Project) first checks for dirty editors and
raises the existing Save/Discard/Cancel prompt per dirty document;
Cancel aborts the switch. Only then does the renderer reload.

## Everything unchanged

Pins and recents (shape, caps, load-time filtering), the single
workspace-state.json under Electron userData ([[DEC-014]] — one file,
keyed by project root, never in `veri/`), in-session tab behavior
([[SRC-018]] history, preview, singletons), the switcher UI itself.
