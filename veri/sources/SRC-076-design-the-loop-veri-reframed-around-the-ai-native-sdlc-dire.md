---
id: SRC-076
type: source
title: "Design — The Loop: Veri reframed around the AI-native SDLC (direction proposal)"
status: imported
kind: design
created: 2026-09-02
updated: 2026-09-02
links:
  - id: REQ-004
    rel: designs
  - id: SRC-066
    rel: builds-on
  - id: WF-001
    rel: relates-to
  - id: DEC-111
    rel: relates-to
  - id: SRC-068
    rel: revisits
---

> Drafted 2026-09-02 by an agent session (Claude Code) at Daniel's
> direction, from Anthropic's AI-native SDLC playbook brief (audited
> against Veri in [[SRC-066]]). **Direction-level proposal — not
> approved; no work orders are cut from it.** The high-fidelity mockup
> bundle (README + three Design Component artboards + canvas layout)
> lives in `design/loop-redesign/`; the editable canvas is published at
> https://claude.ai/code/artifact/4b6a9712-ae40-4492-b391-38ab64e74051.

The playbook's thread is the committed artifact: each stage of a
six-stage loop (Plan → Design → Build → Test → Deploy → Maintain) ends
by committing an artifact the next stage reads, human attention
concentrates at gates, and the chain of commits is the audit trail.
[[WF-001]] already describes Veri this way — evidence → intent →
requirements → decisions → bounded work → receipts → learning → revised
intent, with humans defining intent and agents executing within it
([[DEC-111]]). What the desktop app does not yet do is *show* it: the
UI reads as a document library with a stamp queue. This design reframes
three surfaces so the loop is the interface.

## The three surfaces

1. **The Loop (Home)** — the Home view leads with a six-stage loop
   strip mapped onto Veri's artifact types (Plan = evidence enters as
   SRC; Design = define & decide, REQ/DEC; Build = bounded work, WO
   with ⌁ sessions; Test = evals ride the diff, `veri check`/drift;
   Deploy = review the receipt at the done gate; Maintain = reality
   reports, outcome SRCs). Gate markers between stages are amber when a
   stamp waits and green when the gate fires on commit; a return path
   ("outcomes re-enter as intent") closes the loop. Three cards below:
   At your gates, Agents in flight, Reality reports.
2. **Gate Queue** — the approval pass as a first-class view: pending
   stamps grouped by gate (intent / decision / dispatch / done), the
   detail pane leading with what the agent flagged, alternatives with
   their rejection reasons, revisit conditions, and a one-key
   approve / edit / send-back bar. Reviewing what the agent flagged
   replaces reading each document from scratch.
3. **Change Trace** — the audit trail as a screen, reached from the
   Graph view: one change traced evidence → REQ → DEC → WO (commits +
   receipt) → review → outcome verdict, with connector labels naming
   what fired each hop, a stamp ledger, and elapsed times
   (evidence → accepted, accepted → shipped, shipped → verdict — the
   playbook's indicators read straight off the record).

## What this deliberately does not do

- No renaming of Veri's artifact types: the six stage names are a
  framing layer over SRC/REQ/DEC/WO; the loop strip does the
  translation.
- No new document types and no workflow change — this is a lens over
  [[WF-001]] as it stands.
- Static mockups only; interaction specs are direction-level.

## Known staleness

The artboards' icon rail shows five items including Board ▤, drawn from
the navigation-model handoff; [[SRC-067]] and [[SRC-068]] (which this
note revisits for the Home surface) have since removed the Architecture
view and folded Board and Outcomes into Home. The rail in the mockups
is illustrative — the proposed rail is Loop ⟳ (replacing Home ⌂),
Gates ▦ (new), Graph ◉, Decisions §. Reconcile against the shipped
rail if and when work is cut.

## Fidelity and fixture content

Visuals follow the existing canon exactly (design/README.md tokens; the
navigation-model shell; Source Sans 3 / JetBrains Mono; no new colors).
The demo dataset ("skiff", an invoicing app) is illustrative fixture
content per the canon's convention — real screens render live `veri/`
files.

## If accepted, the likely cuts

Three independently shippable slices, in value order, mirroring the
[[SRC-005]] precedent: (1) Gate Queue — highest leverage, exercises the
approval model end to end; (2) Loop strip on Home — presentation over
data Home already has; (3) Change Trace — needs subgraph traversal the
Graph view already computes. Cutting these is a veri:plan-work pass
after Daniel reviews this direction.
