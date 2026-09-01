---
id: DEC-145
type: decision
title: "Board and Outcomes fold into Home — one lifecycle surface, one learning surface"
status: proposed
created: 2026-09-01
updated: 2026-09-01
links:
  - id: WO-152
    rel: constrains
  - id: REQ-036
    rel: amends
  - id: REQ-004
    rel: amends
  - id: REQ-035
    rel: serves
  - id: DEC-120
    rel: supersedes
  - id: DEC-143
    rel: builds-on
  - id: DEC-111
    rel: builds-on
  - id: SRC-047
    rel: revisits
  - id: SRC-054
    rel: revisits
  - id: SRC-066
    rel: derived-from
---

## Choice

The Board view and the Outcomes view retire. The Work Orders panel — status-subgrouped per SRC-025, with done behind its expander — plus the work-order detail's status control carry the lifecycle end to end; Home's CURRENT BETS and RECENTLY LEARNED sections ([[REQ-035]]) carry what the Outcomes view showed, absorbing the little Home does not already render (outcome-source verdict chips, the untested-bet flag).

The DID IT WORK? layer header retires with the Outcomes row it grouped — a header over an empty group teaches nothing, and [[REQ-036]]'s own rule (grouping, never behavior) forbids making it navigate. WHY / WHAT / HOW stay; the answer to "did it work?" lives on Home, where the content is. Sidebar, tab-strip, palette, and routes clean up per [[WO-152]], which carries the removal behind the design gate (packages/ui — a design note linked designed-by precedes start).

This is the board's second folding, on the record: [[SRC-025]] folded it, [[SRC-047]] (Daniel's direction, 2026-08-25) brought it back with the `ready` lane as its first justification, and [[DEC-143]] has since removed that lane — this decision retires the view with the state it returned to display. [[DEC-120]]'s Outcomes-view machinery is superseded by this decision. Amending [[REQ-036]] (the Outcomes-view half comes out; the layer-teaching half survives) and [[REQ-004]] (whose sidebar prose names the Board, Outcomes, and Architecture rows) is the user's act on those requirements; this records the why.

## Rejected alternatives

- **Keep both views (status quo).** Its best case: the Board is the only surface showing the lifecycle in columns at a glance, exists because Daniel personally asked for it seven days before this filing ([[SRC-047]], with SRC-025's objections answered point by point), and Outcomes gives the DID IT WORK? question a landing page. It loses because the audit ([[SRC-066]]) measured roughly half the app serving execution display against [[PRD-002]]'s "judgment surface, not an execution board", the Outcomes view renders three documents, and [[DEC-143]] dissolved the Board's headline argument — "the ready lane exists nowhere in the UI today" now names a state that exists nowhere at all.
- **Keep the Board, fold only Outcomes — the strongest alternative.** Its best case: Outcomes is indefensibly thin while the Board is a week-old direct request of the user's, deliberately read-only, and cheap to keep. It loses because what won the Board its reversal of SRC-025 was the ready lane; without it the lifecycle is three states the panel's status subgroups already show, which is SRC-025's objection #1 — "read-only restatement of the panel" — returning with the force it lost when `ready` needed a home. Keeping the view preserves a surface whose justification the record has examined twice and can no longer restate. If the want returns, the revisit condition names its path back.
- **Fold both views but keep DID IT WORK? as a header that routes to Home.** Its best case: the four-question pedagogy ([[DEC-111]], SRC-050) stays visible in primary navigation. It loses because a header that navigates breaks the one rule REQ-036 set for headers — grouping, never containers or behavior — and a header over nothing is furniture. Home's section names say "did it work?" where the answer actually renders.

## Rationale

[[PRD-002]] defines what the user needs as a judgment surface, and [[REQ-035]]'s accepted text already demoted the board — "no longer the conceptual center." This decision finishes that sentence now that [[DEC-143]] removed the state the board came back to display: one lifecycle surface (panel plus detail), one learning surface (Home), and the app narrows to what improves judgment. The sacrifice is named — the app loses its only all-columns lifecycle visualization and the DID IT WORK? teaching header — accepted because the columns restate the panel's subgroups and the teaching moves to where the content is. The reversal history stays legible: each folding and unfolding of the board is a stamped act in the record, which is exactly what the record is for.

Revisit when: work-order volume outgrows the subgrouped list — a fleet holding dozens in flight is the workload where a column board earns a third look; the user misses the board in daily use — it returned once on precisely that signal, and the record should turn quickly if it happens again; or outcome evidence outgrows Home's windows — a dedicated evidence view returns on volume, not on principle.
