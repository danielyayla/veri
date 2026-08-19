---
id: WO-060
type: work-order
title: "Appearance settings — light mode and theme preference"
status: backlog
created: 2026-08-19
updated: 2026-08-19
links:
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

- [ ] Design bundle approved and linked `rel: designed-by` before implementation starts ([[DEC-012]])
- [ ] Appearance section offers Light / Dark / System; the choice persists across relaunch
- [ ] System mode follows a macOS appearance change live, without restart
- [ ] Explicit Light and Dark override the OS setting
- [ ] Switching themes updates every open surface (views, popovers, editor, read mode) without restart or visual artifacts
- [ ] No hardcoded colors remain in packages/ui outside the token definition blocks
- [ ] Light palette meets the [[REQ-020]] accessibility floor: contrast holds and no state is color-only in either mode
- [ ] `veri check` and `npm test` are clean

## Receipts

(none yet)
