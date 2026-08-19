---
id: SRC-032
type: source
title: Design — Appearance settings, light mode and theme preference
status: imported
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-004
    rel: designs
  - id: REQ-020
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
  - id: SRC-014
    rel: builds-on
---

The design for [[WO-060]]: light-mode support and the Appearance
section that controls it, filling the [[WO-036]] "Appearance · soon"
placeholder. The high-fidelity handoff bundle (README + interactive
prototype) lives in `design/appearance/`.

## What it specifies

- **Theme model** — one app-level preference, `system` (default) |
  `light` | `dark`, stored per machine outside the project tree; the
  `veri/` tree and context packages never see it. System tracks macOS
  live via Electron's `nativeTheme`; switching is instant across all
  surfaces, no restart.
- **The full light palette** — a light counterpart for every canon
  color: the token scale (backgrounds, borders, text), accent, status
  colors, the five type colors, the editor syntax palette, tints, and
  shadows. Two new tokens (`--side`, `--row-hover`) name values that
  were hardcoded. Every pair is WCAG-validated: ≥ 7:1 for primary/body
  text, ≥ 4.5:1 for secondary/accent/type/status text, ≥ 3:1 for
  meta-only faint tones ([[REQ-020]]).
- **The Appearance pane** — Settings section grammar, a three-tile
  `radiogroup` (System / Light / Dark) with fixed-color thumbnails, a
  live meta card (`theme` / `rendering`), keyboard operation, and a
  selected state that never reads through color alone.
- **The token sweep rule** — after implementation, color literals may
  appear only inside the two token blocks; theme.ts's color maps
  become theme-aware. The sweep must be a pixel no-op for dark.

## Deferred

Custom themes, per-project overrides, high-contrast mode, a light app
icon, per-window themes, transition animations — each waits for its
own design.
