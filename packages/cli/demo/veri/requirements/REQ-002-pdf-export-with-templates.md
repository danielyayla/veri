---
id: REQ-002
type: requirement
title: PDF export with templates
status: accepted
approved: 2026-08-04
created: 2026-07-16
updated: 2026-08-04
links:
  - id: DEC-005
    rel: template-engine
  - id: WO-002
    rel: implementation
  - id: SRC-001
    rel: derived-from
---

Invoices must export to print-ready PDF using a user-selectable template.
Rendering happens locally — no network calls, per [[DEC-004]].

## Acceptance criteria

- [ ] Export completes in under 2 s for a 3-page invoice
- [x] Templates ship: default, compact, letterhead
- [ ] Output passes PDF/A-2b validation
- [x] Currency and date formats follow the client locale

## Notes

Template engine settled in [[DEC-005]] after the Handlebars prototype
([[DEC-003]]) hit layout limits on multi-page invoices. Implementation
tracked in [[WO-002]]. The template requirement came directly from
[[SRC-001]]: three of four interviewees send letterhead PDFs to agencies.
