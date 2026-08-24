---
id: WO-091
type: work-order
title: "Starter template bundles: veri init gives an opinionated start per project type"
status: in-progress
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-010
    rel: extends
  - id: REQ-008
    rel: constrained-by
---

## Summary

Today `veri init` scaffolds an empty knowledge base (plus `--demo` for the skiff fixture). A new user gets structure but no substance: no seed requirements to react to, no example of a good decision, and a generic workflow document. Brownfield projects get the import path (WO-075); greenfield projects get a blank page. This WO adds starter bundles per project type — small, opinionated seed corpora (a handful of draft requirements, one or two proposed decisions demonstrating the form, and a workflow document tuned to the project type) selectable at init. Everything seeded lands unbinding — `draft`/`proposed` per [[REQ-008]] — so the bundle is a conversation starter the owner promotes or deletes, never silent canon. Bundles live as plain files in the CLI package like the demo fixture and templates do ([[DEC-023]]'s generative-only spirit: they are copied at init, never referenced after).

## In scope

- 2–4 bundles chosen during implementation (e.g. web-app, cli-tool, library, api-service), each: 3–6 draft requirements naming the type's canonical concerns, 1–2 proposed decisions showing the form with real rejected-alternatives, and a workflow doc body tuned to the type — all landing as draft/proposed
- CLI surface: `veri init --starter <name>` (with `veri init` listing available starters when the flag is misused), coexisting with `--demo`
- Bundle content ships inside packages/cli alongside the demo fixture, copied at init; ids allocated through the normal id machinery so the floor is correct from the first document
- The app's New-project flow is NOT redesigned; if the existing flow can pass a starter name through without UI work, wire it; otherwise CLI-only and note it
- Docs: the quickstart mentions the starter path in one sentence; site reference page lists the flag
- Tests: init with each bundle yields a check-clean corpus (zero issues), all seeded docs draft/proposed, ids floor consistent

## Out of scope

- New UI screens or New-project sheet redesign (would trip the design gate; file a follow-up if wanted)
- Bundles that ship accepted/active documents ([[REQ-008]] forbids it)
- Template-system changes ([[DEC-023]] machinery stays as is)
- Community/bundle marketplace, remote bundle fetching

## Requirements

- [[REQ-010]] — extends
- [[REQ-008]] — constrained-by

## Acceptance tests

- [ ] `veri init --starter <each bundle>` produces a corpus that passes veri check with zero issues, every seeded requirement `draft` and every seeded decision `proposed`
- [ ] Seeded ids respect the floor: filing the next document after init allocates the next free id with no collision
- [ ] An unknown starter name fails with the list of available bundles
- [ ] Quickstart and reference pages document the flag; npm test green

## Receipts

(none yet)
