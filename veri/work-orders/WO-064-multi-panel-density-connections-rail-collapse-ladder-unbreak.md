---
id: WO-064
type: work-order
title: "Multi-panel density — Connections-rail collapse ladder, unbreakable tokens, narrow-pane title scale"
status: done
created: 2026-08-19
updated: 2026-08-19
links:
  - id: SRC-034
    rel: designed-by
  - id: REQ-016
    rel: extends
  - id: REQ-020
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
  - id: WO-055
    rel: follows-from
---

## Summary

Ships the three priority findings of [[SRC-034]]: with both panes open, the layout has no compression strategy — the reading column is the only region that gives. The Connections rail is a fixed 300px inside a pane whose whole floor is 320px (`.panes > .editor-area { min-width: 320px }` vs `.panel-connections { width: 300px }`), so a narrow pane hands nearly everything to the rail and body text drops to a ~25-character measure. At the same widths, IDs and dates wrap mid-token in the metadata card and crumb (`SRC-` / `027`), the links count truncates (`6 outbou`), and the 24px doc-title wraps to three lines with the em-dash alone on a line. This WO gives each pane a narrow state with a collapse ladder (rail collapses to a header toggle, expands as an overlay; type panel auto-narrows when a split is active), makes IDs/dates/counts unbreakable with a stacked metadata layout below the threshold, and steps the title down in narrow panes. SRC-027's split model is untouched: two panes, same document allowed in both, editor single-homed.

## In scope

- A per-pane narrow state (threshold ≈ 640px on `.editor-area`, container query or ResizeObserver-driven class) that drives all narrow behaviors below
- Connections rail auto-collapse in the narrow state: a pane-header toggle (glyph + link count) replaces the rail; expanding opens it as an overlay over content instead of reflowing; the user's per-pane choice is session state and wins over the default
- Under window-level pressure, the unfocused pane collapses its rail before the focused pane (extends SRC-027's unfocused-dimming vocabulary from paint to space)
- Type panel (sources browser) auto-collapses to its narrow mode when a split is active and the window cannot hold both panes above threshold
- `white-space: nowrap` on IDs, dates, and counts in the metadata card, crumb, and links row; ellipsis + full value on hover where nowrap cannot fit
- Metadata key/value grid stacks (label above value) below the pane threshold; the links count row renders fully
- doc-title steps down (24px → 18px, tighter line-height) in the narrow state; no line ever consists solely of the em-dash

## Out of scope

- Any change to SRC-027's split model: two panes max, same document in both panes stays allowed, editor single-homing and focus semantics untouched
- Blocking or deduplicating mirrored splits — the collapse ladder makes the state cheap; it is not forbidden
- Redesign of conn-card anatomy, the local graph, or the Connections rail's content
- Contrast fixes for the 9.5–10px `imported` / `conn-type` micro-badges (recorded in SRC-034; a separate sweep if wanted)
- New color tokens — layout and typography only, existing tokens throughout (DEC-055)
- Divider mechanics (min widths, double-click reset, arrow-key resize) — must not regress, but are not reworked

## Requirements

- [[SRC-034]] — designed-by
- [[REQ-016]] — extends
- [[REQ-020]] — constrained-by
- [[DEC-012]] — constrained-by
- [[WO-055]] — follows-from

## Acceptance tests

- [x] With a pane at its 320px minimum, the Connections rail is collapsed and the reading column receives the space; the header toggle expands the rail as an overlay and collapses it again, and that choice persists for the pane within the session
- [x] No ID, date, or count in the document view wraps mid-token at any pane width; where space runs out the value ellipsizes and the full value is available on hover
- [x] Below the pane threshold the metadata card stacks label-above-value and the links count row is fully visible
- [x] The doc-title renders at the reduced size in a narrow pane and never produces a line consisting only of the em-dash
- [x] With both panes open and the window narrowed, the unfocused pane's rail collapses before the focused pane's
- [x] Opening a split auto-collapses the type panel when the window cannot hold both panes above threshold; closing the split restores it
- [x] Divider min widths, double-click reset, and arrow-key resize (REQ-020) behave exactly as before
- [x] `veri check` and `npm test` are clean

## Receipts

- 2026-08-19 — fdc093d — packages/ui/renderer/styles.css, packages/ui/src/renderer/{app,widgets}.ts, packages/ui/src/renderer/views/{reader,editor,workorder}.ts, veri/decisions/DEC-056 — claude-code session: full implementation per SRC-034. Narrow state is CSS container queries on `.editor-area` (DEC-056, proposed): ≤640px collapses the Connections rail to a crumb-row toggle (`⧉` + link count, ≥24px target) that expands it as a right-anchored overlay — per-pane session state (`connOpen`), the pane index threaded via `ctx.renderPane`; a 641–780px band scoped to `.pane-unfocused` collapses the unfocused pane's rail first; the same contract rides into edit mode. Tokens: nowrap + ellipsis/title on fm-mono values, chips, conn ids, and crumb children; the metadata card stacks label-above-value below the threshold; `displayTitle()` binds spaced em-dashes (nbsp) and the title steps to 18px when narrow. Type panel: a 1→2 pane transition in applyPanes under 1782px window width closes an open panel into an in-memory memo, the 2→1 transition restores it, and manual panel acts clear the memo. Verified live via the screenshot harness at 1560px: 50/50 split (unfocused rail collapsed, focused inline), 597px pane (18px title, stacked card, links row fully visible), 320px minimum, overlay expand/collapse/re-expand persisting (probe: open0=true after the cycle), divider arrows moving 24px/press, double-click reset measured back to 669/669, panel auto-close on ⌘\ and restore on split collapse — one cascade fix found and corrected live (the WO-064 block moved after the base rules it overrides). No new color tokens (DEC-055); SRC-027's split model untouched. 481 tests pass, typecheck and bundle clean, `veri check` 0 issues.
