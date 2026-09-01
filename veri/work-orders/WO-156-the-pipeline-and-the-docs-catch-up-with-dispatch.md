---
id: WO-156
type: work-order
title: "The pipeline and the docs catch up with dispatch"
status: backlog
created: 2026-09-02
updated: 2026-09-02
links:
  - id: REQ-012
    rel: implements
  - id: DEC-143
    rel: constrained-by
  - id: DEC-148
    rel: constrained-by
  - id: WO-143
    rel: follows-from
  - id: SRC-071
    rel: informed-by
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
verify: bash -c '! grep -rn "veri start" .github/workflows site/docs'
---

## Summary

WO-143 retired `ready` and shipped `veri dispatch`, but three outward surfaces still teach the old lifecycle. `.github/workflows/veri-dispatch.yml` claims the queue head with `$VERI start` (line 105) — a command that no longer exists, so the pipeline dies at the claim step — and its comments still narrate a ready queue. reference.html documents `backlog → ready → in-progress` entered via `veri approve`/`veri start`; dispatch.html is written entirely around the retired model; ci.html promises the ready queue a consumer. The most authoritative adopter-facing pages contradict the shipped schema, and the one regressed playbook principle (non-interactive agents in the pipeline) is regressed precisely here. This work order pays the debt: the workflow claims via `veri dispatch --as` (passing `--by` where a maintainers registry is configured), and the docs teach the dispatch model including DEC-148's distinction — a fresh stamp is the user's judgment alone, so the headless workflow may only spend a stamp already on record, never mint one.

## In scope

- `.github/workflows/veri-dispatch.yml`: replace the `$VERI start` claim step with `veri dispatch <id> --as <claimant>` (with `--by` handling), guard it so only a backlog work order already carrying `approved:` is dispatched, and rewrite the ready-queue comments (lines 1–2, 20, 46, 88–90, 168)
- `site/docs/reference.html`: the lifecycle section and CLI command list reflect `backlog → in-progress → done` with dispatch as the one transition
- `site/docs/dispatch.html`: rewritten around the dispatch model
- `site/docs/ci.html`: the ready-queue-consumer line corrected

## Out of scope

- packages/ui (the app's dead ready lanes are their own work order, behind the design gate)
- Any CLI or core behavior change — this is surfaces catching up, not semantics moving
- WO-151's fate (the user's judgment; its premise is stale)
- The action bundle (rebuilt separately at 5f9a4c7)

## Acceptance tests

- [ ] No occurrence of `veri start` remains anywhere under `.github/workflows/` or `site/docs/` — the declared verify command proves it
- [ ] `veri-dispatch.yml` claims with `veri dispatch <id> --as <claimant>`, passes `--by` when a maintainers registry is configured, and dispatches only a head that already carries an `approved:` stamp — an unstamped head is reported and left for the user, and no run path can mint a stamp (DEC-148)
- [ ] reference.html's lifecycle and CLI sections name only live statuses and commands; no page under site/docs presents `ready` as a current status or `veri approve`/`veri start` as work-order transitions
- [ ] dispatch.html teaches the dispatch model end to end, including that dispatch is the approval (DEC-143) and the fresh-stamp/spent-stamp distinction (DEC-148)

## Receipts

(none yet)
