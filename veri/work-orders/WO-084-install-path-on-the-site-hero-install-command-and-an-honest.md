---
id: WO-084
type: work-order
title: "Install path on the site: hero install command and an honest non-Mac story"
status: in-progress
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-012
    rel: implements
  - id: SRC-041
    rel: informed-by
  - id: WO-081
    rel: depends-on
---

## Summary

SRC-041 critical finding #2, the website surface of what WO-081 decides underneath: today "macOS 13+" lives only in the small mono sub-line, there is no copyable install command anywhere, and a Linux or Windows developer finds no statement at all — silence that reads as "not for you, ever." Once WO-081's distribution DEC lands (npm scope, Homebrew cask, or app+action only), surface it: a copyable one-line install command in the hero (brew cask and/or npx form), and one honest sentence on the homepage and quickstart telling non-Mac developers exactly what works for them today (CLI/MCP/action if published, or a tracked issue to watch) instead of nothing.

## In scope

- A copyable install command block in the hero of `site/index.html`, styled within the existing token system, with the DMG buttons retained as the secondary path
- Platform statement: one plain sentence for non-Mac visitors on the homepage and in the quickstart prerequisites, saying what runs cross-platform today and what is macOS-only, matching whatever WO-081's DEC makes true
- Quickstart step 1 updated to lead with the command-line install when one exists
- Copy-to-clipboard affordance for the hero command (small inline script is acceptable under the no-build rule)

## Out of scope

- The distribution decision and pipelines themselves — npm publish, Homebrew tap/cask, bin naming (all WO-081)
- Windows/Linux app builds
- Any restructuring of homepage bands (WO-083)
- Claiming an install path before it actually works on a clean machine

## Requirements

- [[REQ-012]] — implements
- [[SRC-041]] — informed-by
- [[WO-081]] — depends-on

## Acceptance tests

- [x] The hero shows a copyable install command that works verbatim on a clean machine, or — if WO-081 lands on app/action-only — the hero states the DMG path plainly and this test is re-scoped in a receipt (second arm: DEC-077 chose npm but the publish is unexecuted — `npm view @veri/cli` 404s as of 2026-08-24 — so shipped reality is app/action/source; the hero states the DMG plainly with version, macOS 13+, and both arch chips, and the re-scope is recorded in the 0571c85 receipt and DEC-084)
- [x] A Linux/Windows visitor finds an explicit statement of what they can use today within one viewport of the hero, and again in the quickstart prerequisites (`.dl-platforms` sentence sits directly under the hero download sub-line — CI gate on any platform, CLI/MCP from a source checkout on Node 20+, "not yet on npm" — and the same sentence follows the quickstart's prerequisites paragraph; verified rendered in both themes over a local http.server)
- [ ] The command block passes both themes' AA baseline and has a working copy affordance without adding a build step
- [x] No install claim on the site outruns what WO-081 actually shipped (no command block ships until the npm publish executes — DEC-084 couples the hero command to the publish commit; every install statement on the homepage and quickstart names only the DMG, the CI action, and the source checkout, each verified working today)

## Receipts

- 2026-08-24 — 0571c85 — site/index.html, site/site.css, site/docs/quickstart.html, site/docs/*.html (cache-bust v=8), veri/decisions/DEC-084-hero-install-surface-leads-with-the-dmg-until-the-npm-publish.md, veri/ids — Hero platform statement and honest non-Mac story shipped; the copyable command block is deliberately deferred. Ground truth at implementation time: DEC-077 (active) chose npm publishing but the publish is unexecuted (`npm view @veri/cli` and `@verikb/cli` both 404, 2026-08-24; WO-081's sole open box), so the only verbatim clean-machine install is the signed DMG. Acceptance test 1 is re-scoped per its own second arm: the hero states the DMG path plainly (button, version, macOS 13+, both arch chips), and DEC-084 (proposed) records that the hero command block (`npm install -g @veri/cli` + copy affordance) ships in the same change that executes the publish, so command and registry can never disagree. Shipped now: `.dl-platforms` sentence in the hero first viewport and in the quickstart prerequisites (CI gate runs on any platform; CLI/MCP from a source checkout on Node 20+; explicitly not yet on npm), harmonized fin platform line with links, site.css v=8 bump on all 14 stylesheet-linked pages. Quickstart step 1 stays DMG-led — in-scope's "when one exists" condition is unmet. Verified: both pages rendered in dark and light over a local http.server (all assets 200, no console errors); 578 tests green in a clean worktree at this commit (the shared tree carries another session's mid-edit scaffold.ts, untouched); `veri check` 0 issues (known WO-034 advisory only). Remains, and why the WO stays in-progress: acceptance test 3 (the command block's AA + copy affordance) can only exist once Daniel claims the npm scope, adds NPM_TOKEN, and runs the publish workflow non-dry — the follow-up session that does so should implement DEC-084's command block in the same change.
