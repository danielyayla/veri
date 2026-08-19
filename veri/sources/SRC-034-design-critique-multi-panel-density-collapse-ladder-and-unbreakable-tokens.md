---
id: SRC-034
type: source
title: "Design critique — Multi-panel density: collapse ladder and unbreakable tokens"
status: imported
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-016
    rel: designs
  - id: SRC-027
    rel: builds-on
  - id: SRC-033
    rel: builds-on
  - id: DEC-012
    rel: constrained-by
  - id: REQ-020
    rel: constrained-by
---

> **Approved by Daniel 2026-08-19.** Findings and design direction
> accepted as specified; implementation proceeds under [[WO-064]].

> Drafted 2026-08-19 by an agent session (Claude Code) from a
> structured design critique of the app with both panes open
> (screenshot: sidebar + sources browser + two split panes, each with
> its Connections rail, same document in both). Grounded in
> `packages/ui/renderer/styles.css`. Written spec only — awaiting
> Daniel's approval per [[DEC-012]].

When every panel is open, the layout has no compression strategy:
each region keeps its full-width furniture as space shrinks, so the
one thing that should be protected — the reading column — is the only
thing that gives. Roughly 65% of the horizontal space goes to chrome
and context rails while document text squeezes to a ~25-character
measure. The individual panels hold up (conn-card anatomy, local
graph, the mono ID vocabulary); the failure is entirely in how they
share space.

This critique refines the density behavior of [[SRC-027]]'s split
model. It does not touch that model: two panes, same document allowed
in both, editor single-homed — all unchanged.

## Priority findings (the [[WO-064]] scope)

### 1. Rail/content priority inversion

`.panes > .editor-area { min-width: 320px }` while
`.panel-connections { width: 300px }` is fixed and never collapses.
A pane near its floor hands nearly everything to the rail; the reader
column, designed for `max-width: 740px`, gets ~300px. The rail's
effective floor is higher than the content's — inverted priority.

**Direction — a collapse ladder, not just a min-width.** Each pane
gets a narrow state (threshold ≈ 640px pane width, measured on
`.editor-area`; container query or ResizeObserver-driven class). In
the narrow state the Connections rail collapses to a toggle in the
pane header (glyph + link count, e.g. `⧉ 7`); expanding it opens the
rail as an overlay over the content rather than reflowing it. The
user's expand/collapse choice is per-pane session state and wins over
the default. Under window-level pressure the unfocused pane collapses
its rail first — extending SRC-027's unfocused-dimming vocabulary
from paint to space. The type panel (sources browser) auto-collapses
to its narrow mode when a split is active and the window can't hold
both panes above threshold; it is a picker, not a workspace.

### 2. Tokens break mid-identifier

At narrow widths the metadata card wraps IDs and dates across lines
(`SRC-` / `027`, `2026-` / `08-19`), truncates the links count
mid-word (`6 outbou`), and the crumb wraps the same way. The mono ID
grammar is the app's strongest wayfinding; breaking a token in half
is the one thing it must never do.

**Direction:** IDs, dates, and counts are unbreakable
(`white-space: nowrap`) everywhere in the document view — metadata
card, crumb, links row. Below the pane threshold the metadata
key/value grid stacks (label above value) instead of compressing
columns. Where even nowrap can't fit, ellipsize with the full value
on hover/title. No token ever wraps internally at any pane width.

### 3. Display type doesn't scale down

The 24px `doc-title` wraps to three lines in a narrow pane, with the
em-dash alone on its own line ("Design / — / Split panes") — reads as
broken, not prominent.

**Direction:** the title steps down in the narrow state (24px → 18px,
tighter line-height); a line never consists solely of punctuation
(bind the em-dash to its preceding word).

## Secondary findings (recorded, out of scope)

- **Duplicate rails on a mirrored split:** the same document open in
  both panes renders two identical Connections rails and local
  graphs. Allowed by [[SRC-027]] and stays allowed; the collapse
  ladder makes the state cheap rather than forbidding it.
- **Micro-badge legibility:** `imported` status badges and
  `conn-type` labels sit at 9.5–10px in faint tokens — borderline
  against [[REQ-020]] at that size; belongs to a contrast sweep, not
  this layout work.

## What works (do not regress)

Conn-card anatomy scales to any rail width; the divider affordance
(hover thickening, double-click reset, arrow-key resize) is sound;
unfocused-pane dimming is the right vocabulary and this spec extends
it; the mono ID system is exactly why finding 2 matters.
