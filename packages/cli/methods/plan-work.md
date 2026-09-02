---
id: MET-007
type: method
title: "veri:plan-work — approved intent cut into work somebody can verify alone"
status: accepted
approved: 2026-09-02
description: >-
  The gate between approved intent and work orders somebody could verify one at a time. Use it when intent is settled and nothing is queued against it: "REQ-014 is accepted — cut it into work orders", "the backlog is empty but REQ-039 and REQ-041 are both accepted, turn them into work", "start building the CSV export, there is no work order for it yet", "this one is too big to verify in one go, split it into slices that each ship on their own". It reads what is already accepted and already queued, pushes each slice until it can be proven alone, ties every acceptance criterion to the requirement clause it proves, and files the work orders in backlog awaiting your stamp. Not for work inside a boundary already drawn: "WO-131 is ready — start it", "pick up my in-progress claim on WO-118 and keep going where I left off" are veri:implement's, because the lines exist and what is left is execution. Not for ordinary work with no boundary in question — "run the test suite", "the CI matrix is failing on Node 18, fix it".
requires: [file_work_order, amend_document, search, get_neighbors, run_check]
upstream: veri/plan-work
created: 2026-08-27
updated: 2026-09-02
links:
  - { id: WF-001, rel: derived-from }
  - { id: SRC-060, rel: derived-from }
  - { id: REQ-040, rel: serves }
  - { id: DEC-012, rel: constrained-by }
  - { id: DEC-114, rel: constrained-by }
  - { id: DEC-125, rel: constrained-by }
  - { id: DEC-130, rel: constrained-by }
  - { id: REQ-008, rel: constrained-by }
---
## Purpose

The stretch between approved intent and work an agent could execute and
prove without asking what was meant. A boundary written here costs a
line; discovered mid-implementation it costs the diff ([[MET-001]] beat
6). Its characteristic failure reads well and cannot be verified —
"improve the importer" gets approved, claimed, then argued about by
whoever is tired.

## What it reads

- **The accepted requirements and active decisions planned against**
  (`search`, `get_neighbors`) — pending intent is work that cannot
  start.
- **The work orders already touching the area** — overlapping slices
  collide at claim time (rule 8); `list_documents`/`get_queue`, where
  connected, answer best.
- **[[WF-001]]'s frontmatter** — `design_gate_paths`, read, not
  remembered.
- **`get_intent(<path>)`** for what governs the files a slice touches;
  **the pending block** — drafts are context, not settled intent
  ([[REQ-008]]). All through MCP ([[DEC-125]]).

## The interview

One orienting beat, two of pressure, one conditional gate beat, a
read-back, two interrupts — unapproved intent, or a fork in the cut.

1. **Say what is accepted and what is already queued** — the cut sits
   beside existing work orders or becomes an amendment, never an
   overlap.
2. **Can each slice be verified alone — and by what command?** "If this
   shipped and nothing else did, what would you look at?" — needing the
   next slice means one work order, not two; repeats until every slice
   carries proof, and the one machine-runnable command becomes its
   `verify:` line ([[REQ-042]]) — none is honest, invented is not.
3. **Which criterion proves which clause — and what is explicitly
   out?** A criterion tracing to no clause is scaffolding, declared, or
   scope through the back door.
4. **The design gate — conditional** ([[DEC-012]], rule 7). A gated
   slice is *planned* now but not *started* until a design is linked
   `designed-by`: design first, or the path declared with the design
   named as blocker.
5. **Read the cut back, then file** — per work order: one line, proven
   by, out; the ordering and why; none startable until approved.
6. **Interrupt — the intent is not approved yet.** Disclosure, not
   refusal: backlog may cite a pending document, but nothing starts
   before acceptance, and the cut changes if the intent does.
7. **Interrupt — the cut reaches a fork.** Writing one shape down would
   choose it: `veri:decide`; the cut resumes with the id.

## What it files

- **Backlog work orders** (`file_work_order`) — title, summary,
  `in_scope`, `out_of_scope`, `acceptance_tests`, links. `backlog` is
  hardcoded: no status parameter exists.
- **Amendments to backlog work orders** (`amend_document`) — better one
  revised twice than two nobody reconciles.
- **Nothing else** — thin intent goes back to `veri:define`; a choice
  to `veri:decide`.

Mechanical: every start-time gate is exempt in backlog — no linked
requirement, a pending citation, an undesigned gated path all pass
`veri check` until the work starts (`wo-without-requirement`,
`gated-wo`, `ui-wo-without-design`) — so planning runs ahead of the
stamp, and the read-back names which gate each work order still waits
on. `binds: paths:` ([[DEC-114]]) and `verify:` ([[REQ-042]]) have no
`file_work_order` parameters (the strict schema refuses them): name
the paths in In scope, show the exact frontmatter edit, apply it in
the filing's commit or hand it to the user, and say which — an
undeclared gated path is caught only by the diff tier, after the work
was done without the design. `amend_document` is pending-only
(unstamped `backlog`): splitting an approved work order means fresh
slices plus the user's own narrowing edit.

## Guardrails

- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]). Everything here lands `backlog`, and
  a backlog work order authorises nothing. *"Four work orders are filed.
  None of them is startable until you approve them."*
- **Never files a work order that cannot be verified alone** — beat 2
  repeats, or the slices merge.
- **Never starts what it just cut** (rules 1 and 8) — the stamp sits
  between cutting and claiming.
- **Never plans past the design gate** ([[DEC-012]]) — a gated slice
  carries its named blocker.
- **Never invents a criterion the requirement does not ask for**, never
  leaves one untraced without calling it scaffolding.
- **Never widens a slice to fill a work order**, never files an empty
  Out of scope — what was not excluded will be attempted.
- **Never edits an approved work order**, never re-scopes by overlap.
- **A missing required tool is a refusal with a named repair** — a plan
  in a transcript, or "what exists" from recall.

## Handoff

- **The user's dispatch, first and always** — `veri dispatch <WO-id>
  --as <session>`: stamp and claim in one gesture ([[DEC-143]]), the
  one step no skill performs ([[REQ-008]]).
- **`veri:implement`** — after dispatch, one session per work order.
- **The design first, when beat 4 fired** — produced, committed as a
  source, approved, linked `designed-by` ([[DEC-012]]).
- **`veri:decide`** — when beat 7 fired; the cut resumes with the id.
- **`veri:define`** — intent that could not be cut into provable
  clauses.
- **The `binds:` and `verify:` edits for every declaration** — same
  commit or the user's hands; the closing report says which.
