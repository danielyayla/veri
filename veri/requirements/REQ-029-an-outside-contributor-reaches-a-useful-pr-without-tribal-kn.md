---
id: REQ-029
type: requirement
title: "An outside contributor reaches a useful PR without tribal knowledge"
status: accepted
approved: 2026-08-24
created: 2026-08-24
updated: 2026-08-24
links:
  - id: SRC-040
    rel: derived-from
  - id: REQ-008
    rel: depends-on
  - id: REQ-026
    rel: consistent-with
---

A stranger who finds the repository can go from clone to a well-formed pull request guided only by files in the repository and standard GitHub surfaces — no chat history, no maintainer folklore.

Veri raises the bar on itself here: the self-hosted workflow means an outsider's PR fails the Veri gate unless a work order exists and its enabling documents are approved — acts only the maintainer can perform ([[REQ-008]]). The contribution docs must convert that gate from a mystery red X into a documented step of the process.

The GitHub-side surface must also signal a maintained project: standard community files where GitHub looks for them, dependency updates automated, the default branch protected by the same checks contributors are told about, and a public place to ask questions that is not the issue tracker.

## Acceptance criteria

- [ ] CONTRIBUTING.md explains what contributions are welcome, the one-block dev setup (authoritative Node version), and how the veri/ workflow applies to an outsider's PR — including why the Veri gate may fail it and what to do
- [ ] GitHub's community-standards checklist shows license, contributing guide, security policy, and issue/PR templates present
- [ ] Vulnerabilities have a private reporting path documented in SECURITY.md
- [ ] Dependency updates arrive automatically for every ecosystem in the repo (npm, github-actions, cargo)
- [ ] main is protected: PRs only, with the CI and Veri gate checks required
- [ ] Questions have a home outside the issue tracker (Discussions), linked from the issue-template chooser
