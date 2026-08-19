---
id: WO-029
type: work-order
title: Website and user documentation
status: done
created: 2026-08-17
updated: 2026-08-17
links:
  - id: REQ-012
    rel: implements
  - id: SRC-012
    rel: informed-by
  - id: DEC-029
    rel: constrained-by
---

## Summary

Veri has no public web presence: the only written material is the
developer README. Deliver the site and the user documentation layer
in one motion — a landing page that shows the real loop (file a work
order → agent pulls the context package → receipt lands), a download
action that always resolves to the latest GitHub Release
([[DEC-029]]'s feed), and layered docs: 10-minute quickstart,
workflow guide, per-agent connection pages, and reference with
troubleshooting. Restructure the README to lead with the download.

## In scope

- Static site with landing page (what Veri is in one sentence, who
  it is for, the loop shown as screenshot or short recording) and a
  download action pointing at the latest release without per-release
  site edits.
- Hosting, domain, and site tooling filed as a proposed DEC when
  work starts; default posture is zero standing infrastructure,
  consistent with [[DEC-029]]. Docs URLs must be stable enough to
  reference from the app and README.
- Quickstart: install → create project → connect agent → file one
  work order → watch the agent use it, using the bundled demo as
  the worked example ([[DEC-007]]).
- Workflow guide: the sources → requirements/decisions → work
  orders → receipts method, written for humans (the scaffolded
  workflow document targets agents).
- Per-agent connection pages: what Veri writes, where, how to
  verify — one per config format the connection panel supports.
- Reference: document types, frontmatter, link rels, templates,
  `veri check` rules; troubleshooting including update rollback
  (re-download the older DMG) and the system requirements
  (macOS version, agent-side Node runtime while it remains a
  dependency).
- README restructure: download first, build-from-source demoted to
  a development section.

## Out of scope

- License selection and any legal text beyond a short privacy
  statement (the app contacts GitHub Releases for update checks,
  nothing else) — the license is the user's call and a prerequisite
  for publicizing, not part of this WO.
- Naming/trademark/domain clearance (user task flagged in
  [[SRC-012]]).
- In-app help surfaces or links from the app into the docs.
- Docs for Windows/Linux installs.
- Blog, analytics, newsletter, or any dynamic site features.

## Requirements

Implements [[REQ-012]] — website and user documentation.

## Acceptance tests

- [x] A person who has never seen the repo can, from the site
      alone, say what Veri does, download the current release, and
      complete the quickstart to a working agent connection
- [x] The download action resolves to the newest published release
      with no site edit after a release is published
- [x] Every config format the connection panel writes has a
      connection page: what is written, where, and a verification
      step
- [x] The workflow guide is self-contained: a reader with no prior
      context can name all five document types and the path of work
- [x] README leads with the download path; build-from-source moved
      under development
- [x] Site hosting/tooling choice filed as a proposed DEC with
      rejected alternatives
- [x] `veri check` and `npm test` are clean

## Receipts

- 2026-08-17 — 6f60207 — ["site/index.html", "site/site.css", "site/docs/quickstart.html", "site/docs/workflow.html", "site/docs/connect-claude-code.html", "site/docs/reference.html", "site/docs/troubleshooting.html", "site/assets/home.png", "site/assets/work-order.png", ".github/workflows/site.yml", "README.md", "veri/decisions/DEC-033-github-pages-serves-the-hand-authored-static-site-from-site.md", "veri/work-orders/WO-029-website-and-user-documentation.md"] — claude-code session: DEC-033 filed proposed (GitHub Pages + hand-authored static HTML in site/, Actions deploy, client-side latest-release resolution); landing page with the loop shown via fresh sample-project screenshots and a download button verified live resolving the v0.1.3 DMG from the releases API; docs layer (quickstart on the bundled sample, workflow guide naming all five types and the path of work, .mcp.json connection page with verification, reference, troubleshooting with the five verify causes and DMG rollback); site.yml Pages workflow (enablement: true — first deploy needs no settings step); README restructured download-first with build-from-source under Development (stale file_decision status corrected to proposed). 242 tests + veri check clean. Remaining for the first acceptance box: approve DEC-033, push main so the site deploys, then confirm the stranger path on the live URL.
- 2026-08-17 — ["veri/decisions/DEC-033-github-pages-serves-the-hand-authored-static-site-from-site.md", "veri/work-orders/WO-029-website-and-user-documentation.md", ".github/workflows/site.yml"] — claude-code session (approval commit 62abc61 "DEC-033: approved" — a lifecycle commit, not WO-prefixed): Daniel approved DEC-033 (active) and asked to push. Pushed main; first site.yml run failed — GITHUB_TOKEN cannot create a Pages site, so enablement: true only works once the site exists. Enabled Pages via gh api (build_type: workflow), re-ran the workflow: success. Live verification at https://danielyayla.github.io/veri/ — landing, all five docs pages, CSS, and both screenshots serve 200; the download button resolves the v0.1.3 universal DMG on the live origin. First acceptance box checked; WO done.
