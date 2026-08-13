---
id: SRC-010
type: source
title: "Design handoff — Advisory surfacing"
status: imported
created: 2026-08-13
updated: 2026-08-13
links:
  - id: REQ-004
    rel: designs
  - id: DEC-025
    rel: designs
---

High-fidelity written design handoff for surfacing the advisory tier
([[DEC-025]]) in the desktop app, extending [[REQ-004]]'s
quiet-indicators rule. Files live in `design/advisory-surfacing/`:

- `README.md` — self-sufficient written spec built on one rule:
  **issues are amber and filled, advisories are grey and hollow**. It
  defines the advisory idiom (5px hollow ring, muted text scale, `◦`
  glyph), then each surface: the topbar chip byte-for-byte unchanged
  (zero issues → no chip, whatever the advisory count); the Home
  HEALTH card gaining a muted `· M advisories` meta span and an
  ADVISORIES sub-tier after the issue rows; the reader gaining an
  **advisory strip** — one boxless mono line per advisory between the
  frontmatter card and the body, each with a `template ↗` affordance
  opening the Templates view ([[SRC-009]]) at that type; the sidebar
  tree showing a hollow ring at precedence amber-dot > done-✓ > ring;
  board, project switcher, and linked cards explicitly unchanged.
  Advisory display has no dismissed/read state and recomputes on
  every snapshot rebuild ([[DEC-002]]).
- `advisory-surfacing.html` — self-contained interactive prototype
  (open in a browser; illustrative "skiff" fixture content) with a
  toggle for the fixture's two deliberate issues, demonstrating that
  the chip and health colors follow issues alone while the grey
  advisory tier stays put.

The spec introduces no new design tokens — every color, font, and
radius reuses the canon in `design/README.md`; shell and tab behavior
extend the navigation-model ([[SRC-005]]) and document-tabs
([[SRC-004]]) bundles unchanged. Dismissal/muting, board-card advisory
counts, and Templates-view conformance indicators are explicitly
deferred to their own designs.
