# Handoff: Advisory Surfacing

## Overview
The advisory tier (WO-025 / DEC-025) made visible in the desktop app.
Advisories are template-structure findings — "this document is missing a
`##` section its type's template expects" — and they are constitutionally
subordinate: they never count as issues, never color a health state, and
never gate anything. The design encodes that in one rule:

> **Issues are amber and filled. Advisories are grey and hollow.**

A project with advisories and no issues must read as *healthy* at every
glance distance: no topbar chip, green "clean" on Home, no amber anywhere.
Advisories appear only where the user is already looking at health detail
(the Home HEALTH card) or at the affected document itself (the reader).

## About the Design Files
`advisory-surfacing.html` is a **self-contained interactive prototype**
(open in a browser) on illustrative "skiff" fixture content. It is a
design reference, not production code. All tokens reuse the canon
(`design/README.md`); shell, tabs, and rail behavior extend the
navigation-model and document-tabs bundles unchanged.

## Fidelity
**High-fidelity for tokens, placement, and the two-tier rules.** Where
this spec is silent on shell behavior, the navigation-model bundle
(SRC-005) applies.

## The advisory idiom
One micro-pattern, reused on every surface:

- **Hollow ring** — 5px circle, 1px border `#6E6B76`, transparent fill.
  The advisory counterpart to the filled amber health dot.
- **Text scale** — advisory messages render muted: message body
  `#8B8893` at 12px sans, ids and kind chips in mono at the faint end
  (`#6E6B76`), never amber, never on a tinted background.
- **Glyph** — where a textual marker is needed, `◦` (hollow bullet), the
  quiet sibling of the issue banner's `⚠`.

No new colors, fonts, or radii — everything is drawn from the existing
token scale.

## Surfaces

### Topbar health chip — byte-for-byte unchanged
The chip's existence, count, tint, and click-through are driven by
issues alone (DEC-025). Zero issues → no chip, regardless of advisories.
Issues present → the chip reads `veri check · N issues` exactly as
today. Advisories never summon, recolor, or append to it.

### Home · HEALTH card — the advisory home
The issue rows and empty state are unchanged. Two additions:

- **Meta line**: stays issue-driven — green `clean` or amber
  `N issues` — and when advisories exist gains a *separate* trailing
  span: `· M advisories` in `#6E6B76`. The green/amber word keeps its
  color; the advisory count is visually parenthetical.
- **ADVISORIES sub-tier**: after the last issue row (or directly under
  the header when there are none), a hairline divider `#1E1E24`, a
  micro-label `ADVISORIES · M` (mono 9.5px, uppercase, letter-spacing
  .1em, `#6E6B76`), then one row per advisory:
  - hollow ring, left-aligned where issue rows show their kind chip;
  - kind chip `missing-section` — mono 10px, 1px border `#26262C`, text
    `#6E6B76`, no fill (vs. the issue kind chip's stronger presence);
  - doc id in its type color at full strength, title omitted;
  - message in 12px `#8B8893`, single line, ellipsized.
  - Row hover `#1B1B20`; click navigates to the document, same as issue
    rows.

With zero issues *and* zero advisories the card is pixel-identical to
today ("No issues — veri check is clean").

### Reader — the advisory strip
Issues keep the amber `warn-banner` unchanged. Advisories get a
**strip**, not a banner: placed *after* the frontmatter properties card
and before the markdown body (below the fold of the document's identity,
above its content — seen when reading, invisible when glancing).

- One line per advisory: `◦` in `#6E6B76`, then the one-line message in
  mono 11px `#8B8893`. No background, no border, no icon weight —
  vertical padding 4px, nothing else.
- Trailing affordance per line: `template ↗` in mono 10.5px `#55525E`,
  hover `#8B8893` — opens the Templates view (WO-024) at this
  document's type, since the fix is either "add the section" or "change
  the template". This is the only interaction the strip owns.
- The strip never appears in edit mode (the editor is for writing, not
  auditing) and disappears the moment the document or template changes
  make the finding moot (DEC-002 — next snapshot rebuild).

### Sidebar tree — hollow ring
Row indicator precedence, right-aligned slot (one indicator per row):

1. **amber dot** (`sb-health`, filled `#D9A03F`) — the doc has issues;
2. **green ✓** — done/retired docs, as today;
3. **hollow ring** — the doc has advisories (and no issue, and is
   living).

A done work order with an advisory shows ✓ — completed state outranks a
formatting whisper. Tooltip on the ring: `N advisory·ies — see document`.

### Board, project switcher, work-order cards — unchanged
The board's card health dot, the switcher's `proj-issue-dot`, and linked
document cards stay issue-only. Advisories add nothing there.

## Live behavior
All surfaces derive from the snapshot; the snapshot carries the full
`CheckResult` (`issues` + `advisories`) and rebuilds on every file
change (DEC-002). Editing `veri/templates/<type>.md` — in the Templates
view or externally — recomputes every advisory on the next rebuild with
no restart. Nothing is cached, dismissed, or persisted.

## State management
- Snapshot: `advisories: Advisory[]` alongside the untouched `issues`.
- Renderer: `advisoriesByDoc(snap)` mirroring `issuesByDoc` (an
  advisory has exactly one `file`).
- No new persistent or session state — advisories have no
  dismissed/read state by design (muting is out of scope per WO-026;
  wanting it means filing a proposed decision).

## Design tokens
No new tokens. Ring border and micro-labels `#6E6B76`, message text
`#8B8893`, ghost affordance `#55525E`, dividers `#1E1E24`, chips
bordered `#26262C`, hover `#1B1B20`; type colors and amber/green
health colors unchanged from `design/README.md`.

## Explicitly deferred (do not build)
Advisory dismissal/muting/acknowledgement, advisory counts on board
cards or the project switcher, a topbar advisory affordance, template
conformance indicators inside the Templates view, and any check beyond
`missing-section`. Each waits for its own design/decision.

## Assets
None — glyphs are unicode (◦ ⚠ ✓ ↗).

## Files
- `advisory-surfacing.html` — the interactive prototype: Home and a
  reader view on skiff fixture content; toggle the demo's two
  deliberate issues on/off to see that the chip and the health colors
  follow issues alone while the advisory tier stays put; click an
  advisory row to jump to the document and find the strip.
