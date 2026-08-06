---
id: REQ-003
type: requirement
title: Client data stays local
status: accepted
created: 2026-07-16
updated: 2026-07-17
links:
  - id: DEC-004
    rel: no-cloud-sync
---

No client PII ever leaves the machine. No telemetry containing document
content. See [[DEC-004]] for the sync stance.

## Acceptance criteria

- [x] Network audit shows zero outbound calls with document payloads
