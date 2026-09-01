---
id: SRC-066
type: source
title: "Playbook alignment audit — Veri evaluated against Anthropic's AI-Native SDLC playbook"
status: imported
kind: investigation
created: 2026-09-01
updated: 2026-09-01
links:
  - id: WF-001
    rel: relates-to
  - id: DEC-111
    rel: relates-to
---

> Drafted 2026-09-01 by an agent session at Daniel's request. The full
> report is published as an artifact ("Veri Against the Playbook",
> https://claude.ai/code/artifact/baab5fdb-6e91-415f-81f9-2d3008b5c696).
> This source records the findings; judging what they mean for the
> record is the user's act.

A full-codebase evaluation of Veri against Anthropic's AI-Native SDLC
playbook (claude.com/blog/the-ai-native-sdlc-playbook): core, CLI, MCP,
UI, the nine methods, the trigger corpus, all design bundles, and the
complete 397-document record with its 595-commit history.

## What the playbook prescribes

Six stages (Plan → Design → Build → Test → Deploy → Maintain) joined by
a chain of lightweight artifacts (intent → spec → plan → diff → review
findings) committed to git. Approval is the merge, not a registry
entry. Governance is enforced as the agent acts (hooks). Agents verify
their own code before humans see it, and the configuration steering
them is regression-tested. Apparatus stays light: an intent folder, a
CLAUDE.md "under a page", no central platform.

## Findings

**Strongly aligned (5):** files+git as truth (DEC-002 holds); humans
own judgment and agents mechanically cannot promote (REQ-008, enforced
at every surface); the artifact chain; context delivery (the package
assembler exceeds anything the playbook describes); the learning-loop
*design* (REQ-032/REQ-033 go beyond the playbook, whose loop is
ops-only).

**Partially aligned (5):** act-time governance covers the record but
not the code; policy-at-creation exists for intent, not for code; the
dispatch workflow is playbook-native but alone; the trigger corpus is
an eval suite with no runner; parallelism is legible but unbounded by
review capacity.

**Not implemented (3):** Stage 4 — no mechanism verifies the software
(acceptance boxes are ticked on trust; binds.tests never fires over
MCP); Stage 5 — no review pass (veri:review is declared, routed to by
two shipped methods, and unwritten); Stage 6 — no operational feedback
pattern documented.

**Contradictory (2):** approval gates sit on the build's critical path
— the record shows 57 of 194 stamps born in the creating commit, an
18-minute median filing-to-stamp, batch stamps of 15 documents (what
SRC-062 measured); and dual bookkeeping against git — receipts
duplicate commit facts and need four reconciliation advisories,
in-file status needs lifecycle-commit conventions and drift machinery.

**Volume:** 397 documents / ~235k words govern a 24.5k-line codebase.
452 of 595 record-touching commits (76%) move only status lines. The
work-order `## Requirements` section carries no information above
frontmatter in the median case. 2 of 41 requirements are hypotheses;
3 outcome sources exist against 138 work orders.

## The migration plan the audit proposes

Sequenced friction-first: (1) merge the approval gestures — filing can
carry the stamp when the user authors, dispatch replaces `ready`;
(2) close the verification gap — a verify command on work orders and
the veri:review pass; (3) put the instruction layer on a truth-and-
weight diet and give the corpus a runner; (4) prune — architecture
layer, format-migration scaffolding, Board/Outcomes views, dead paths;
(5) a docs truth pass; (6) only then grow the learning loop — bets-
first discovery, outcome-of consumed. Work orders cut from this plan
link back here `derived-from`.
