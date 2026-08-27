---
id: SRC-063
type: source
title: "Form note — how a Veri method document is authored, established by MET-001"
status: imported
kind: design
created: 2026-08-27
updated: 2026-08-27
links:
  - id: MET-001
    rel: derived-from
  - id: DEC-130
    rel: informed-by
  - id: WO-132
    rel: derived-from
---

The transferable half of [[WO-132]]. One method document ([[MET-001]],
`veri/methods/implement.md`) was authored alone, before the other
thirteen existed, so the form would be established by trying it. These
are the conventions that attempt settled.

They are conventions, not schema. The schema is `methodSchema` in
`packages/core/src/schema.ts`; the six sections come from the `method`
template in `packages/core/src/templates.ts`. Where a later method has a
reason to break one of the conventions below, break it and say why in the
document — but do not re-derive the form.

## Shape and length

[[MET-001]] runs 213 body lines and roughly 1,900 words, plus a 180-word
`description:`. Treat **120–220 body lines** as the band, and prose
wrapped at ~72 columns like every other document here.

Length is set by the beat count of *The interview*, not by how important
the gate is: **4–8 beats, 3–8 lines each**. A gate with less existing
canon behind it (the discovery gates) will be longer than [[MET-001]],
not shorter, because it has to carry its whole interview rather than
pointing at rules already written.

Section proportions, in words, from [[MET-001]]: Purpose 146, What it
reads 224, The interview 543, What it files 349, Guardrails 415, Handoff
209. The interview and Guardrails together are half the document. A
method whose Purpose is its longest section is describing a skill instead
of running one.

Voice: the document talks about the skill's behaviour in the third person
("it refuses", "the skill files"), and switches to imperative only inside
a beat, where the instruction is what the agent does next. "You" appears
only inside quoted speech.

## The interview, transcribed

This is the load-bearing convention, and the one most likely to be
skipped under time pressure. A method whose interview section *summarises*
what to ask is useless: an agent reading "confirm the scope back to the
user" invents a paragraph, and an agent reading the paragraph says it.

Transcribe the interview as **numbered beats**, each carrying three
things:

1. **When it fires** — unconditional, or the condition that triggers it.
2. **What the skill actually says**, quoted. A blockquote for anything
   longer than a clause, with `<angle-bracket slots>` for what varies.
3. **What a different answer changes** — the reason the beat exists at
   all. A beat that cannot say this is a step, not a beat, and belongs in
   *What it files*.

Conditional interrupts (beats that fire only when something is wrong) are
numbered in sequence with the rest and identified as interrupts in the
section's opening line, together with the ratio: [[MET-001]] says "four
beats of speech at the edges, two interrupts that fire only when
something is wrong". State that ratio in every method — it is how a
reader learns what kind of gate they are standing at before reading any
beat, and a discovery gate that inverts it should invert it out loud.

Slots are `<lowercase description>`. Example ids are real ids from this
project (`WO-131`, `DEC-062`), never `WO-XXX`: a real id reads as a
sentence, a placeholder reads as a form.

## Restate versus link

In one line: **restate the act, link the rule.**

