---
id: REQ-042
type: requirement
title: "A work order declares how its change is verified, and done shows the run"
status: draft
kind: constraint
created: 2026-09-01
updated: 2026-09-01
links:
  - id: SRC-066
    rel: derived-from
  - id: DEC-037
    rel: constrained-by
  - id: DEC-142
    rel: constrained-by
  - id: DEC-025
    rel: constrained-by
  - id: REQ-025
    rel: relates-to
  - id: REQ-021
    rel: relates-to
---

The largest gap the playbook audit found ([[SRC-066]]): Veri verifies its record and never the software. `veri check` audits documents, acceptance boxes are ticked on trust, and nothing asks whether the change a work order shipped actually works — the playbook's Stage 4 (agents self-verify code) has no clause of accepted intent behind it. This requirement is that clause.

A work order may declare **one verification command** — the single thing an implementer runs to prove the change works (`npm test`, a script, a smoke check). When declared, three things must hold:

1. **The implementer is briefed on the bar.** The command travels in the work order's schema and renders in every context package, so the agent knows before writing code what will be run against it.
2. **Done shows the run.** A work order cannot honestly close without the command having been run and passed; a `done` work order that declares a command and whose receipts nowhere evidence the run is a gap the machine surfaces, through the advisory tier ([[DEC-025]]). The receipt's evidence fits the one-line pointer form ([[DEC-142]]): the outcome lives in the sentence, never as a quoted log.
3. **Veri never runs it.** Core, the MCP server, and the check derivation stay subprocess-free ([[DEC-037]]); executing the command belongs to the implementing session's harness or host. Veri states the bar and audits that it was met — it does not become a test runner.

The field is optional — a record-only work order has nothing to verify and behaves exactly as today. Declared, it binds. This complements [[REQ-025]] (the record's gate on every pull request) with the software's own gate, and extends [[REQ-021]]'s principle — provenance is mechanical, not social — from what the record claims to whether the change was proven.

## Acceptance criteria

- [ ] A work order can declare a single verification command in its frontmatter; the schema round-trips it, and a malformed declaration is invalid frontmatter, never a silent no-op
- [ ] Every context package for a work order that declares a command shows it in the work-order section
- [ ] A `done` work order that declares a command and whose receipts nowhere evidence its run surfaces through the advisory tier, naming the work order ([[DEC-025]])
- [ ] The receipt's evidence of the run fits the one-line pointer form ([[DEC-142]]) — outcome in the sentence, no quoted logs
- [ ] Core, the MCP server, and the check derivation never execute the command ([[DEC-037]])
- [ ] A work order without the field behaves exactly as today
