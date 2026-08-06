---
id: DEC-003
type: decision
title: Handlebars templates
status: superseded
superseded_by: DEC-005
created: 2026-07-21
updated: 2026-08-02
links:
  - id: REQ-002
    rel: template-engine
---

## Choice

Render invoices as HTML via Handlebars, print to PDF through a headless
browser.

## Rejected alternatives

- **LaTeX** — heavyweight toolchain for end users to install.
- **Hand-built PDF writer** — months of layout work we don't have.

## Rationale

Superseded by [[DEC-005]]. The headless-browser print step was slow,
nondeterministic across platforms, and broke page-break control on
multi-page invoices.
