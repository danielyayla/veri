# Handoff: Appearance — light mode and theme preference (WO-060)

## Overview
Light-mode support for the desktop app and the Appearance section that
controls it, filling the WO-036 "soon" placeholder. Three deliverables
in one bundle: the **full light palette** (a light counterpart for every
color in the canon), the **Appearance pane** in Settings (Light / Dark /
System), and the **token-sweep rules** that make two palettes possible.
Dark keeps its current look exactly; light is a new rendering of the
same design, not a new design.

## About the Design Files
`appearance-settings.html` is a **self-contained interactive prototype**
(open in a browser): the current shell with the Settings view open at
Appearance. Its `<style>` block is deliberately shaped like the target
implementation — a `:root` token block (dark, today's canon values) and
a `body.light` override block — so the palette below can be read
directly from the file. Click the tiles or arrow-key through them;
System follows the OS via `prefers-color-scheme` (a stand-in for
Electron's `nativeTheme`). Fixture content ("skiff") is illustrative.

## Fidelity
**High-fidelity for the palette and the Appearance pane.** The light
values below are final (every pair contrast-validated, see
Accessibility). Shell chrome in the prototype approximates the shipped
sidebar; where it disagrees with the sidebar-navigation bundle, that
bundle wins.

## Theme model
- One app-level preference: `system` (default) | `light` | `dark`.
  Per machine, stored outside the project — the `veri/` tree, git, and
  the context package never see it (a project must render identically
  for every collaborator).
- `system` tracks macOS live via `nativeTheme` (set
  `nativeTheme.themeSource` from the preference; re-theme the renderer
  when `nativeTheme.shouldUseDarkColors` flips). Explicit Light/Dark
  override the OS.
- Switching re-themes every open surface instantly — views, popovers,
  tabs, CM6 editor, read mode. No restart, no reload, no transition
  animation (the canon has no motion beyond the MCP pulse).
- The shipped default is **System**: first launch matches the Mac.
  Existing users see no change until macOS is in light mode — accept
  that; a dark-pinned migration would make the setting lie.

## The Appearance pane
Standard Settings section grammar (`set-h1` / `set-lede` / 620px body),
sub-nav row `◐ Appearance` under APPLICATION replacing the "soon" row
(same glyph, placeholder styling dropped; the gear popover row likewise
becomes active).

- **Theme picker**: a `radiogroup` of three tiles — System, Light,
  Dark, in that order. Tile: `--card` bg, `--card-border` border,
  radius 9px, padding 10px, flex-equal widths; hover `--hover-border`.
  Selected: `--ember` border + 1px ember ring (box-shadow), and a mono
  9px `✓ active` chip in ember tint — the state is never border-color
  alone (REQ-020).
- **Thumbnails** (64px, radius 6px): miniature shell drawn in fixed
  colors — each thumb always shows its own theme regardless of the
  active one. System is a diagonal-free split: left half light, right
  half dark, mirrored so the two accent bars meet in the middle.
- **Tile labels**: name 12.5px/500 `--body-text` (`--text` when
  selected); mono 9.5px `--faint` sublabel — System's reads
  `follows macOS · dark now` and updates live; Light/Dark read
  `always light` / `always dark`.
- **Meta card** (`set-card`): `theme` → the stored preference (mono);
  `rendering` → what's on screen, e.g. `dark · from macOS`.
- **Footnote** 12px `--muted`: System tracks macOS including scheduled
  Auto switching; switching is instant.

## Light palette
Elevation rises toward white in both modes (bg → panel → card → pop);
interaction states move toward the text pole (dark hover lightens,
light hover darkens). Neutrals keep the canon's warm-violet cast.

| token | role | dark (today) | light |
|---|---|---|---|
| `--bg` | base background | `#0F0F11` | `#F2F1ED` |
| `--side` | sidebar (new token, was hardcoded `#101013`) | `#101013` | `#EFEDE8` |
| `--panel` | topbar / panels | `#131316` | `#EDEBE6` |
| `--card` | cards | `#151519` | `#F8F7F4` |
| `--card-2` | raised cards / kv rules | `#18181D` | `#FBFAF8` |
| `--pop` | popovers | `#1A1A1F` | `#FFFFFF` |
| `--hair` | hairlines | `#1E1E24` | `#E5E3DD` |
| `--card-border` | card borders | `#1F1F24` | `#E0DED7` |
| `--card-border-2` | stronger card borders | `#24242B` | `#D8D5CD` |
| `--int-border` | interactive borders | `#26262C` | `#D0CDC4` |
| `--hover-border` | hover borders | `#2E2E36` | `#BEBBB1` |
| `--hover-border-2` | strong hover | `#3A3A44` | `#A8A59A` |
| `--row-hover` | row hover bg (new token, was `#1B1B20`) | `#1B1B20` | `#E9E7E1` |
| `--text` | primary text | `#E7E4DE` | `#232128` |
| `--body-text` | body text | `#C9C6CF` | `#3B3941` |
| `--secondary` | secondary text | `#A09DA6` | `#5F5C67` |
| `--muted` | muted text | `#8B8893` | `#6B6873` |
| `--faint` | meta text (3:1 floor) | `#6E6B76` | `#8A8792` |
| `--ghost` | ghost text | `#55525E` | `#A3A0AB` |
| `--ghost-2` | ghost-2 | `#4A4852` | `#AFACB5` |
| `--ember` | accent / links | `#E8703A` | `#B54A18` |
| `--ember-hov` | accent hover (was `--ember-light`) | `#F0A87E` | `#9E3F12` |
| `--green` | success / done | `#7FAF8A` | `#3E7350` |
| `--amber` | warning / draft | `#D9A03F` | `#82630C` |

Type colors (theme.ts `TYPE_META`, syntax `[[ID]]` links, swatches):

| type | dark | light |
|---|---|---|
| requirement | `#7EA6C4` | `#3E6E93` |
| decision | `#CFA83D` | `#82630C` |
| work order | `#E8703A` | `#B54A18` |
| source | `#908BA8` | `#655F80` |
| workflow | `#7FAF8A` | `#3E7350` |

Status colors follow the same mapping (`done`/`active` green,
`draft`/`proposed`/`superseded` amber, `in-progress` ember); `backlog`
→ `#6B6873`, `retired` → `#85828C` (meta-weight, 3:1 floor applies).

Derived surfaces:
- **Tint formula unchanged**: chip bg = its color at 10% alpha; the
  darker light-mode colors keep tints legible. Ember active-row tint
  `rgba(181,74,24,0.10)`; green tint `rgba(62,115,80,0.10)`.
- **Popover shadow**: `0 12px 32px rgba(35,33,40,.14)` (borders carry
  more of the separation in light mode).
- **Logo ink** (text on ember surfaces): dark `#0F0F11` → light
  `#FFFFFF` on the darker light-mode ember.
- **Focus ring**: 2px `--ember`, both modes.

Editor (SRC-008 surface), light values: body `#3B3941`; marks/fences
`#A3A0AB`; headings `#232128`/600; code text `#5F5C67` on fenced bg
`#EDEBE6`; frontmatter keys `#6B6873`, values `#3B3941`, guarded keys
`#8A8792`, left border 2px `#E5E3DD`; `[[ID]]` links in light type
colors, unresolved `#82630C` dashed; selection `rgba(181,74,24,0.15)`;
caret `#B54A18`; active line `#EDEBE6` at 60%.

## Token sweep (implementation rule)
All ~134 hardcoded hex values in `styles.css`, plus component-level
colors, fold into the token layer; after the sweep, color literals may
appear **only** inside the two token blocks (`:root` and the light
override). theme.ts's `TYPE_META` / `STATUS_COLORS` become theme-aware
(CSS variables, or a palette pair resolved from the active theme —
implementer's choice, filed as a DEC). The sweep must be a no-op for
dark: screenshot-compare before/after.

## Accessibility
Every light pair was validated computationally (WCAG relative
luminance): primary and body text ≥ 7:1 on all surfaces; secondary,
muted, accent, type, and status colors ≥ 4.5:1 on `--bg` and `--card`;
`--faint`/ghost tones are meta-only and hold ≥ 3:1 on `--bg`. Dark
values were spot-checked and already pass. Keep the checker script in
the receipt's session notes rerunnable — any palette adjustment must
re-run it. The picker is a real `radiogroup`: tiles are buttons with
`aria-checked`, arrow-key rotation, visible focus ring; the selected
state reads through the `✓ active` chip, not color alone (REQ-020).

## State management
- App-level: `themePref: 'system' | 'light' | 'dark'`, persisted per
  machine (mechanism is an implementation DEC — outside the project
  tree is the only hard rule).
- Renderer derives one boolean (`renderDark`) from pref + nativeTheme;
  everything else is CSS.

## Explicitly deferred (do not build)
Custom/user themes, per-project theme overrides, high-contrast mode,
a light app icon, per-window themes, transition animations.

## Assets
None — glyphs are unicode (◐ ⚙︎ ✓). Fonts unchanged.

## Files
- `appearance-settings.html` — the interactive prototype: click or
  arrow-key the tiles; flip your OS appearance to watch System track it.
