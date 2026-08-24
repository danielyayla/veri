---
id: WO-080
type: work-order
title: "Contributor onramp: CONTRIBUTING, SECURITY, community files, repo settings"
status: in-progress
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-029
    rel: implements
  - id: SRC-040
    rel: informed-by
  - id: REQ-008
    rel: constrained-by
  - id: REQ-026
    rel: consistent-with
---

## Summary

Give an outside contributor a path from "found the repo" to "opened a useful PR" without tribal knowledge. Veri needs this more than most projects: the self-hosted workflow means an outsider's PR fails the Veri gate unless a work order exists and its documents are approved — acts they cannot perform themselves (REQ-008). CONTRIBUTING.md must turn that gate from a mystery failure into a guided step ("open an issue; the maintainer files the work order; reference it from your PR"). Rounds out the standard community files (SECURITY.md, PR template, issue-template config.yml, dependabot) and the repo settings that signal a maintained project (labels, seeded good-first-issues, Discussions, branch protection). Complements WO-077: that work order defines multi-maintainer semantics inside veri/; this one addresses outside contributors and the GitHub-side surface, and links to WO-077's team docs when they land.

## In scope

- CONTRIBUTING.md: what contributions are welcome, how the veri/ workflow applies to outsiders, dev setup in one block (authoritative Node version, npm install && npm test, running the app locally), and the AGENTS.md pointer for agent-assisted contributors
- SECURITY.md with private vulnerability reporting enabled, scope, and a supported-versions line
- .github/PULL_REQUEST_TEMPLATE.md (what changed, linked WO/issue, how verified)
- .github/ISSUE_TEMPLATE/config.yml: blank_issues_enabled: false, contact links to the troubleshooting page and Discussions
- Label set beyond bug/feedback (good-first-issue, help-wanted, docs, action, app) and 3–5 seeded good-first-issues
- .github/dependabot.yml covering npm (root + workspaces), github-actions, and cargo (the Tauri shell's src-tauri crate — a manifest path for dependabot, not UI design work)
- Enable GitHub Discussions with a starter category structure
- Branch protection on main requiring the CI and Veri gate checks (aligned with WO-077's multi-committer direction)

## Out of scope

- Multi-maintainer approval semantics, ID-collision handling, and the team-workflow website page (WO-077 owns these)
- A CODE_OF_CONDUCT beyond adopting a standard one if desired — decide during implementation, don't author a custom one
- Changing the Veri gate's behavior for fork PRs (if the gate needs a fork-PR mode, file it as a follow-up against WO-076/REQ-025)
- License and README work (WO-078)

## Requirements

- [[SRC-040]] — informed-by
- [[REQ-008]] — constrained-by
- [[REQ-026]] — consistent-with

## Acceptance tests

- [ ] CONTRIBUTING.md exists and explains the work-order gate such that an outsider knows why the Veri gate might fail their PR and what to do about it
- [ ] GitHub's community-standards checklist shows license, contributing, security policy, and issue/PR templates all present
- [ ] A test PR from a non-maintainer perspective hits no undocumented obstacle: templates render, required checks are named, the gate's failure mode is explained
- [ ] Dependabot opens its first update PRs and they pass CI
- [ ] Discussions is live and linked from the issue-template config
- [ ] main is protected: required checks CI + Veri gate

## Receipts

(none yet)
