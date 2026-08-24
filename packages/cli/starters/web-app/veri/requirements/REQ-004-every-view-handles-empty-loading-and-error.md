---
id: REQ-004
type: requirement
title: Every view handles empty, loading, and error
status: draft
created: 0001-01-01
updated: 0001-01-01
---

A view is not the happy path plus luck. Every screen that fetches or
lists data defines what the user sees while it loads, when there is
nothing to show, and when the fetch fails — designed states, not
accidents of the rendering framework.

## Acceptance criteria

- [ ] Each data-backed view has an explicit loading state (and avoids
      layout jumps when content arrives)
- [ ] Each list or collection view has a designed empty state that
      tells the user what to do next
- [ ] Failures show the user something honest and actionable — never a
      blank region or a spinner that spins forever
- [ ] These three states are part of a feature's acceptance review,
      not follow-up work
