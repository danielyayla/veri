---
id: DEC-054
type: decision
title: "One find bar, two highlight backends — CM6 search API in edit mode, CSS Custom Highlights in read mode"
status: proposed
created: 2026-08-19
updated: 2026-08-19
links:
  - id: WO-057
    rel: constrains
---

## Choice

The ⌘F find bar (WO-057) is a single component bound to the focused pane's active document tab, but the match/highlight engine is per mode. Edit mode adds @codemirror/search as packages/ui's one new dependency and drives it programmatically — SearchQuery/setSearchQuery plus the findNext/findPrevious commands — with the built-in panel neutralized by a createPanel that returns a hidden empty div (the match highlighter only paints while a panel is "open") and searchKeymap deliberately absent. Read mode walks the rendered pane's text nodes, matches in a pure module (findlogic.ts), and paints via the CSS Custom Highlights API (CSS.highlights registry + ::highlight() rules) so the rendered DOM is never mutated — chips, hover previews, and their listeners stay untouched. Both backends share the same pure matcher (case-insensitive, non-overlapping — the same semantics as CM6's highlight cursor), so the 3/17 count agrees across a ⌘E handoff. Typing and stepping patch the bar's count/buttons in place instead of re-rendering, so the input keeps its caret and the count span works as a genuine aria-live region.

## Rejected alternatives

- **window.find() / native find-in-page (Electron's webContents.findInPage)** — paints browser-chrome highlights with no styling control, no per-pane binding, no count/current API robust enough for the 3/17 display, and cannot scope to the focused pane's document.
- **Span-wrapping highlighter in read mode** — mutating the rendered DOM breaks chip listeners and hover previews, fights the rebuild-from-state renderer on every pass, and makes cleanup fragile; ruled out by SRC-029's explicit no-mutation requirement.
- **Hand-rolled CM6 decorations for edit mode** — re-implements what @codemirror/search already does (wrap, scroll, selected-match class) and diverges from the WO's named API; the dependency is small and already part of the CM6 family the editor bundles.
- **Enabling CM6's own search panel/keymap** — ships a second, differently-styled find UI and a competing Mod-F binding; the design demands one bar for both modes.
- **Re-rendering the app on every keystroke/step** — the full rebuild would tear the bar's input out from under the caret, drop CM6 scroll state, and make the count span's aria-live announcements unreliable (a recreated live region does not announce).

## Rationale

The two surfaces are irreconcilable at the engine level: the editor is a CM6 buffer where positions are document offsets and highlight painting must ride decorations, while the reader is a rebuilt-from-state DOM where any mutation-based highlighter (wrapping matches in spans) would break WO-047's hover previews, WO-056's link chips, and every attached listener on rebuild. CSS Custom Highlights paint ranges without touching the tree — exactly the no-mutation contract SRC-029 demands — and the app's Chromium (Electron 38) supports them natively. Reusing @codemirror/search rather than hand-rolling editor decorations buys wrap-around navigation, scroll-into-view, and selection-aware current-match styling for free; the hidden-panel trick is the narrowest way to activate its highlighter without its chrome, keeping the app's bar the only find UI. Sharing one pure matcher keeps counts identical across backends and makes the logic testable without a DOM.
