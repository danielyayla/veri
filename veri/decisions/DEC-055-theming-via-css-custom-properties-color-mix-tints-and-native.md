---
id: DEC-055
type: decision
title: "Theming via CSS custom properties, color-mix tints, and nativeTheme"
status: active
approved: 2026-08-19
created: 2026-08-19
updated: 2026-08-19
links:
  - id: WO-060
    rel: constrains
  - id: SRC-032
    rel: follows-from
  - id: DEC-002
    rel: consistent-with
---

## Choice

The two palettes (WO-060, SRC-032) live entirely in the CSS token layer: `:root` holds the dark values, `:root[data-theme='light']` overrides them, and color literals appear nowhere else in the renderer — theme.ts's type/status maps hold `var(--…)` references, and `tint()` builds chip backgrounds with `color-mix(in srgb, <color> N%, transparent)` so inline styles stay theme-reactive. The preference (`system` | `light` | `dark`) is resolved in the main process by Electron's `nativeTheme` (`themeSource` = the pref; `shouldUseDarkColors` = the resolved mode) and persisted as `appearance.json` in the userData config directory beside `recent-projects.json` — app-level and per machine, never in the project tree. The renderer flips one `data-theme` attribute: on the nativeTheme `updated` event at runtime, and synchronously from a `theme` query param at load (main resolves the theme before `loadFile`, and the window's `backgroundColor` is set from the same resolution), so a light launch never flashes dark. Five near-duplicate dark literals were consolidated onto their tokens during the sweep (`#17171C`→`--row-hover-2`, one `.55`-alpha popover shadow→`--shadow-pop`, inks `#16110D`/`#141416`/`#0F0F11`→`--on-accent` `#141414`, `#243026`→`--green-border-2`); each is a ≤5/255 channel drift on hover states, one shadow, and button/logo ink glyphs — imperceptible, and confirmed so by the before/after screenshot diff.

## Rejected alternatives

- **Two generated stylesheets (dark.css / light.css) swapped at runtime** — doubles the sheet, invites drift between copies, and does nothing for inline styles driven from theme.ts.
- **JS-computed theme objects re-rendering every surface on switch** — turns an instant CSS repaint into a full DOM rebuild, loses theme-reactivity for anything not re-rendered (open popovers, CM6 decorations), and reintroduces literals into code.
- **`prefers-color-scheme` media queries instead of a data attribute** — cannot express an explicit Light/Dark override of the OS without duplicating every rule into both a media block and an attribute block; nativeTheme + one attribute expresses all three preferences in one mechanism.
- **Keeping `tint()` as hex→rgba math with per-theme hex maps in JS** — a second copy of the palette to keep in sync with the CSS blocks; `color-mix` reads the one source of truth.
- **Persisting the pref in localStorage** — lives in the renderer profile, invisible to the main process at window-creation time, so first paint and window `backgroundColor` could not be resolved before load; userData JSON is readable before the window exists.
- **Byte-exact preservation of all 134 dark literals (zero consolidation)** — would have required four ink tokens and two shadow tokens distinguishing imperceptible 2–5/255 differences that were almost certainly accidents of hand-tuning, permanently encoding noise into the token vocabulary.

## Rationale

Every color in the app already ends up in CSS (stylesheet rules or inline styles — nothing paints through canvas), so a CSS-variable flip re-themes all surfaces at once, instantly, with no re-render dependency: the one `render()` call on theme change only refreshes text like the Appearance meta card. `color-mix` keeps the canon's "color at 10% alpha" chip formula working when the color is a `var()` reference, which a JS rgba computation cannot do. nativeTheme is the only correct source for "System": it tracks macOS live, including scheduled Auto switching, and setting `themeSource` makes explicit overrides and OS-following the same one code path. The userData JSON sits beside the existing MRU persistence — same mechanism, no new dependency — and keeping it out of the project tree means git, teammates, and context packages never see a personal display preference (a project must render identically for every collaborator).
