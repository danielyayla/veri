---
id: SRC-069
type: source
title: "Form note — the method diet: a two-screen ceiling replaces SRC-063's word budgets"
status: imported
kind: design
created: 2026-09-01
updated: 2026-09-01
links:
  - { id: SRC-063, rel: supersedes }
  - { id: SRC-066, rel: derived-from }
  - { id: MET-001, rel: derived-from }
---

The successor to [[SRC-063]]'s length conventions, filed by WO-149.
[[SRC-066]] found SRC-063 prescribing 120–220-line documents with
per-section word budgets — a written policy for producing length, the
inverse of the playbook's "keep it under a page". Those budgets no
longer govern. Everything in SRC-063 that is not a length or word
budget stands unless restated differently below.

## The ceiling

**A method fits in two screens.** No per-section word budgets, no
target band — the only length rule is the ceiling, and pressure toward
the floor. Length is still set by the interview's beat count, but a
beat is one to three lines: what fires and what a different answer
changes. Quoted speech appears only where the speech *is* the beat.

## The rules that survive

- **Restate the act, link the rule.** A method states what the skill
  does at the moment a rule bites, with the id after it, and never
  quotes [[WF-001]] or re-argues a decision — the context package
  carries both, and the four-altitude discipline means the linked canon
  is the explanation. If a sentence would need editing when the linked
  document changes, it is a restatement too far.
- **Mechanical facts about the MCP surface are restated in full.**
  They live in no linked document and getting one wrong is a check
  violation: link direction, pending-only amendment, hardcoded
  statuses, the `skipped` list, `kind`/`outcome` on filing, the
  `binds:` gap. Verified against the source before written down.
- **The six sections**, the numbered-beat interview with its ratio
  stated, real ids over placeholders, guardrails ordered by likelihood
  of breakage, and the non-optional, non-paraphrasable promotion
  sentence: **every method states explicitly that it never writes an
  `approved:` stamp.**
- **`requires:` holds only refusal conditions**, names verified against
  `packages/mcp/src/server.ts`; capability gaps are stated in the body
  with what the skill does instead.

## New conventions the diet added

- **The `description:` is one folded line.** It is matched text for the
  router and the emitted shells, not prose wrapped for reading; its
  string is what the corpus floor protects, so rewrapping it must not
  change a byte of the parsed value.
- **`links:` and `requires:` use YAML flow style** — one line per link,
  one line for the tool list.
- **Guardrails and handoff exits are single bullets**: the bolded rule
  or destination, the id, at most one consequence clause. The refusal
  speech that illustrated each guardrail is dropped except inside the
  promotion sentence, which is preserved verbatim.

## What the diet measured

The nine gate methods went from 2,389 lines to 1,068 in WO-149's pass —
55 percent off, short of the work order's "roughly 700" target. The
floor was set by what the diet was required to preserve: six sections
with headers, every beat, every guardrail's substance, the verbatim
promotion bullets, and the mechanical MCP facts. Cutting further meant
changing what a rule says, which is a redesign, not a diet. A method
now runs 107–130 lines — at or under the two-screen ceiling that
replaces the budgets.
