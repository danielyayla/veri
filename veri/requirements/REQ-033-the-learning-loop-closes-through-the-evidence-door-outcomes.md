---
id: REQ-033
type: requirement
title: "The learning loop closes through the evidence door: outcomes re-enter as sources"
status: accepted
approved: 2026-08-26
created: 2026-08-26
updated: 2026-08-26
links:
  - id: SRC-050
    rel: derived-from
  - id: REQ-032
    rel: relates-to
---

Implemented is not validated, and validated is not successful. Today a receipt answers "what did the agent change?" — nothing in Veri answers "did it solve the intended problem?" in a form the knowledge base can hold accountable. Outcome claims written as receipt prose ("activation went from 41% to 57%") are unverifiable by any check and rot silently.

The structural rule: **an outcome is evidence, so it enters as a source.** When reality reports back on a shipped change — metrics, user feedback, support tickets, a follow-up investigation — that observation is filed as a new SRC with a date and provenance, linked back to the hypothesis requirement it tests (`tests` / `supports` / `refutes`) and to the work order that shipped the change. This closes the lifecycle loop — evidence → intent → work → new evidence — entirely through the existing four types, with no new document type, no new receipt category, and no extended work-order status machine.

Veri's tooling makes the open loop visible: a hypothesis requirement whose work orders are done but which has no linked outcome source is an *untested bet*, and the project can be queried for those. Refuting evidence does not auto-change the requirement — a human judges what the evidence means; Veri's job is to make the question unavoidable, not to answer it.

## Acceptance criteria

- [ ] A source can link to a requirement with an outcome relationship (tests / supports / refutes) and to the work order that shipped the change.
- [ ] A hypothesis requirement (REQ-032) whose linked work orders are all done but which has no linked outcome source is surfaced as an advisory — an untested bet — not a blocking violation.
- [ ] Outcome sources appear in the context package of the requirement they test, so future work sees what reality said.
- [ ] No status is auto-changed by outcome evidence; promotion or revision of the requirement remains a human act.
