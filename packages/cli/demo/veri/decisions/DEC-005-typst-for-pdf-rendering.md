---
id: DEC-005
type: decision
title: Typst for PDF rendering
status: active
approved: 2026-08-05
created: 2026-08-02
updated: 2026-08-05
links:
  - id: REQ-002
    rel: satisfies-templates
  - id: DEC-003
    rel: supersedes
  - id: WO-002
    rel: implemented-in
---

## Choice

Compile invoice templates with Typst, embedded in the Rust core.

## Rejected alternatives

- **Handlebars + headless browser** — the [[DEC-003]] approach; slow and
  nondeterministic print output.
- **LaTeX** — heavyweight toolchain for end users to install.
- **wkhtmltopdf** — unmaintained, and page-break control is as fragile as
  the headless-browser route.

## Rationale

Typst compiles deterministic, print-ready PDFs offline and its layout
model handles multi-page invoices cleanly. Supersedes the
Handlebars-to-HTML approach in [[DEC-003]], which required a headless
browser for print output. Implementation in [[WO-002]].
