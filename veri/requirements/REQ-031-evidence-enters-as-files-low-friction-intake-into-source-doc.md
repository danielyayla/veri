---
id: REQ-031
type: requirement
title: "Evidence enters as files — low-friction intake into source documents"
status: accepted
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: SRC-044
    rel: derived-from
  - id: REQ-024
    rel: related
  - id: REQ-008
    rel: related
---

Evidence is where the path of work begins — sources become requirements and decisions, which become work orders — yet getting evidence in is Veri's highest-friction step. A transcript, an email thread, a PDF, a meeting note must today be hand-authored into a SRC markdown file or filed by an agent over MCP. Competing tools accept any dragged-in file and make it agent-readable immediately ([[SRC-044]]). Veri must lower the intake bar to match, without abandoning what makes its model work: an imported file becomes a well-formed source document — identified, dated, checkable, ready for distillation — never a loose blob in a retrieval index.

What must hold:

- A user can turn an evidence file into a source document with a single action, from the CLI at minimum.
- The imported document is a first-class SRC: valid frontmatter, next free id, `status: imported`, and its content (or extracted text) as the body.
- The original file is preserved and reachable from the source document, so distillation and later audit can consult the unmodified evidence.
- Unsupported formats fail loudly and honestly — the tool names what it accepts rather than filing an empty shell.
- Imported sources are ordinary documents thereafter: they link, they pack into context packages, `veri check` covers them, and nothing about intake bypasses the approval model ([[REQ-008]]).

## Acceptance criteria

- [ ] A text-bearing evidence file becomes a valid SRC document via one CLI command, passing `veri check` with no violations.
- [ ] The source document references its preserved original.
- [ ] An unsupported format produces a clear refusal naming the supported set.
- [ ] An imported source appears in context packages and search like any hand-authored source.
