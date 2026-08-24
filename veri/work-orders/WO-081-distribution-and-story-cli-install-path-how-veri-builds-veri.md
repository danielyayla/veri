---
id: WO-081
type: work-order
title: "Distribution and story: CLI install path, \"How Veri builds Veri\", docs continuity"
status: backlog
created: 2026-08-24
updated: 2026-08-24
links:
  - id: SRC-040
    rel: informed-by
---

## Summary

The reach layer, after the table stakes land. Two problems and one opportunity from SRC-040. Problem one: the npm name `veri` belongs to an unrelated package, and @veri/cli is unpublished, so `npx veri` installs someone else's software — the CLI needs either a publishable identity (a scope Daniel controls, distinct bin name considered) or an explicit statement that it ships only inside the app and the action; a Homebrew cask from the existing release artifacts fits the macOS-first audience either way. Problem two: small docs-continuity gaps (no 404 page, no repo backlink from docs pages, no generic MCP-client connect stub). The opportunity: "this repo is built by executing Veri work orders" is the most credible proof the product works — 75+ work orders with commit-provenanced receipts in the open — and deserves a public walkthrough page tracing one real work order from filing through context package to receipt and gate.

## In scope

- A proposed DEC settling CLI distribution: publish under a controlled npm scope (and which bin name), rely on app + action only, or add Homebrew — with the rejected alternatives recorded
- Implementation of whichever distribution path the DEC lands on (npm publish workflow and/or a Homebrew tap/cask fed by the release pipeline)
- A "How Veri builds Veri" page on the site walking one real work order end to end, linked from the README's self-hosting sentence
- Docs continuity: 404 page, a GitHub link on every docs page, a generic "other MCP clients" connect stub with the stdio config
- If npm publishing is chosen: the version-coherence question (packages at 0.1.0, app at 0.2.1) settled in the same DEC

## Out of scope

- Website redesign or restructuring beyond the pages named
- Windows/Linux app distribution
- Registering alternative package names defensively
- Marketing beyond the repo and site (posts, directories, listings)

## Requirements

- [[SRC-040]] — informed-by

## Acceptance tests

- [ ] An approved DEC records the CLI distribution choice and its rejected alternatives
- [ ] Following the documented install path on a clean machine yields a working `veri check` — or, if app/action-only is chosen, the docs state that plainly where a CLI-seeker will look
- [ ] The "How Veri builds Veri" page is live, traces a real work order with its actual receipts, and is linked from the README
- [ ] Docs pages link back to the repo; an unknown docs URL lands on a 404 page; a generic MCP-client connect page exists
- [ ] If packages publish: `npx <chosen-name> check` runs the real CLI, and the versioning scheme is written down

## Receipts

(none yet)
