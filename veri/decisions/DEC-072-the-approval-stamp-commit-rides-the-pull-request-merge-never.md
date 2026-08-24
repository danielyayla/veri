---
id: DEC-072
type: decision
title: "The approval stamp commit rides the pull request; merge never approves"
status: active
approved: 2026-08-24
created: 2026-08-24
updated: 2026-08-24
links:
  - id: WO-077
    rel: constrains
  - id: REQ-026
    rel: satisfies
  - id: REQ-008
    rel: consistent-with
  - id: DEC-071
    rel: depends-on
  - id: DEC-002
    rel: consistent-with
---

## Choice

The documented team baseline for promoting knowledge-base documents:

1. Proposals ride a branch as `draft`/`proposed` — agents and proposers
   file freely, exactly as today.
2. The reviewing maintainer performs the deliberate approval act by
   running `veri approve <ID> --as <their name>` and pushing that commit
   to the branch, so the stamp — status flip, `approved:`,
   `approved_by:` ([[DEC-071]]) — is **in the PR before it merges**. The
   PR's final state is the post-approval state of the knowledge base.
3. Merging is never approving. An unstamped document merges as
   `proposed`/`draft` and simply stays pending — the REQ-008 gate already
   keeps it powerless — and no bot, action, or merge hook ever writes a
   stamp.

Provenance falls out of git: the stamp commit is authored by the
approver, reviewable in the PR diff as exactly the three-or-four-line
frontmatter edit, and permanent in history. The WO-076 action on the PR
verifies the merged result — gate rules, duplicate ids, stamp validity —
before it lands. Post-merge approval on main (`veri approve` after the
fact) remains legitimate for the change-then-ratify case; it is simply
not the baseline the docs teach. The website's team page and the
scaffolded workflow document both document this path end to end.

## Rejected alternatives

- **GitHub PR approval auto-promotes on merge** (a bot or action writes
  the stamp when a review is approved) — approval implied by merge
  mechanics is exactly what REQ-026 forbids; it also creates a hosted
  write path into `veri/` (against DEC-002) and welds the workflow to one
  forge.
- **Approve only after merge on main** — works and stays legitimate, but
  as the baseline it means every PR lands pending and main needs a
  follow-up stamp commit per document; review and approval separate in
  time and the PR no longer shows the state that will bind.
- **CODEOWNERS as the approval mechanism** — enforces who may merge, not
  who approved a document; GitHub-specific, invisible to core, and silent
  in the files.
- **A `veri approve --from-review` that trusts forge review metadata** —
  requires network and forge APIs in a local-first tool, and the review
  event still isn't the in-file record DEC-002 demands.

## Rationale

REQ-008 defines approval as a stamped frontmatter edit — an act in the
files. The only question for teams is *where* that act happens, and
putting it inside the PR keeps three things aligned that every
alternative splits: the reviewer's judgment, the stamp that binds, and
the diff a teammate audits later. The maintainer who reviews is the one
who stamps, in a commit they author, visible in the PR they approved —
provenance without any new machinery. Keeping merge mechanics powerless
means adopting GitHub flow adds no new way for an unreviewed document to
become canon.
