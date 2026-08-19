---
id: WO-060
type: work-order
title: "Appearance settings — light mode and theme preference"
status: done
created: 2026-08-19
updated: 2026-08-19
links:
  - id: SRC-032
    rel: designed-by
  - id: REQ-004
    rel: extends
  - id: REQ-020
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
---

## Summary

Fills the [[WO-036]] "Appearance · soon" placeholder with a real Appearance section in Settings, delivering light-mode support alongside the existing dark look: a three-way Light / Dark / System preference (System follows the OS via Electron's nativeTheme), a designed light palette, and the token sweep that makes two palettes possible — today `packages/ui/renderer/styles.css` defines dark-only tokens on `:root` and carries ~134 hardcoded hex values outside the token layer, plus dark-tuned type/status colors in `packages/ui/src/renderer/theme.ts`. Design comes first per [[DEC-012]]: the light palette and Appearance-pane design must be produced, committed as a source bundle, and approved before implementation.

## In scope

- Design bundle (produced and approved before any code, per [[DEC-012]]): the full light palette — a light counterpart for every token in styles.css plus light-tuned variants of the type/status colors in theme.ts — and the Appearance section's anatomy in the Settings view. The bundle also names the shipped default (recommendation: System).
- Token sweep in packages/ui: fold the hardcoded hex values in styles.css and any component-level colors into the CSS variable layer so both palettes flow through one token set.
- Appearance section in Settings replacing the placeholder row: Light / Dark / System control, persisted across launches as an application-level (not per-project) preference.
- System mode tracks the OS appearance live via nativeTheme; explicit Light/Dark override it.
- Live theme switching without restart across all surfaces: sidebar, views, popovers, CM6 editor, and read mode.

## Out of scope

- Custom or user-defined themes beyond the two palettes.
- Per-project theme overrides.
- Redesigning the existing dark palette — dark keeps its current look; only token extraction touches it.
- Theming the marketing site (site/).

## Requirements

- [[REQ-004]] — extends
- [[REQ-020]] — constrained-by
- [[DEC-012]] — constrained-by

## Acceptance tests

- [x] Design bundle approved and linked `rel: designed-by` before implementation starts ([[DEC-012]])
- [x] Appearance section offers Light / Dark / System; the choice persists across relaunch
- [x] System mode follows a macOS appearance change live, without restart
- [x] Explicit Light and Dark override the OS setting
- [x] Switching themes updates every open surface (views, popovers, editor, read mode) without restart or visual artifacts
- [x] No hardcoded colors remain in packages/ui outside the token definition blocks
- [x] Light palette meets the [[REQ-020]] accessibility floor: contrast holds and no state is color-only in either mode
- [x] `veri check` and `npm test` are clean

## Receipts

- 2026-08-19 — 759f2d5 — packages/ui/renderer/styles.css, packages/ui/src/renderer/{theme,editor,app,api,widgets}.ts, packages/ui/src/renderer/views/{settings,home,mcp,workorder,welcome}.ts, packages/ui/src/{main.ts,preload.mts}, packages/ui/src/lib/appearance.ts (+ tests), veri/decisions/DEC-055 — claude-code session: full implementation per SRC-032. Token sweep: styles.css restructured into two token blocks (`:root` dark, `:root[data-theme='light']`), all ~134 literals folded into named tokens with exact-count scripted replacements; theme.ts type/status maps became `var(--…)` references and `tint()` became color-mix, so inline styles re-theme live; renderer TS is literal-free. Appearance section per the bundle (three-tile radiogroup with fixed-color thumbs, meta card, arrow-key rotation, `✓ active` chip, aria-live announce), replacing the WO-036 placeholder in the sub-nav and adding the gear-popover row. Theme model: `system|light|dark` via nativeTheme.themeSource, persisted as userData `config/appearance.json` (DEC-055), first-paint via query param + window backgroundColor so a light launch never flashes dark; VERI_UI_THEME added to the screenshot harness. Verified by screenshot harness in both modes (home, Appearance pane, CM6 editor with frontmatter/link colors), live switch mid-session (boot dark → setTheme('light') → light capture), and persistence across relaunch. Dark no-op proven by pixel diff against a pre-change build: 1,424/5.9M px differ — the intended "Appearance · soon"→"Appearance" row plus the logo glyph's ink consolidation; all five consolidations (≤5/255 drift) are named in DEC-055. Exemptions to the no-literal rule, by necessity: two `#000` alpha-mask gradients (theme-neutral), two window-chrome `backgroundColor` literals in main.ts (CSS vars can't reach Electron window chrome), and the fixed `--mini-*` thumbnail tokens (thumbs always paint their own theme). The System-follows-macOS box is verified by mechanism: an OS flip and an explicit set drive the identical nativeTheme 'updated' → broadcast path, exercised live; the OS toggle itself was not flipped on this machine. Contrast: every palette pair validated computationally (≥7:1 primary/body, ≥4.5:1 secondary/accent/type/status, ≥3:1 faint meta). 481 tests pass across the workspace, veri check clean.
