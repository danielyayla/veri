---
id: WO-081
type: work-order
title: "Distribution and story: CLI install path, \"How Veri builds Veri\", docs continuity"
status: in-progress
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-012
    rel: extends
  - id: REQ-027
    rel: extends
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

- [[REQ-012]] — extends (the site pages: walkthrough, 404, generic connect)
- [[REQ-027]] — extends (a discoverable project needs a stated install path)
- [[SRC-040]] — informed-by

## Acceptance tests

- [ ] An approved DEC records the CLI distribution choice and its rejected alternatives (DEC-077 is filed with five rejected alternatives, but is `proposed` — blocked on Daniel's approval, and on the open question of whether the `@veri` npm org is claimable)
- [x] Following the documented install path on a clean machine yields a working `veri check` — or, if app/action-only is chosen, the docs state that plainly where a CLI-seeker will look (README's new "Installing the CLI" section states plainly there is no npm/Homebrew path today, warns off `npx veri`, and documents the two real paths — app bundle/action and source checkout with the exact commands; the npm path itself awaits DEC-077)
- [x] The "How Veri builds Veri" page is live, traces a real work order with its actual receipts, and is linked from the README (site/docs/how-veri-builds-veri.html traces WO-077 through its 8 real commits f7464a2→d7fe6a3, all verified ancestors of main, quoting its actual receipts and context-package roster; linked from the README self-hosting sentence, the homepage fin + footer, and every docs strip; deploys with the next push to main via site.yml)
- [x] Docs pages link back to the repo; an unknown docs URL lands on a 404 page; a generic MCP-client connect page exists (every docs page carries the GitHub header-nav link and footer Source/Issues links — verified by grep across site/docs/*.html; site/404.html added at the site root where GitHub Pages serves it for project sites; site/docs/connect-mcp.html added with the stdio config and cross-linked from all four agent connect pages)
- [ ] If packages publish: `npx <chosen-name> check` runs the real CLI, and the versioning scheme is written down (blocked on DEC-077 approval, scope claim, and an NPM_TOKEN credential; the publish workflow, lockstep-version guard, package metadata, and RELEASING.md ritual are prepared and dry-run-only until then)

## Receipts

- 2026-08-24 — 6add8c0 — veri/decisions/DEC-077-cli-packages-publish-under-a-controlled-npm-scope-bin-veri.md, site/docs/how-veri-builds-veri.html, site/404.html, site/docs/connect-mcp.html, site/docs/*.html (docs strips + connect cross-links), site/index.html, README.md, RELEASING.md, packages/{core,cli,mcp}/package.json, .github/workflows/npm-publish.yml, veri/ids — Filed DEC-077 (proposed) settling CLI distribution: controlled npm scope (@veri first choice, @verikb fallback — registry checks confirmed veri is an unrelated VR package at 1.1.4 and both scopes hold zero packages), bin veri, lockstep 0.x versioning, manual publish. Shipped everything not gated on that DEC: the How-Veri-builds-Veri walkthrough (WO-077 through its eight real commits f7464a2→d7fe6a3, verified on main), 404 page, generic MCP-client connect page with the stdio config, README install-truth section and walkthrough link, package publish metadata, and the workflow_dispatch npm-publish workflow (dry-run default, lockstep guard). Verified: 555 tests green, action bundle unchanged after rebuild, veri check 0 issues (known WO-034 advisory only), all new pages 200 over a local http.server with commit links and internal hrefs audited. Remains, and why the WO stays in-progress: (a) DEC-077 approval and the @veri-scope claim are Daniel's acts; (b) actual npm publishing needs an NPM_TOKEN credential and a deliberate non-dry run; (c) the pages go live on the next push to main via site.yml — this session does not push.
