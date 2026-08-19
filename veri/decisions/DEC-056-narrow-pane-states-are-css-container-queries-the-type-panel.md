---
id: DEC-056
type: decision
title: "Narrow-pane states are CSS container queries; the type-panel auto-collapse is an applyPanes transition with an in-memory memo"
status: active
approved: 2026-08-19
created: 2026-08-19
updated: 2026-08-19
links:
  - id: WO-064
    rel: constrains
  - id: DEC-051
    rel: extends
---

## Choice

WO-064's per-pane narrow state is pure CSS: each `.editor-area` is an inline-size container (`container-name: pane`), and `@container pane (max-width: 640px)` drives every narrow behavior — rail collapse, metadata stacking, title step-down — with a second band, `(min-width: 641px) and (max-width: 780px)` scoped to `.pane-unfocused`, giving the unfocused pane the earlier collapse. No ResizeObserver, no width state, no re-render: the styles track the divider drag live, which mutates flex-basis without a render pass (DEC-051). The block sits at the end of styles.css — its overrides share specificity with the base rules, so source order is the cascade mechanism, stated in the block comment. The JS keeps only what CSS cannot know: the per-pane overlay choice (`connOpen: boolean[]`, session state, never persisted), the pane index a view renders into (`renderPane`, swapped by paneEl like view/docId), and the type-panel auto-collapse — a 1→2 pane transition inside applyPanes closes an open type panel when `window.innerWidth < 1782` (216 sidebar + 280 panel + 6 divider + 2×640 narrow threshold), remembers it in an in-memory `panelAutoClosed` memo, and the 2→1 transition restores it; any manual panel act (togglePanel/openPanel) clears the memo so the user's own management is never overridden.

## Rejected alternatives

- **ResizeObserver driving a `pane-narrow` class** — needs a render (or manual class surgery) per width change, fights the divider drag's render-free flex mutation, and duplicates in JS what CSS evaluates natively; container queries are supported by the shipping Electron's Chromium.
- **Media queries on the viewport** — cannot see pane widths; a 50/25 split has one narrow pane and one wide one at the same window size.
- **CSS-only type-panel hiding (`display:none` under a split+width condition)** — leaves `state.panel` open while the panel is invisible, so a sidebar type click appears dead; the JS transition keeps state and pixels agreeing.
- **Persisting `connOpen` / `panelAutoClosed` into workspace state** — the WO scopes the overlay choice to the session, and a restored auto-close memo could reopen a panel days later; both are liveness, not workspace shape (the DEC-051 focused-index reasoning).
- **Putting the WO-064 CSS block inline with each base rule** — scatters one feature across the file; the single end-of-file block keeps the density contract readable, at the cost of relying on source order, which the block comment states.

## Rationale

Nothing position:fixed lives inside `.editor-area` (the shared popovers append to body/root), so inline-size containment has no stray containing-block effects — verified before adopting. CSS-only width response is the only approach that stays correct during the divider drag, whose flex-basis mutation deliberately bypasses render (DEC-051); any JS-observed width would lag or force renders mid-gesture. The auto-collapse memo lives in memory, not workspace state, because it describes an in-flight courtesy, not workspace shape — restoring a panel after an app restart would surprise. Verified live via the screenshot harness: collapse/expand/persist cycle, unfocused-first band, 320px minimum, panel auto-close and restore, divider arrows and double-click reset.
