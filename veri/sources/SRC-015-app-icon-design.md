---
id: SRC-015
type: source
title: Design — macOS app icon (check-V)
status: imported
created: 2026-08-18
updated: 2026-08-18
links:
  - id: DEC-012
    rel: constrained-by
---

> **Approved by Daniel 2026-08-18** (chat session: direction B chosen
> from three sketches). The design bundle lives in `design/app-icon/`.

## The mark

A single ember stroke that reads as both the letter V and a
checkmark — Veri's name and its verification purpose in one shape —
on the app's dark ground. All colors come from the app palette
(`packages/ui/renderer/styles.css`): ground `#101013`–`#1C1C22`,
hairline border `#2E2E36`, ember stroke `#DE6430`→`#F0A87E`.

The body follows the macOS Big Sur icon grid (824×824 squircle,
corner radius 186, corners baked in — macOS does not mask app
icons), so the icon sits flush with native icons in the Dock.

## Alternatives considered

- **A — Ember tile**: the existing topbar glyph (18px ember square,
  mono "v") scaled to a full icon. Strongest Dock presence and most
  literal continuation of the in-app brand, but reads as a generic
  letter tile.
- **C — Verified record**: ledger lines with an ember check seal.
  Tells the product story (records, verified) most explicitly, but
  carries too much detail to stay legible at 32px Dock sizes.

Direction B was chosen as the most distinctive mark that stays
legible at every Dock size.

## Artifacts

- `design/app-icon/veri-app-icon.svg` — canonical 1024×1024 source.
- `design/app-icon/README.md` — geometry notes and the command that
  regenerates `packages/ui/build/icon.png` from the SVG.
