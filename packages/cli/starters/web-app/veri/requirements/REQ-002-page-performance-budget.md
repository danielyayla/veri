---
id: REQ-002
type: requirement
title: Page performance budget
status: draft
created: 0001-01-01
updated: 0001-01-01
---

The app commits to a measurable performance budget, and changes on a
page's critical path are judged against it. A budget nobody measures
is a wish; pick numbers you can defend, write them here, and make the
measurement part of the release path.

## Acceptance criteria

- [ ] The budget is stated in this document: target initial-load time
      on a mid-range device, and a ceiling on shipped script weight per
      page
- [ ] The measurement runs automatically (in CI or a release check),
      not only when someone remembers
- [ ] A change that exceeds the budget is a conversation, not a silent
      regression: it needs this requirement's owner to accept the new
      number
