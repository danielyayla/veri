---
id: SRC-074
type: source
title: "Design note — the app forgets ready: dead lanes, the receipt files block, and the honest tool list"
status: imported
kind: design
created: 2026-09-02
updated: 2026-09-02
links:
  - id: WO-157
    rel: designs
  - id: DEC-012
    rel: constrained-by
  - id: DEC-142
    rel: constrained-by
  - id: DEC-143
    rel: constrained-by
  - id: SRC-070
    rel: builds-on
---

> Drafted 2026-09-02 by an agent session (Claude Code) at Daniel's
> direction, as the *prospective* design-gate artifact for [[WO-157]]
> ([[DEC-012]]) — filed before implementation, the order the gate
> intends. Two of the three changes are subtractive ([[SRC-070]]'s
> precedent: no mockup bundle for removals — every surviving element
> renders exactly as it did); the third replaces a stale list with a
> complete one inside an existing component.

## What leaves, by surface

- **`sidebar.ts`** — the `'ready'` entry leaves the `LIVING` map's
  work-order row (line 15), and the `Ready` group leaves `livingGroups`
  (line 120). The sidebar's work-order lanes become **Backlog / In
  progress**; the existing empty-group drop means nothing else changes
  shape. Under format 5 no document can hold the status, so both were
  dead branches — until the day a hand-edited file regresses, when they
  would have rendered a lane the schema refuses.
- **`derive.ts`** — `inFlight` (line 364) drops `d.status === 'ready'`
  from its filter; the Home in-flight rows already show only backlog
  and in-progress documents.
- **`views/workorder.ts`** — the `receipt-files` block (line 121)
  leaves the receipt card. [[DEC-142]] removed the files segment from
  the receipt format; the card keeps its header (label + date), its
  meta row (commit sha, session), and the summary sentence — the
  pointer, whole. Legacy receipts render the same three parts; whatever
  path tokens their old text carries stay inside the summary text,
  unparsed.
- **`styles.css`** — the `.receipt-files` rule retires with the block.
- **Tests** — fixtures and assertions that hold the retired state
  (`sidebar.test.ts` Ready-lane assertion, `derive.test.ts` ready
  fixture, the `statuswrite.test.ts` ready case) move to live statuses;
  no test may assert a lane the schema cannot produce.

## The connection panel tells the whole truth

The `TOOLS` array in `views/mcp.ts` lists four tools; the server
registers eighteen. The panel's own status line already derives the
true count from the live server (`result.toolCount`, from the
verification ping) — so the section headed WHAT THE CONNECTION
PROVIDES contradicted the panel's own footer.

**Chosen: the complete editorial list.** All eighteen tools, one line
each, in the existing `.mcp-tool` row component, grouped under three
small eyebrows so the wall reads as a structure:

- **Read** — get_context (the assembled context package, intent
  first), get_intent (what governs a code path), get_document (one
  document as on disk), get_neighbors (the linked neighborhood),
  list_documents (every document by type and status), search (find by
  id or text), get_queue (the backlog awaiting dispatch, and who holds
  what), get_receipts (receipts per work order, with outcome evidence).
- **File — pending only** — file_source (evidence in), file_requirement
  (a draft awaiting the stamp), file_decision (a proposal with rejected
  alternatives), file_work_order (backlog, not startable until
  dispatched), file_receipt (the closing pointer), amend_document
  (revise a pending draft), supersede_decision (propose a replacement).
- **Project** — run_check (issues and advisories, no subprocesses),
  init_project (scaffold where none exists), get_import_instructions
  (the brownfield mining brief).

**Rejected: deriving the rows from the live server.** The section must
render before any connection exists (it is the pitch for making one),
and the server's own tool descriptions are agent-facing paragraphs,
not display copy — deriving trades a stale-list risk for an unreadable
panel. The live `toolCount` in the status line stays as the derived
cross-check a human can see disagree.

**Named follow-up, out of this work order's scope:** the drift test
that pins reference.html's tool table to the live registry
(`server.e2e.test.ts`, packages/mcp) could pin this panel's names the
same way; that is a packages/mcp change for a session allowed to touch
it.

## What deliberately stays

- The status control's segments and refusal grammar — [[SRC-070]]
  already covered them under WO-143; nothing here touches
  `statuswrite.ts` source.
- The verification ping and its status line — untouched, still the
  panel's live truth.
- The `.mcp-tool` row component and section chrome — the new rows wear
  the existing clothes; the only new styles are the three group
  eyebrows, reusing the `mcp-eyebrow` treatment at reduced size.
