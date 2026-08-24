---
id: REQ-001
type: requirement
title: Accessibility baseline
status: draft
created: 0001-01-01
updated: 0001-01-01
---

Every screen works without a mouse and without sight. Accessibility is
a baseline requirement of each user-facing change, not a cleanup pass
at the end: a feature whose acceptance criteria pass only with a
pointer and good vision is not done.

## Acceptance criteria

- [ ] Every interactive element is reachable and operable by keyboard
      alone, in a sensible focus order
- [ ] Every form control, image, and icon-only button has an accessible
      name a screen reader announces
- [ ] Text and essential UI meet the contrast ratio your team commits
      to (state it here — e.g. WCAG AA)
- [ ] The primary flows are exercised with a screen reader before
      release, and the result is recorded
