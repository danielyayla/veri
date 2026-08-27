---
id: WO-126
type: work-order
title: "The product layer enters the app: the Product collection under WHY and the focus strip on Home"
status: done
claimed_by: fable-wo126
claimed_at: 2026-08-27
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: REQ-037
    rel: implements
  - id: REQ-035
    rel: implements
  - id: SRC-059
    rel: designed-by
  - id: DEC-124
    rel: constrained-by
binds:
  paths:
    - packages/ui/src/renderer/sidebar.ts
    - packages/ui/src/renderer/app.ts
    - packages/ui/src/renderer/theme.ts
    - packages/ui/src/renderer/views/home.ts
    - packages/ui/renderer/styles.css
---

## Summary

The four product singletons get their home in the app, per [[SRC-059]]:
a `◇ Product` collection row under the WHY header (above Sources)
opening a panel that lists vision, users, principles, and current focus
in the sanctioned order with status chips; and the accepted
current-focus renders as a strip at the top of Home, carrying the
`stale-focus` advisory's treatment when the check snapshot raises it.

## In scope

- Sidebar: the Product collection row under WHY with swatch, living
  count, and panel toggle — the existing collection pattern, no new
  grammar
- Product panel: the four singletons in DEC-124's assembly order (not
  id order), status chips, `retired` behind the dead expander, no NEW
  button, and the teaching empty state from SRC-059
- Home: the focus strip — first line of the accepted current-focus,
  linking to the document; amber advisory treatment when `stale-focus`
  is present; absent entirely when no focus is accepted
- Theme: a distinct product hue on the existing TYPE_META entry,
  carried by palette hits and status dots
- Tests over the panel derivation, ordering, empty state, and the
  strip's three states (accepted, stale, absent)

## Out of scope

- Editing affordances beyond the existing reader/editor
- Bets or outcomes in the Product panel (Home and Outcomes own those)
- Any derived materialization (DEC-111)
- Layer headers (shipped per SRC-054)

## Requirements

Implements [[REQ-037]] (the product layer, now visible where the human
works) and [[REQ-035]] (the home surfaces intent — the focus strip is
the intent home's missing WHY line). Designed by [[SRC-059]];
constrained by [[DEC-124]] (only ratified intent steers — draft focus
never renders).

## Acceptance tests

- [x] The sidebar shows `◇ Product` under WHY with a living count of 4
      on this repository
- [x] The Product panel lists vision, users, principles, current focus
      in that order with status chips; a retired singleton moves behind
      the expander
- [x] Home opens with the accepted current-focus strip linking to
      PRD-004; with a `stale-focus` advisory in the snapshot the strip
      shows the amber treatment and message; with no accepted focus the
      strip is absent
- [x] The command palette's PRD hits carry the product hue
- [x] `npm test --workspace @verikb/ui` green; `veri check` zero issues

## Receipts

- 2026-08-27 — 1d99218 — packages/ui/src/renderer/sidebar.ts, packages/ui/src/renderer/theme.ts, packages/ui/src/renderer/app.ts, packages/ui/src/renderer/derive.ts, packages/ui/src/renderer/views/home.ts, packages/ui/renderer/styles.css — the Product collection under WHY (sanctioned order, no NEW, teaching empty state), the Home focus strip with the stale-focus treatment, and the product hue on TYPE_META; ui suite 371 green, check 0 issues
