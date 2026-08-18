---
id: WO-037
type: work-order
title: macOS app icon
status: done
created: 2026-08-18
updated: 2026-08-18
links:
  - id: SRC-015
    rel: designed-by
  - id: REQ-011
    rel: extends
  - id: DEC-012
    rel: constrained-by
---

## Summary

Gives the desktop app the [[SRC-015]] check-V icon in place of the
stock Electron icon: a rendered `build/icon.png` that
electron-builder converts to `.icns` at package time, plus a
dev-mode Dock icon so unpackaged runs show it too.

## In scope

- Canonical SVG and design notes committed as a bundle in
  `design/app-icon/`.
- `packages/ui/build/icon.png` (1024×1024, alpha) rendered from the
  SVG; electron-builder picks it up from `buildResources` with no
  config change.
- Dev-mode Dock icon in `packages/ui/src/main.ts`
  (`app.dock.setIcon`, darwin + unpackaged only).

## Out of scope

- DMG volume icon / installer background artwork.
- In-app topbar glyph changes (stays the 18px ember square "v").
- Windows/Linux icon formats — the app only targets macOS today.

## Requirements

Extends [[REQ-011]] (installable desktop app distribution): the
packaged app should carry its own identity, not the stock Electron
icon. Designed by [[SRC-015]]; the bundle in `design/app-icon/` is
the visual spec ([[DEC-012]] gate satisfied on its approval,
2026-08-18).

## Acceptance tests

- [x] `packages/ui/build/icon.png` exists, 1024×1024 with alpha,
      rendered from the committed SVG.
- [x] `npm run typecheck` and `npm run build` pass in
      `packages/ui`.
- [x] App launches with the dev Dock icon path in place
      (verified via `VERI_UI_SHOT` smoke run).
- [x] `veri check` reports zero issues.

## Receipts

- 2026-08-18 · f063408 · design/app-icon/{README.md,veri-app-icon.svg},
  packages/ui/build/icon.png, packages/ui/src/main.ts,
  veri/sources/SRC-015-app-icon-design.md — check-V icon designed,
  rendered, and wired into packaging and dev Dock; all acceptance
  tests pass.
