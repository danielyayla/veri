---
id: WO-057
type: work-order
title: "Find in document"
status: done
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-009
    rel: implements
  - id: SRC-029
    rel: designed-by
  - id: SRC-016
    rel: derived-from
---

## Summary

⌘F, per [[SRC-029]]: one find bar (labeled input, `3/17` count, ‹ › buttons, Enter/Shift+Enter cycling with wrap, Escape closes, count announced via aria-live per [[REQ-020]]) floating below the tab strip, case-insensitive substring, no options. Two backends behind the one bar: edit mode drives `@codemirror/search`'s programmatic API (the one new dependency, CM6's own panel disabled); read mode finds matches in the rendered text and paints them with the CSS Custom Highlights API — no DOM mutation, so chips, previews, and listeners stay untouched. The bar follows mode toggles, closes on navigation and tab switch, and joins `inTextTarget` so ⌘[/⌘] keep working. Closes [[SRC-016]]'s "no find-in-document."

## In scope

- The find bar component (one implementation, `.pv-pop` shadow register, existing tokens), ⌘F binding, Enter/Shift+Enter/Escape, ‹ › buttons, aria-live count
- Edit-mode backend: add `@codemirror/search`, drive `SearchQuery`/`setSearchQuery`/`findNext`/`findPrevious` programmatically, map match highlights onto existing selection/flash tokens, disable CM6's built-in panel/keymap
- Read-mode backend: text walk over the rendered content + `CSS.highlights` ranges, stronger current-match highlight, scroll-into-view on navigation
- Mode-toggle handoff (⌘E re-runs the query against the other backend), close on navigation/tab switch, `inTextTarget` inclusion
- Tests for the pure match logic and bar state; backend smoke coverage where the harness allows

## Out of scope

- Regex, whole-word, or case-sensitivity options (add only on evidence)
- Replace
- Project-wide search surfaces (palette, Search view, shared library)
- Persisting the query anywhere

## Requirements

- [[REQ-009]] — implements
- [[SRC-029]] — designed-by
- [[SRC-016]] — derived-from

## Acceptance tests

- [x] ⌘F over a reader doc finds all case-insensitive matches, shows the right count, cycles with wrap in both directions, and highlights without altering the rendered DOM (chips still navigate and preview)
- [x] The same query in edit mode highlights via CM6 and cycles identically; toggling ⌘E carries the query across backends
- [x] Escape closes and clears highlights in both modes; navigation and tab switch close the bar; ⌘[/⌘] work while the bar's input is focused
- [x] Zero matches shows `0/0` with both nav buttons disabled and no highlights
- [x] `veri check` stays at zero issues; full typecheck and test suite pass

## Receipts

- 2026-08-19 — a60edf3 — packages/ui/src/renderer/findlogic.ts, packages/ui/src/renderer/findlogic.test.ts, packages/ui/src/renderer/find.ts, packages/ui/src/renderer/app.ts, packages/ui/src/renderer/editor.ts, packages/ui/renderer/styles.css, packages/ui/package.json, package-lock.json — ⌘F find bar shipped per SRC-029 — one bar (labeled input, aria-live 3/17 count, ‹ › buttons, Enter/Shift+Enter wrap, Escape layer, closes on navigation/tab switch/pane focus change), edit mode via @codemirror/search's programmatic API behind a hidden panel, read mode via a text-node walk painted with CSS Custom Highlights (zero DOM mutation), ⌘E carries the query across backends; DEC-054 filed (proposed); verified visually via the screenshot harness in read, edit, and 0/0 states; typecheck clean, 471 tests pass (454 baseline + 17 new), veri check 0 issues · 0 advisories (the pre-existing 9 receipt-prefix advisories were cleared mid-session by commit a998bd0 from a parallel session; this order adds none)
