# Handoff: The Loop — Veri reframed around the AI-native SDLC

## Overview
Direction-level design for reframing Veri's desktop app from a document
library into the loop WF-001 already describes, per Anthropic's AI-native
SDLC playbook (audited against Veri in SRC-066). Three surfaces:

1. **The Loop (Home)** — the Home view becomes a six-stage loop strip
   (Plan → Design → Build → Test → Deploy → Maintain) mapped onto Veri's
   artifact types, with gate markers between stages and three cards
   below: At your gates, Agents in flight, Reality reports.
2. **Gate Queue** — the approval pass as a first-class view: pending
   stamps grouped by gate (intent / decision / dispatch / done), detail
   pane leading with what the agent flagged, one-key approve/edit/send-back.
3. **Change Trace** — the audit trail as a screen: one change traced
   evidence → REQ → DEC → WO (commits + receipt) → review → outcome,
   with stamps and elapsed times in a side rail.

## About the Design Files
`Main.dc.html` (Loop Home), `Gates.dc.html`, `Trace.dc.html` are **design
references created in HTML** (self-running Design Component artboards;
`canvas.json` lays them out, `support.js` is the shared runtime). They are
static mockups — not production code and not a clickable prototype.
Recreate in the app's existing environment (Tauri webview, `packages/ui`)
with its established patterns. The editable canvas is published at
https://claude.ai/code/artifact/4b6a9712-ae40-4492-b391-38ab64e74051.
Demo dataset ("skiff", an invoicing app) is illustrative fixture content.

## Fidelity
**High-fidelity visuals, direction-level scope.** Colors, typography, and
component anatomy follow the existing canon exactly (design/README.md
tokens; navigation-model shell). Layout and interaction details are a
proposal awaiting review — no work orders are cut from this bundle yet.

## Known staleness to reconcile at WO-cutting time
The mockups' icon rail shows five items including Board ▤, drawn from the
navigation-model handoff. SRC-067 and SRC-068 have since removed the
Architecture view and folded Board and Outcomes into Home. The rail
contents in these artboards are illustrative; the real rail after this
design would be Loop ⟳ (replacing Home ⌂), Gates ▦ (new), Graph ◉,
Decisions § — reconcile against the shipped rail when cutting work.

## The three surfaces

### The Loop (Main.dc.html)
- Loop strip card: six stage cards joined by gate connectors; a return
  path beneath ("outcomes re-enter as intent") closes the loop visually.
- Stage card: mono 10px letter-spaced label in the stage's type color,
  one-line description, mono 10.5px live count. The stage with claimed
  work orders gets the ember-tinted treatment (border `#3A2A20`,
  background `rgba(232,112,58,0.05)`).
- Gate connector: 8px dot between stages — amber ring
  (`#D9A03F` on `rgba(217,160,63,0.15)`) when a stamp waits, green ring
  (`#7FAF8A` on `rgba(127,175,138,0.15)`) when the gate fires on commit.
  Legend below the strip.
- Stage → artifact mapping: Plan = evidence enters (SRC); Design =
  define & decide (REQ/DEC); Build = bounded work (WO, ⌁ sessions);
  Test = evals ride the diff (veri check / drift); Deploy = review the
  receipt, ship (done gate); Maintain = reality reports (outcome SRC).
- Below, 3-column grid of canon cards: **AT YOUR GATES** (stamp queue
  summary, one row per pending stamp with its gate name at right, "Run
  the gates" button → Gate Queue), **AGENTS IN FLIGHT** (claimed WOs
  with session id + live activity line), **REALITY REPORTS** (evidence
  door: outcome verdicts, unfiled intake, band breaches).

### Gate Queue (Gates.dc.html)
- Left list 330px on `#131316`: sections per gate (INTENT / DECISION /
  DISPATCH / DONE, each with count), rows are id chip + title + status
  line; selected row `#1F1F25` with `↩` hint; j/k navigation.
- Detail pane: id chip + status chip + "filed by ⌁ session · age";
  24px/600 title; then **FLAGGED BY THE AGENT — READ THESE FIRST** as a
  warning card (border `#3A3020`, background `rgba(217,160,63,0.07)`);
  then ALTERNATIVES THAT COULD HAVE BEEN CHOSEN (each with its rejection
  reason and revisit trigger); then REVISIT WHEN.
- Action bar, 56px, pinned bottom: **✓ Approve** (ember filled, key `a`),
  Edit first (`e`), Send back (`b`); right-aligned mono caption "approve
  stamps `approved: YYYY-MM-DD` and fires the next gate".
- Gates hold only what needs judgment (DEC-111); everything between
  gates moved on its own.

### Change Trace (Trace.dc.html)
- Reached from the Graph view (tab shown: "Trace · WO-159"): a linear
  read of the subgraph around one change.
- Vertical spine: 9px type-colored node dots joined by 1px `#26262C`
  line; artifact cards at each node (id chip, title, status at right,
  mono meta line with stamp author/date and commit hash). The WO node
  gets the ember tint and commit-hash chips including the receipt commit.
- Between nodes, mono 10px connector labels naming the trigger:
  amber `◈` for human gates ("intent gate — stamp fired the define
  pass"), green `◇` for commit-fired automation ("receipt commit fired
  the review pass").
- Right rail 300px: THE AUDIT TRAIL (who asked / what the agent
  produced / who approved), STAMPS ON THIS TURN (stamp ledger), ELAPSED
  (evidence → accepted, accepted → shipped, shipped → verdict — the
  playbook's leading/lagging indicators read straight off the record).

## Design Tokens
Same palette as design/README.md and the navigation-model handoff; no new
colors. New reusable pieces: gate dot (8px, 1.5px ring, 15%-alpha fill in
the ring color), stage card, spine node + connector label, action bar.
Type: Source Sans 3 prose / JetBrains Mono for ids, stamps, hashes,
gate labels — unchanged.
