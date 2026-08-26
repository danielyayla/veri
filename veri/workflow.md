---
id: WF-001
type: workflow
title: Veri project workflow
status: accepted
approved: 2026-08-25
created: 2026-08-12
updated: 2026-08-26
design_gate_paths:
  - packages/ui
modules:
  - name: core
    path: packages/core
    purpose: Pure domain logic — parse, validate, check, and assemble over veri/
  - name: cli
    path: packages/cli
    purpose: Terminal surface — commands over core, plus the git and process adapters hosts own
  - name: mcp
    path: packages/mcp
    purpose: The agent door — MCP server serving context packages and writeback, subprocess-free
  - name: ui
    path: packages/ui
    purpose: The desktop app — Tauri 2 shell (Rust glue + Node sidecar) review surface composing the other three packages
---

How work moves through this repo. Veri is self-hosted: it is built by
executing Veri work orders, and this document arrives as the first
section of every context package ([[DEC-018]]).

## The path of work

Evidence enters as sources; sources become requirements and decisions;
those become work orders; work orders become implementation with
receipts.

## Rules for implementers

1. Never start coding from a chat prompt alone. Find the relevant work
   order in `veri/work-orders/`. If none exists, say so and propose
   one.
2. Before implementing a work order, read every document it links to
   (requirements, decisions) in full. Respect linked decisions — if
   you believe a decision is wrong, stop and say so instead of
   silently deviating.
3. Stay inside the work order's "In scope" section. Anything in
   "Out of scope" is forbidden, even if it seems easy or obvious.
4. When you make a non-trivial technical choice during implementation
   (library selection, algorithm, schema shape), file it as a new
   decision in `veri/decisions/` using the next free DEC id, status
   `proposed`, with the alternatives you rejected. Never promote a
   document yourself: `active`/`accepted` (with the `approved:` stamp)
   is the user's act, via `veri approve` or the app ([[REQ-008]]).
5. When you finish a work session on a work order, append a receipt to
   the work order file under `## Receipts`: date, commit SHA, files
   touched, one-line summary. A work order is `done` only when all
   acceptance criteria are checked AND at least one receipt exists.
6. Run `veri check` before declaring any work complete. Zero issues is
   the bar.
7. Any work order touching `packages/ui` must link a design document
   (`rel: designed-by`) before implementation ([[DEC-012]]). If none
   exists, produce the design first with Claude Design, commit it as a
   `source` document in `veri/`, and stop for user approval before
   writing code. `veri check` enforces this via the `design_gate_paths`
   list in this document's frontmatter ([[DEC-039]]), reading what the
   work claims, not how it is written about ([[DEC-114]]): declare
   gated paths in `binds: paths:` — a declaration without a designed-by
   link fails the check, commits that touch a gated path the work order
   never declared are flagged as an advisory, and prose that names a
   gated path with no declaration earns an advisory nudge to declare
   or design.
8. One session, one work order, one worktree. Begin implementation with
   `veri start <WO-id> --as <session>` (or the `start_work_order` MCP
   tool): it flips the ready work order to in-progress and records the
   claim — `claimed_by`/`claimed_at` — so concurrent sessions see who
   holds what instead of colliding. Commit the flip with a subject like
   `WO-042: started`. Sessions running in parallel each work in their
   own git worktree, one per claimed work order; an in-progress work
   order without a claim fails `veri check`, and a claim another
   session holds is refused — pick different work orders, never share
   one.
