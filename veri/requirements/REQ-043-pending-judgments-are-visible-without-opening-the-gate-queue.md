---
id: REQ-043
type: requirement
title: "Pending judgments are visible without opening the Gate Queue"
status: draft
kind: hypothesis
outcome:
  metric: "age of the oldest pending item when a Gate Queue pass begins"
  target: "< 24 hours in normal use"
created: 2026-09-02
updated: 2026-09-02
links:
  - id: SRC-076
    rel: derived-from
---

The Gate Queue ([[WO-162]], SRC-076) made the approval pass a surface, but nothing announces that the queue is non-empty: today the app opened on an empty Gates view, and when [[WO-165]] was filed minutes later, only a deliberate ⌘G revealed it. The bet: a small pending-judgment count in ambient chrome — on Home's "Run the gates" entry and/or the sidebar — closes the loop faster, because the user learns there is something to judge without going looking. This is the what, not the how: any glanceable signal that clears itself satisfies it; a notification system does not follow from this requirement and would be its own proposal.

## Acceptance criteria

- [ ] When any gate holds an item, a count is visible from Home without opening the Gates view
- [ ] The signal clears itself when the queue empties — an empty queue shows no badge, no zero
- [ ] The count matches the Gates view's own total (one derivation, two renderers)
