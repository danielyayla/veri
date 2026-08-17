---
id: REQ-013
type: requirement
title: "First-run onboarding and agent connection verification"
status: accepted
approved: 2026-08-17
created: 2026-08-17
updated: 2026-08-17
links:
  - id: SRC-012
    rel: informed-by
  - id: REQ-004
    rel: depends-on
  - id: REQ-005
    rel: depends-on
  - id: DEC-011
    rel: constrained-by
---

A person who installs Veri with no dev tooling and no existing
project reaches a working state — a project open, an agent
connected and verified — guided entirely by the app. Today the
launch path assumes a project already exists (MRU or folder
picker), empty states are undesigned, and a written MCP config can
be silently broken with no way to tell from inside Veri.

- **First run has a designed path.** On launch with no known
  projects, the app offers to create a new project or open a
  bundled sample (the demo-as-real-files from [[DEC-007]] is the
  candidate), instead of dropping the user into a bare picker.
- **Empty states teach.** Home view, sidebar, and connection panel
  each communicate what belongs there and what to do next when
  the project has no documents.
- **The agent connection is verifiable.** After Veri writes an
  agent config, the user can confirm from inside Veri that the
  connection actually works — not just that a file was written.
  Failure states name the cause where detectable.
- **The runtime dependency is handled, not assumed.** Configs Veri
  writes today launch the MCP server with the user's own `node`
  ([[DEC-011]]); a machine without Node >= 20 fails silently at
  agent time. Either the dependency is removed (e.g. the config
  targets a runtime the app ships) or its absence is detected and
  surfaced with guidance at connection time. The mechanism is a
  decision to file when work starts.
- **Configs survive updates.** A config written by version N keeps
  working after the app self-updates to N+1.

All UI surfaces here are design-gated per [[DEC-012]].

## Acceptance criteria

- [ ] On a clean machine with no prior projects, first launch
      leads to an open project (new or sample) without the user
      consulting external docs
- [ ] Every primary surface has a designed empty state for a
      project with no documents
- [ ] After connecting an agent, the user can trigger a check from
      inside Veri that proves the MCP server is launchable and
      serving the open project
- [ ] Connecting on a machine without a usable Node runtime
      produces guidance at connection time, not a silent failure
      at agent time
- [ ] An agent config written before a self-update still resolves
      to a working server afterward