- **Restate** what the skill does at the moment a rule bites, in the
  method's own words, with the id in brackets after it. [[MET-001]]'s
  scope guardrail restates the act ("Out of scope is forbidden even when
  it is one line away", plus the refusal the skill speaks) and links
  [[WF-001]] rule 3 for the rule itself.
- **Link** the authoritative text, the rationale, and anything that could
  go stale. A method never quotes [[WF-001]] at length and never re-argues
  a decision: the context package already carries both, and a copy is a
  second source of truth waiting to drift.
- Rule of thumb: **if a sentence would need editing when the linked
  document changes, it is a restatement too far.**
- Never restate a rule the method does not act on. [[MET-001]] touches six
  of [[WF-001]]'s nine implementer rules; the others appear only where the
  skill does something about them, and rule 7's design gate does not
  appear at all — it is real, and it belongs to `veri:plan-work`.

The exception, and it matters: **mechanical facts about the MCP surface
are restated in full**, because they live in no linked document and
getting one wrong is a check violation. [[MET-001]] carries three —
a proposed decision links *to* the work order and never the reverse (a
claimed work order linking a proposal fails the gate check); `amend_document`
accepts `backlog` work orders only; `run_check` returns a `skipped` list
because the git-backed tier cannot run over MCP. Each was verified against
the source before it was written down.

## The `description:` field

One paragraph, folded YAML (`>-`), **130–190 words**. It is matched text,
not documentation about the skill — most of the budget goes to quoted
utterances.

The structure [[MET-001]] uses, in order:

1. One clause naming the gate ("the gate between a ready work order and a
   receipt").
2. "Use it when …" plus **three or four quoted positives**.
3. **One** descriptive sentence — what the skill will do to the session.
   It earns its place by telling a router what the user is signing up for;
   a second one does not.
4. "Not for …" plus **the adjacent gate's utterances, quoted**, plus the
   one-clause reason for the boundary, plus the adjacent skill named so
   the router has a destination.
5. "Not for …" plus a short tail of ordinary-work negatives that must fire
   nothing.

Before writing it, read both skills' cases in `skills/trigger-corpus.yaml`
and quote the corpus's own utterances or close paraphrases. That is what
makes the corpus a regression test rather than a parallel document.
[[MET-001]] is consistent with TC-017, TC-031 and TC-032 on the positive
side, TC-028 through TC-030 on the `plan-work` side, and TC-044, TC-047,
TC-049, TC-054 and TC-058 among the negatives; no corpus case needed
correcting.

## `requires:`

List only tools whose absence breaks the gate — each entry is a refusal
condition ([[DEC-125]]), so the list is a promise about what the skill
will not degrade past.

- **Verify every name against `packages/mcp/src/server.ts` before writing
  it.** [[MET-001]]'s five were verified by inspection on 2026-08-27.
- Capabilities that would merely help go in the body. [[MET-001]] omits
  `get_queue` (it runs on a work order the user named) and `amend_document`
  (it may not amend its own claimed work order at all).
- Where a needed capability does not exist on the surface, **state the gap
  in the body with what the skill does instead**. Never list a nonexistent
  tool — that makes the skill refuse always — and never let the omission
  pass silently. [[MET-001]] does this for the closing flip: `file_receipt`
  exists, but marking a work order `done` and ticking its criteria has no
  MCP path.

## Frontmatter and filename

- **File at `veri/methods/<skill-slug>.md`** — `implement.md`, matching the
  slug in `upstream:`. `veri new method` writes `MET-00n-<title-slug>.md`;
  rename after creating. The check enforces the directory, not the
  filename, and the shipped methods' identity is the slug.
- `upstream: veri/<slug>` on every method that ships with Veri. Absent only
  on a method the project wrote itself — that absence is what
  upgrade-by-proposal reads.
- `links:` name the canon the method restates, so the graph shows what has
  to be re-read when that canon changes. [[MET-001]]: [[WF-001]] and
  [[SRC-060]] `derived-from`, [[REQ-040]] `serves`, [[DEC-125]],
  [[DEC-130]] and [[REQ-008]] `constrained-by`.
- `status: draft`, no `approved:` stamp, ever. Promotion is the user's act
  ([[REQ-008]], [[DEC-111]]), and a draft method emits no shell, so nothing
  can trigger on an unread one.
- **Do not link the new method from the authoring work order.** A `draft`
  method is a pending document (`isPending` in `packages/core/src/pending.ts`
  counts it alongside draft requirements and proposed decisions), so a
  claimed or done work order that links one fails the `gated-wo` check —
  "approve it first". This bit [[WO-132]] in the obvious place: a
  `delivers` link to [[MET-001]] turned the repository red and was removed.
  Link the *form note* if anything; the method's own `links:` are what tie
  it into the graph, and they point outward. The same trap, in the same
  shape, is why a proposed decision links to its work order and never the
  reverse.

## Guardrails and Handoff

**Guardrails** is a bulleted list: a bolded rule, then the refusal itself
in italics where the refusal is speech. Order by how likely the skill is
to break each one, not by severity. **Every method states, explicitly,
that it never writes an `approved:` stamp** — that sentence is not
optional and not paraphrasable into "files drafts only".

**Handoff** names four things per exit: the documents now waiting, the act
they wait for, the skill that picks them up, and the condition under which
that exit is the right one. [[MET-001]]'s order is conditional successors
first, then what was left pending and who runs that queue, then the exits
for a session that ended somewhere other than done. A handoff naming one
unconditional successor is usually wrong; `veri:wayfinder` and
`veri:evidence-intake` are the two that must say so outright.

## What this attempt did not settle

- **The six sections stood.** Authoring [[MET-001]] needed no seventh
  section and no reordering, so the `method` template ships as
  [[WO-131]] wrote it. That is evidence for one gate, not proof for
  fourteen.
- Whether a method may carry sections beyond the six. [[MET-001]] never
  needed to find out.
- The advanced-tier form. [[MET-001]] is a default-tier gate that ships in
  the minimal loop.
- How a gate that mostly *reports* (`veri:health`, `veri:review`) writes
  *The interview*. Expect a beat list that is mostly reporting steps, said
  so in the section's opening line — not invented questions padding the
  form.
