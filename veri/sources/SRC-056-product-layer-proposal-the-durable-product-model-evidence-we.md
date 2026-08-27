---
id: SRC-056
type: source
title: "Product-layer proposal: the durable product model, evidence-weighted sources, and intent-led context packages"
status: imported
created: 2026-08-27
updated: 2026-08-27
links:
  - id: SRC-050
    rel: builds-on
  - id: DEC-111
    rel: builds-on
  - id: SRC-053
    rel: builds-on
  - id: SRC-054
    rel: builds-on
---

Conversation with Daniel, 2026-08-27. Builds directly on the product-engineering pivot ([[SRC-050]], [[DEC-111]]) and the intent home ([[SRC-053]], [[DEC-118]]).

## Daniel's proposal

Keep the four core types but make sources much more important and add a clearer "product intent" layer without a proliferation of new first-class types. Sketch:

```
veri/
├── product/
│   ├── vision.md
│   ├── principles.md
│   ├── users.md
│   ├── outcomes.md
│   └── current-bets.md
├── sources/          SRC-*.md
├── requirements/     REQ-*.md
├── decisions/        DEC-*.md
├── work-orders/      WO-*.md
├── memory/
│   ├── current-focus.md
│   └── project-state.md
├── skills/
└── workflow.md
```

The conceptual change is that Veri should distinguish four layers:

- **WHY** — product vision, users, outcomes, evidence
- **WHAT** — requirements, decisions
- **HOW** — work orders, agent implementation
- **DID IT WORK?** — receipts, tests, user feedback, new evidence

Most software tools are strongest at the HOW; if coding becomes cheap, that is exactly the wrong place to compete. Veri should be strongest at WHY, WHAT, and DID IT WORK. The human role becomes "editor of reality": discovering the real problem, interpreting messy evidence, deciding what matters, resolving conflicting constraints, choosing tradeoffs, defining acceptable outcomes, steering agents, judging whether the implementation actually solves the problem, and updating the product model based on what was learned. The agent absorbs repository exploration, planning, coding, migrations, tests, refactoring, documentation, and mechanical verification. The human maintains a high-quality model of the product and its reality; Veri is where that model lives.

This changes what a work order means: not a Jira ticket telling an agent what files to modify, but **the smallest bounded product change we are currently confident is worth making**.

## Analysis in-session (Claude)

Much of the four-layer framing has already landed: [[DEC-111]] (thesis), [[REQ-032]]/[[REQ-033]] (hypothesis kinds and outcome evidence), [[DEC-118]] (intent home: CURRENT BETS, RECENTLY LEARNED), [[SRC-054]] (sidebar teaches the layers). The genuine gaps and the recommended shape:

1. **Product layer as typed singletons, not freeform files.** DEC-111 rejected the "markdown brain" precisely because freeform files have no checkable lifecycle. The precedent for the right shape is [[WF-001]]: a frontmattered, ID'd, approved document outside the four core types. `veri/product/vision.md`, `users.md`, `principles.md` as gated singletons — status, `approved:` stamp, links, amendable through the same gates. Few and singleton; they earn their place by entering the context package.
2. **Derive `current-bets` and `outcomes`; never author them.** Current bets are already derived renderer-pure from hypothesis requirements (DEC-118); outcomes are already outcome sources. Authored copies would be a second source of truth `veri check` cannot defend. If wanted in the repo or package, materialize at assembly time from the same derivations.
3. **Sources gain epistemic weight via a `kind` field, not directory prominence.** Of 54 sources, roughly 40 are design notes; evidence drowns. Mirror REQ-032: source kinds such as design / user-feedback / metric / external-eval / investigation / outcome. Plus the advisory that closes the loop at the front: a requirement with no `derived-from` evidence link is an **intuition-only bet** — visible, not an error; the mirror image of the untested-bet advisory. Together they bracket a requirement's life.
4. **The context package is where the layers become real.** `get_context` should open with the intent layer — vision excerpt plus the bet the work order tests — before the REQ/DEC section. An agent that knows the hypothesis can push back: "this satisfies the acceptance criteria but won't move that metric."
5. **The WO redefinition is a check, not a schema change.** A `ready` work order that does not trace transitively to a live requirement is orphan execution — flag it. The existing untested-bet advisory covers the after-side.
6. **From `memory/`, keep only `current-focus.md`.** Project state is derivable from WO statuses. Current focus is genuinely human and not derivable; give it a staleness advisory so it cannot quietly lie.

The through-line: every file in the product layer must be either **gated** (status, approval, links) or **derived** (materialized from checkable state). Anything that is neither rebuilds the wiki DEC-111 rejected — comprehensiveness of memory instead of accountability of memory.
