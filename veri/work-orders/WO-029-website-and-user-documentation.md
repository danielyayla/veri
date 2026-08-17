---
id: WO-029
type: work-order
title: Website and user documentation
status: in-progress
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

- [ ] A person who has never seen the repo can, from the site
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

(none yet)
