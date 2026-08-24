---
id: DEC-001
type: decision
title: Server-rendered pages first, client interactivity as islands
status: proposed
created: 0001-01-01
updated: 0001-01-01
links:
  - id: REQ-002
    rel: satisfies
---

## Choice

Pages render on the server by default. Client-side JavaScript is added
per component, where interactivity earns it — not as the foundation of
every page.

## Rejected alternatives

- **Single-page application for everything** — ships the whole app's
  script weight to read one page, moves routing/state problems into
  the client, and makes the performance budget ([[REQ-002]]) hard to
  hold from day one. Worth revisiting only if the app becomes truly
  app-like (long sessions, heavy local state).
- **Static site with no server rendering** — cheapest to host, but
  this app has per-user state and authenticated views, which a purely
  static build cannot serve.

## Rationale

Server-first keeps the default page cheap, fast, and indexable, and it
degrades gracefully: content is usable before (or without) scripts.
The cost — some duplication between server and client for interactive
islands — is bounded and paid only where interactivity exists. This is
a starting posture for a new project: replace this decision if your
app's shape argues otherwise, and record why.
