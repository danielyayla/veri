---
id: REQ-012
type: requirement
title: "Website and user documentation"
status: accepted
approved: 2026-08-20
created: 2026-08-17
updated: 2026-08-20
links:
  - id: SRC-012
    rel: informed-by
  - id: REQ-011
    rel: depends-on
---

Veri has a public web presence where a stranger can understand what
it is, download it, and learn to use it — without cloning the repo
or reading developer docs. Today the only written material is the
repository README, which assumes a dev checkout and hand-wired MCP
configuration.

The site serves three audiences in one flow:

- **Evaluators** — a landing page that says what Veri is in one
  sentence a stranger understands, who it is for, and why it beats
  prompting an agent directly, demonstrated with the real loop
  (file a work order → agent pulls the context package → receipt
  lands) as a screenshot or short recording, not prose alone.
- **Installers** — a download action that always points at the
  latest published release ([[REQ-011]]'s feed), with system
  requirements stated (macOS version, and the agent-side Node
  runtime for the MCP connection until that dependency is removed).
- **Learners** — layered documentation: a 10-minute quickstart
  (install → create project → connect agent → file one work order
  → watch the agent use it), a workflow guide covering the
  sources → requirements/decisions → work orders → receipts method,
  per-agent connection pages, and reference material (document
  types, frontmatter, link rels, templates, `veri check` rules,
  troubleshooting including update rollback).

Hosting, domain, and site tooling are decisions to file when work
starts; the default posture is zero standing infrastructure,
consistent with [[DEC-029]]. Docs URLs referenced from the app or
README must be stable across site reorganizations.

## Acceptance criteria

- [x] A person who has never seen the repo can, from the site
      alone: say what Veri does, download the current release, and
      complete the quickstart to a working agent connection
- [x] The download action resolves to the latest published release
      without the site needing an edit per release
- [x] Each supported agent has a connection page: what Veri writes,
      where, and how to verify the connection works
- [x] The workflow guide teaches the method (all five document
      types and the path of work) to a reader with no prior context
- [x] The README leads with the download path and demotes
      build-from-source to a development section
