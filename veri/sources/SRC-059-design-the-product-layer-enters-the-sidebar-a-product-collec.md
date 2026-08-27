---
id: SRC-059
type: source
title: "Design — the product layer enters the sidebar: a Product collection under WHY, and the focus strip on Home"
status: imported
kind: design
created: 2026-08-27
updated: 2026-08-27
---
## Question

WO-121 landed `veri/product/` — four gated singletons (vision, users,
principles, current focus) that steer every context package — but the
app renders them nowhere: reachable through the palette, homeless in
the sidebar. Where do they live?

## Design

**A `◇ Product` collection row under WHY, above Sources** (extending
[[SRC-054]]'s layer framing — WHY currently shows the evidence but not
the intent the evidence feeds):

```
⌂ Home
WHY
  ◇ Product          4 living
  ● Sources
WHAT
  ● Requirements
  ● Decisions
...
```

The row follows the existing collection pattern exactly — swatch,
crumb, living count, panel toggle — no new interaction grammar. The
panel lists the four singletons in the sanctioned order (vision,
users, principles, current focus — [[DEC-124]]'s assembly order, not
id order), each row showing the status chip so a `draft` edit is
visibly not-yet-canon. No NEW button in this panel: the set is fixed
([[REQ-037]]); creation happens by authoring the file, and the panel's
empty state teaches that ("Author veri/product/vision.md — four fixed
files, approved by you, steer every package").

**The focus strip on Home**: the accepted current-focus renders as a
one-line strip at the top of Home, above the cards — first sentence
(or first line) of the body, linking to the document. Home is "the
at-a-glance answer" ([[SRC-053]], [[SRC-054]]); the current focus is
precisely what a glance should return. When the check snapshot carries
a `stale-focus` advisory, the strip carries the advisory's amber
treatment and its message ("the focus it describes has shipped —
restate what comes next"): the nudge arrives where the focus is read,
for free from the existing pipeline. Draft-only focus (nothing
accepted): the strip does not render — only ratified intent steers,
the same rule the context package applies ([[DEC-124]]).

**Lifecycle in the panel**: LIVING for product is draft + accepted
(already in the compile-keeping maps); `retired` is the dead label
behind the expander. Withdrawn does not exist for product
([[DEC-121]]).

**Type color**: product gets its own swatch (the TYPE_META entry
exists); pick a hue distinct from the four collections — the WHY
group's identity, used by the palette hit chips and status dots.

## Out of scope

- Editing affordances beyond what every document already has (the
  reader/editor handles PRD docs today)
- Rendering bets or outcomes in the Product panel — Home and the
  Outcomes view own those ([[SRC-053]], [[SRC-054]])
- Layer headers themselves (shipped per SRC-054)
- Any new derived materialization (current-bets.md stays nonexistent,
  [[DEC-111]])
