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

- [ ] The hero shows a copyable install command that works verbatim on a clean machine, or — if WO-081 lands on app/action-only — the hero states the DMG path plainly and this test is re-scoped in a receipt
- [ ] A Linux/Windows visitor finds an explicit statement of what they can use today within one viewport of the hero, and again in the quickstart prerequisites
- [ ] The command block passes both themes' AA baseline and has a working copy affordance without adding a build step
- [ ] No install claim on the site outruns what WO-081 actually shipped

## Receipts

(none yet)
