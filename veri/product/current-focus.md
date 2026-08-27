---
id: PRD-004
type: product
title: "Current focus"
status: accepted
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: REQ-037
    rel: derived-from
---

**Closing the loop the product layer opened** ([[REQ-037]],
[[REQ-038]], [[REQ-039]] — all shipped in core, CLI, and MCP): the
layer is live; the current focus is making its judgments true rather
than merely mechanical.

- **Evidence backfill**: the intuition-only advisory surfaced 27
  accepted requirements with no derived-from link to any source.
  Each needs a human verdict — link the evidence it actually came
  from, or retire it. No link gets invented to silence an advisory.
- **Source kinds**: the 56 existing sources default to `reference`;
  reclassifying the ones that are really design, user-feedback,
  metric, or outcome makes the evidence ratio honest.
- **Release the new core**: format 3 means the installed Veri.app
  and any stale MCP server refuse the project until a release ships
  ([[REQ-015]] working as designed). An app release with the new
  core is the unblock.
- **Surface the layer in the UI**: intent, bets, and kind chips are
  design-gated follow-ups — design SRCs before work orders.

Steering rationale: DEC-111's pivot holds — Veri is the system of
record for product intent, and the WHY layer only earns its place if
its advisories change what gets built. The test of this focus is
whether the open loops above close with real evidence, not stamps.

Also open: [[REQ-035]]'s untested bet — the intent home shipped
(WO-117) and awaits outcome evidence from real use.
