---
id: DEC-080
type: decision
title: "Binding drift semantics — the derived active era, subject-claim precedence, and grep-level test facts"
status: proposed
created: 2026-08-24
updated: 2026-08-24
links:
  - id: WO-088
    rel: constrains
  - id: DEC-041
    rel: extends
  - id: DEC-040
    rel: follows-from
  - id: DEC-025
    rel: constrained-by
  - id: DEC-079
    rel: follows-from
---

## Choice

The WO-088 detectors are pure core functions (binds.ts) over documents plus host-collected facts, with these semantics. (1) The diff range for unclaimed-change detection is the derived "active era", never a stored anchor: commits newer than each in-progress bound work order's start commit — recognized by subject naming the id plus a form of "start", the DEC-041 lifecycle-by-subject pattern — falling back to commits dated on or after the work order's `created`. (2) A commit whose subject names any work order is claimed by the existing WO-nnn: convention and never flagged; bindings catch what the subject convention misses rather than double-charging it. (3) Both git-backed detectors are inert until at least one in-progress work order declares `binds.paths`, and in a knowledge-base-only repository (veri/ at the repo root) there is no code to claim, so they return nothing. (4) The staleness window is `stale_after_days` on the workflow document's frontmatter (default 14), the DEC-059/DEC-071 policy home. (5) A bound test identifier is a repo-root-relative file path, optionally `::name`; the CLI's collector (testfacts.ts) resolves each to a boolean — file exists, and the name appears in its text — and core's checkBoundTests judges only those answers, so the test check runs even without git. (6) Glob matching is a hand-rolled ~30-line compiler (`**` crosses segments, `*`/`?` stay within one, a bare directory claims its subtree) instead of a dependency. (7) The unclaimed-change advisory anchors `id` to the short commit sha since no document owns a commit; document-keyed surfaces skip it by construction. (8) The format marker stays at 1: `binds` is optional and additive, and older Veris preserve it as an unknown key. New work orders surface the block as commented lines in generated frontmatter, since body templates cannot carry frontmatter.

## Rejected alternatives

- A stored check anchor (last-check file under .veri/ or veri/) for the diff range — violates REQ-021's no-stored-index rule and DEC-002's derive-don't-book-keep posture; the era is reconstructible from history alone.
- Flagging subject-claimed commits that also miss every binding — double-charges the existing convention and floods disciplined repos; bindings are additive coverage, not a stricter regime.
- Running unclaimed-change detection with no binding claimants (treating all code commits as unclaimed) — turns adoption into a wall of red on day one, the exact failure DEC-025's advisory discipline exists to avoid.
- stale_after_days in a separate config file — relitigates DEC-079's policy.yml rejection.
- Test-runner integration (executing or listing tests) for bound-test facts — per-framework adapters, nondeterministic in CI, and a subprocess in a path that must stay boring; existence-plus-name-grep is verifiable by eye.
- minimatch/picomatch for glob matching — a real dependency tree in a core that is deliberately yaml + zod only, for three operators.
- Anchoring unclaimed-change advisories to the workflow document so the UI surfaces them — misfiles a code finding under a policy document; the UI's document-keyed grouping is the wrong surface for commit-keyed findings, and forcing it would distort both.

## Rationale

Every choice keeps the WO-088 acceptance bar — deterministic, advisory-only, no stored state — while reusing conventions the corpus already trusts. Deriving the era from start commits extends DEC-041's existing lifecycle-by-subject recognition instead of inventing a second convention, and the created-date fallback means projects that never write start commits still get a sane, slightly wider window. Subject-claim precedence keeps the two provenance mechanisms composable: repos disciplined about WO-nnn: subjects see zero new noise, and bindings add signal exactly where subjects are absent. Inertness-without-claimants makes adoption opt-in per work order — no repo wakes up to a wall of advisories. Workflow frontmatter is already the ruled policy home (DEC-079 reaffirmed it against policy.yml), so the staleness knob lives there. Grep-level test resolution is deliberately dumber than a runner integration: it cannot flake, needs no per-language adapters, and a rename that keeps the name string is exactly the case the advisory tier can afford to miss. The hand-rolled glob keeps core's yaml+zod-only dependency posture (DEC-040's rationale) for three operators that fit in thirty tested lines.
