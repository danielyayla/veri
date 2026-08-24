---
id: WO-091
type: work-order
title: "Starter template bundles: veri init gives an opinionated start per project type"
status: done
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-010
    rel: extends
  - id: REQ-008
    rel: constrained-by
binds:
  paths:
    - packages/core/src/scaffold.ts
    - packages/cli/src/**
    - packages/cli/starters/**
  tests:
    - packages/core/src/scaffold.test.ts
    - packages/cli/src/commands.test.ts
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

- [x] `veri init --starter <each bundle>` produces a corpus that passes veri check with zero issues, every seeded requirement `draft` and every seeded decision `proposed` (commands.test.ts loops all three bundles: check exits 0 with "ok — 7 documents, 0 issues · 0 advisories", asserts every requirement `draft`, every decision `proposed`, the workflow `draft`, and no `approved:` stamp anywhere; verified live with the built CLI on the library bundle)
- [x] Seeded ids respect the floor: filing the next document after init allocates the next free id with no collision (scaffold writes veri/ids from the seeded ids — `REQ 4`/`DEC 2`/`WF 1`, asserted byte-exact in scaffold.test.ts; commands.test.ts files after init and gets REQ-005 and DEC-003 in every bundle, check still clean)
- [x] An unknown starter name fails with the list of available bundles (`unknown starter "mainframe" — available starters: cli-tool, library, web-app`, exit 1; a bare `--starter` prints usage plus the same list; both asserted in commands.test.ts with nothing scaffolded)
- [x] Quickstart and reference pages document the flag; npm test green (site/docs/quickstart.html gains the one-sentence starter path, site/docs/reference.html's CLI block lists `--starter <name>` with the bundle names; 584 tests pass across all five workspaces)

## Receipts

- 2026-08-24 — 32eb9bb — packages/core/src/scaffold.ts, packages/core/src/scaffold.test.ts, packages/cli/src/commands.ts, packages/cli/src/cli.ts, packages/cli/src/commands.test.ts, packages/cli/package.json, packages/cli/starters/ (cli-tool, library, web-app: each 4 draft requirements + 2 proposed decisions + draft workflow.md), site/docs/quickstart.html, site/docs/reference.html, action/dist/index.js, veri/decisions/DEC-085-starter-bundles-shipped-set-seeding-mechanics-and-pending-on.md, veri/ids — starter bundles seed at init via core's starterRoot option (dates restamped to init day, seeded ids recorded in veri/ids), `veri init --starter <name>` with directory-derived listing, everything seeded pending per REQ-008; DEC-085 filed as proposed. The app's New-project flow is deliberately not wired — a starter picker would trip the design gate (CLI-only, noted in DEC-085).
