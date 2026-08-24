---
id: SRC-040
type: source
title: "Open-source readiness audit of the repository (2026-08-24)"
status: imported
created: 2026-08-24
updated: 2026-08-24
---

A review of the repository, documentation, releases, and workflows from the new-user, contributor, and maintainer perspectives, conducted 2026-08-24 against the working tree at commit 2392fed and the live GitHub state (`gh repo view`, `gh release view v0.2.1`, `gh run list`). Full report: https://claude.ai/code/artifact/3755786b-cb0e-4ae8-98be-ef28d626ab8e

## Verified findings

**Licensing (critical).** No LICENSE file exists anywhere in the tree; no `package.json` declares a `license` field; GitHub reports `licenseInfo: null`. Default copyright applies — the project is not legally open source, and no license chip renders on the repo.

**Repository profile (empty).** `gh repo view` returns `description: ""`, `homepageUrl: ""`, `repositoryTopics: null`, Discussions disabled. No social-preview image is set despite `site/assets/og.png` existing.

**README accuracy.** README.md line 47 describes `@veri/ui` as "the Electron desktop app"; the app is Tauri 2 (WF-001 modules list, [[DEC-063]], release.yml). README has no screenshot and no badges. Node version guidance is scattered: root engines `>=20`, README dev note `>=22.18`, CI uses 22, the action runs `node24`.

**Release pipeline defect.** `.github/workflows/release.yml` triggers on `tags: ["v*"]`. Pushing the action's `v1` and `v1.0.0` tags (2026-08-24) triggered two release runs that failed the tag-vs-app-version check (run ids 32723745208, 32723744702) — red runs now head the Actions tab. The action-tag and app-tag namespaces collide by construction.

**Release notes.** The v0.2.1 release body is the SIZES.md artifact-size manifest plus internal bridge notes in work-order vocabulary; no user-facing "what changed". No CHANGELOG.md exists.

**CI hygiene.** `ci.yml` push trigger includes a stale `my` branch alongside `main`.

**Community files (absent).** No CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, PULL_REQUEST_TEMPLATE.md, dependabot.yml, CODEOWNERS, or ISSUE_TEMPLATE/config.yml. Issue tracker and PR list are empty; no labels beyond the two template labels; no seeded good-first-issues. The Veri gate (`veri-check.yml`) will fail outside PRs with no public explanation of the work-order/approval workflow an outsider cannot self-serve ([[REQ-008]]).

**Distribution.** The npm name `veri` is owned by an unrelated package (v1.1.4); `@veri/cli` is unpublished — `npx veri` installs someone else's software. The CLI is obtainable only inside the app bundle or by building from source. No Homebrew tap. macOS-only scope is nowhere stated as a decision.

**Strengths confirmed** (no action needed, context for scoping): live docs site (200 OK) with quickstart, four agent-connection guides, reference, troubleshooting; signed/notarized Tauri release pipeline with updater feed and size gate ([[REQ-023]]); issue templates wired to in-app prefill (WO-031); the action dogfooded on this repo's own PRs (WO-076, [[REQ-025]]); the self-hosted veri/ corpus (75 WOs, 69 DECs at review time) as unique proof-of-product.
