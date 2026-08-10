---
id: REQ-008
type: requirement
title: Document approval workflow — proposals need Daniel's stamp to bind
status: accepted
approved: 2026-08-10
created: 2026-08-10
updated: 2026-08-10
links:
  - id: DEC-002
    rel: constrained-by
  - id: SRC-006
    rel: designed-by
  - id: REQ-001
    rel: depends-on
  - id: REQ-003
    rel: depends-on
---

## Purpose

Agent sessions freely draft requirements and decisions, but nothing an
agent files becomes binding on its own. Today a decision is born
`active` (the MCP `file_decision` tool hardcodes it) and a `draft`
requirement steers work exactly like an accepted one — AI-authored
artifacts silently become project canon. That is the product-drift
vector this requirement closes: authorship stays cheap, authority
requires an explicit human act.

## The workflow

1. **Born unapproved.** Decisions gain a `proposed` status
   (`proposed → active → superseded`); requirements already start
   `draft`. Every agent-facing write path (MCP writeback, templates)
   can only produce `proposed`/`draft` documents.
2. **Approval is a stamped frontmatter edit.** Promoting a document
   (`proposed → active`, `draft → accepted`) requires adding
   `approved: YYYY-MM-DD`. An `active` decision or `accepted`
   requirement without an `approved` date is a check issue. Per
   [[DEC-002]] there is no approval registry outside the files — the
   stamp in the markdown is the record, and git history is the audit
   trail.
3. **Unapproved documents have no downstream power.** A work order that
   is `in-progress` or `done` while linking (direct frontmatter links)
   to a `draft` requirement or `proposed` decision is a check issue.
   Backlog work orders may cite pending documents — proposals and their
   work orders can be drafted together for review as a package; the
   gate is on starting work, not on planning.
4. **Pending documents are visible, never hidden.** Context assembly
   moves them out of the binding sections into a labeled block
   ("Pending proposals — not ratified, do not treat as binding") so
   agents can neither rely on them nor unknowingly contradict them.
5. **Review feedback lives in the file.** Returning a document with a
   note appends a dated entry under `## Review notes`; the note reaches
   any agent through normal context packages.

## UI

The desktop app surfaces the queue and performs the stamp: NEEDS REVIEW
card on Home, review banner with approve/request-changes on pending
documents, pending markers in sidebar and palette, gate chips and
disabled agent-kickoff on gated work orders. The design is fixed by
[[SRC-006]]; approve shows the exact frontmatter edit before writing it.
A `veri approve <ID>` CLI command performs the same edit for
terminal-first review.

## Non-goals

- Comprehension quizzes before approval (explicitly dropped).
- Bulk approve, or a reject/delete button — discarding a proposal is a
  git act.
- Hard enforcement of human-only promotion (git hooks); the gate makes
  promotion loud and auditable, not cryptographically impossible.
