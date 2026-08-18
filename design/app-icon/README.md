# Veri app icon

The macOS app icon: a single ember stroke that reads as both the
letter V and a checkmark ("check-V"), on the app's dark ground.
Chosen by Daniel on 2026-08-18 from three sketched directions:

- **A — Ember tile**: the topbar glyph (ember square, mono "v")
  scaled up. Rejected: strong Dock presence but reads generic.
- **B — Check-V** (chosen): name and verification purpose in one
  mark; most distinctive, legible down to 32px.
- **C — Verified record**: ledger lines with an ember check seal.
  Rejected: most literal product story, but too detailed at small
  Dock sizes.

## Files

- `veri-app-icon.svg` — canonical source, 1024×1024 viewBox.
  Colors come from the app palette (`packages/ui/renderer/styles.css`):
  ground `#101013`–`#1C1C22`, hairline `#2E2E36`, ember stroke
  `#DE6430`→`#F0A87E`.

## Geometry

macOS Big Sur icon grid: squircle body 824×824 at (100,100),
corner radius 186, corners baked into the artwork (macOS does not
mask app icons). The stroke is optically centered: raw path
endpoints (300,406) (486,712) (726,312), width 96, round caps.

## Regenerating the build asset

`packages/ui/build/icon.png` (1024×1024) is rendered from the SVG;
electron-builder converts it to `.icns` automatically at package
time. To regenerate after editing the SVG:

```bash
qlmanage -t -s 1024 -o /tmp design/app-icon/veri-app-icon.svg && mv /tmp/veri-app-icon.svg.png packages/ui/build/icon.png
```
