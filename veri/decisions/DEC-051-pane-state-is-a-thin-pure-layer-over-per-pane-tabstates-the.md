---
id: DEC-051
type: decision
title: "Pane state is a thin pure layer over per-pane TabStates; the focused pane drives all single-valued state"
status: active
approved: 2026-08-19
created: 2026-08-19
updated: 2026-08-19
links:
  - id: WO-055
    rel: constrains
---

## Choice

Split panes (WO-055) are modeled as `PaneState { panes: TabState[]; focused: number }` in a new pure module (`renderer/panes.ts`) layered over the untouched tabs.ts ops. At most two panes; each pane is a complete TabState with its own key allocator (tab keys are unique per pane only — DOM focus keys carry the pane index). The pane layer owns exactly the cross-pane rules: which pane a navigation lands in (always the focused one), the view-singleton rule (a view open in the other pane focuses that pane's tab; a background open of it is a no-op), ⌘\ "Open beside" (reuses a tab showing the target, else opens a new pinned tab; view entries never open beside, being singletons already open in the focused pane), collapse (a pane emptied while split is removed and the survivor keeps its full state and focus), and persistence (`tabs2`/`active2`/`ratio` added additively to the WO-054 workspace shape, written only while split, version unchanged; restore drops a pane-two view that pane one also restored, and collapses to one pane when the second list is absent or restores empty). The editor island stays single-homed by keying `editView` off the focused pane; an edit-mode doc visible in the unfocused pane renders as the reader. Two rendering mechanics ride along: pane-focus-on-mousedown flips state silently in a capture listener and defers the re-render until after the click lands (so the clicked element is not torn out of the DOM mid-gesture), and the divider drag mutates flex-basis directly, committing ratio state and persistence only on mouseup.

## Rejected alternatives

- **Widening TabState itself to know about panes** — rewrites every pure op and its tests for a concern only the shell has; the two-layer split keeps each layer's invariants checkable separately.
- **Globally unique tab keys across panes (shared allocator)** — forces the allocator out of the pure per-pane state or into shared mutable state; pane-scoped DOM keys (`tab:<pane>:<key>`) solve the only real collision (focus restore) without touching tabs.ts.
- **Opening "beside" into the other pane's active tab in place (navigate semantics)** — silently destroys what that pane was showing; a new pinned tab matches the explicit, deliberate nature of the act (and VS Code's "open to the side").
- **Persisting the focused-pane index too** — focus is a liveness cue, not workspace shape; restoring to pane one is predictable and keeps the persisted surface minimal.
- **Re-rendering immediately on pane-focus mousedown** — replaceChildren destroys the element under the pointer before its click fires, breaking every first click into an unfocused pane; the deferred render preserves the gesture.
- **A ResizeObserver/percentage-free pixel divider** — session ratio as a fraction with clamping at use (320px minimums, 50/50 fallback when the window cannot fit two minimums) is stateless across window resizes and trivially pure-testable.

## Rationale

Keeping tabs.ts single-surface means every existing history/preview/close/reorder op, its tests, and its SRC-018 semantics carry over per pane without a rewrite; the pane layer is small, pure, and testable in isolation. Deriving everything single-valued from one focused index is the SRC-027 model verbatim and avoids double-homing per-view transients. Persisting the second list additively preserves WO-054's compatibility property in both directions: a single-pane save stays byte-identical to the pre-split shape, and a pre-split file restores unchanged. The deferred-render mousedown focus and the direct-DOM divider drag are both consequences of the shell's replaceChildren render model — re-rendering inside either gesture would destroy the very elements the gesture is operating on.
