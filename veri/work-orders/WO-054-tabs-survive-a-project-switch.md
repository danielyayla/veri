---
id: WO-054
type: work-order
title: "Tabs survive a project switch"
status: in-progress
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-016
    rel: implements
  - id: SRC-026
    rel: designed-by
  - id: SRC-016
    rel: derived-from
---

## Summary

"Tabs lost on project switch" ([[SRC-016]] finding 4) ends: per [[SRC-026]], the [[DEC-014]] workspace state gains additive `tabs` (one current target + preview flag per tab) and `active` fields, saved through the existing `saveWorkspace` funnel on every tab-set change and restored at boot with unresolvable targets dropped. History stays session-only ([[SRC-018]]'s clause holds — a restored tab starts with a single-entry stack). The switch also stops silently destroying dirty editor buffers: it raises the existing Save/Discard/Cancel prompt per dirty document before the renderer reloads, and Cancel aborts the switch.

## In scope

- Additive `tabs?: { target, preview }[]` and `active?: number` in `WorkspaceState` (file version stays 1; absent fields behave as today)
- Saving from `applyTabs` (open, close, reorder, pin, activate, in-place navigation), fire-and-forget like pins
- Boot-time restore after the snapshot: drop unresolvable targets (byId miss / retired ViewKey), preview flag honored, `?doc=`/`?view=` params win, empty list falls back to the single Home tab
- Dirty-buffer check on project switch and Open Project: per-document Save/Discard/Cancel via the existing prompt; Cancel aborts the switch
- Tests over the persistence round-trip, unresolvable-target dropping, and restore fallbacks

## Out of scope

- Persisting history stacks, scroll positions, or the editor buffer contents ([[SRC-018]]: history is session state)
- Split panes ([[SRC-027]] — if it lands later it extends this shape)
- Any change to pins/recents shape or caps, or to in-session tab behavior
- Anything written into `veri/` ([[DEC-014]] boundary)

## Requirements

- [[REQ-016]] — implements
- [[SRC-026]] — designed-by
- [[SRC-016]] — derived-from

## Acceptance tests

- [ ] Open several tabs (mixed docs and views, one preview), switch projects and back: the tab set, order, active tab, and preview-ness are restored; each restored tab has single-entry history
- [ ] A restored target that no longer resolves is dropped; a workspace file without the new fields (or corrupt) behaves exactly as today
- [ ] Switching away with a dirty editor raises Save/Discard/Cancel; Cancel leaves the project and all state untouched
- [ ] Nothing under `veri/` changes; `veri check` stays at zero issues; full typecheck and test suite pass

## Receipts

(none yet)
