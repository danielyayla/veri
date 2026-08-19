---
id: DEC-045
type: decision
title: "Retire the Decision log view; the Decisions panel is the chronological feed"
status: active
approved: 2026-08-19
created: 2026-08-18
updated: 2026-08-19
links:
  - id: WO-049
    rel: constrains
---

## Choice

Remove the `decisions` view from packages/ui — the ViewKey, its VIEW_META entry (and with it the palette's view row), and views/decisions.ts — per the SRC-023 design note. Each capability the log carried maps to a surviving surface: the chronological feed moves to the Decisions type panel, which now orders by created date, newest first, keeping status chips; superseded signals and the supersession pointer live on the document's frontmatter card and Connections panel; choice and rejected-alternatives summaries are on the document itself and in hover previews (WO-047); the ⌘K "Decisions" row is covered by type:decision filtering and the Decisions sidebar entry. Workspaces that persisted a decisions view tab restore cleanly because tab restore already drops entries whose target no longer resolves — verified by a test, with no data migration. REQ-004 is amended to four screens in the same change; the post-stamp body edit surfaces as a WO-045 drift advisory until Daniel re-approves.

## Rejected alternatives

- **Keep the view and give it a sidebar seat** — promotes the weakest of three redundant lenses (SRC-016) instead of removing one; the Decisions type panel already has the sidebar seat and, ordered by created date, is the same chronological feed with less code to maintain.
- **Fold the decision feed into Home** — Home answers "what needs attention" (WO-015); a full chronological archive of every decision would dilute that job, and the feed already has a natural home in the type panel one click away.

## Rationale

SRC-016 found the Decision log reachable only via ⌘K, present in no navigation, and one of three redundant lenses over the same documents; it sat on the remove-50% list. SRC-014's labeled sidebar made the Decisions type panel the log's natural successor — it has the sidebar seat the log never had. Retiring the view deletes an entire screen's surface area while every capability it carried survives on surfaces that already exist, and old workspaces need no migration because tab restore drops unresolvable targets by design.
