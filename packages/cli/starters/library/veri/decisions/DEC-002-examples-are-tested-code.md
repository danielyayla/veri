---
id: DEC-002
type: decision
title: Examples are tested code, not prose
status: proposed
created: 0001-01-01
updated: 0001-01-01
links:
  - id: REQ-001
    rel: satisfies
---

## Choice

Every usage example in the documentation is executable and runs in CI.
An example that stops compiling or stops producing its shown output
fails the build.

## Rejected alternatives

- **Illustrative snippets maintained by hand** — they rot silently;
  the first thing a new consumer copies becomes the first thing that
  doesn't work, and no test ever notices.
- **A separate examples repository** — moves the rot out of sight
  instead of preventing it, and decouples examples from the release
  they document.

## Rationale

Examples are the most-read part of a library's documentation and the
least-verified. Making them tested code turns documentation drift into
a CI failure, and doubles as a living check that the documented public
surface ([[REQ-001]]) actually supports the advertised usage.
