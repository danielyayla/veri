---
id: REQ-027
type: requirement
title: "The repository presents as a properly licensed, discoverable open-source project"
status: accepted
approved: 2026-08-24
created: 2026-08-24
updated: 2026-08-24
links:
  - id: SRC-040
    rel: derived-from
  - id: DEC-074
    rel: constrained-by
---

A developer landing on the GitHub repository must be able to answer, without leaving the page: what Veri is, what it looks like, what they may legally do with it, and where the documentation lives.

Concretely, what must hold:

- The repository carries a license GitHub detects and renders as a chip, and every published package manifest declares the same license ([[DEC-074]]).
- The repo profile is populated: description, homepage pointing at the website, and topics matching how people search for agent tooling.
- The README is accurate to the current architecture, opens with a visual of the product and status badges, states in one line who the tool is for, and states the platform scope (what runs where today) as a decision rather than an omission.
- One authoritative statement of the development Node version exists, and every surface that mentions it agrees.

This is the presentation layer only — it changes no behavior of any package. Evidence for the gaps this closes: [[SRC-040]].

## Acceptance criteria

- [ ] GitHub's repo page renders the license chip and `gh repo view` reports the license
- [ ] Description, homepage, and topics are set and visible on the repo page
- [ ] README shows screenshot, badges, who-for line, and platform scope, and contains no stale architecture claims
- [ ] Node-version guidance is stated once and consistent everywhere it appears
