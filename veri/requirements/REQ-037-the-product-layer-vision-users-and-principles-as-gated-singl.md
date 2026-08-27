---
id: REQ-037
type: requirement
title: "The product layer: vision, users, and principles as gated singleton documents; bets and outcomes derived, never authored"
status: draft
created: 2026-08-27
updated: 2026-08-27
links:
  - id: SRC-056
    rel: derived-from
  - id: DEC-111
    rel: builds-on
  - id: DEC-118
    rel: builds-on
---

Veri gains a durable product model — the WHY layer — as a small set of singleton documents under `veri/product/`: `vision.md`, `users.md`, and `principles.md`, plus `current-focus.md` (the one genuinely human, non-derivable statement of what we are steering toward right now).

Every product-layer document must be **gated or derived** — never freeform:

- The authored singletons (vision, users, principles, current-focus) carry the same lifecycle machinery as every other Veri document: frontmatter with an id, status, `approved:` stamp, and links, amendable only through the existing gates. The precedent is [[WF-001]] — a typed, approved document outside the four core types, not a fifth open-ended taxonomy.
- Current bets and outcomes are **derived**, not authored. The bets derivation already exists ([[DEC-118]]'s `currentBets` over hypothesis requirements); outcomes are already outcome sources ([[REQ-033]]). If a repo-visible or package-visible rendering is wanted, it is materialized at assembly time from those derivations — an authored `current-bets.md` or `outcomes.md` is forbidden as a second source of truth.
- `current-focus.md` carries a staleness advisory: untouched beyond a threshold, or referencing only `done` work orders, it is flagged by `veri check` so it cannot quietly lie.

The set stays small and singleton. New product-layer files are a decision, not a habit — the filter is [[DEC-111]]'s: does this improve human judgment, preserve intent, steer agents, or close the learning loop?

## Acceptance criteria

- [ ] `veri/product/` exists with gated singletons `vision.md`, `users.md`, `principles.md`, `current-focus.md`, each with id, status, and approval lifecycle enforced by `veri check`
- [ ] A freeform (frontmatter-less or lifecycle-less) file under `veri/product/` fails `veri check`
- [ ] No authored `current-bets.md` or `outcomes.md` exists; any such rendering is generated from the existing derivations
- [ ] `current-focus.md` staleness surfaces as a `veri check` advisory
