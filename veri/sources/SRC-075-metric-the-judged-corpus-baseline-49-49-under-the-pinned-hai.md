---
id: SRC-075
type: source
title: "Metric — the judged corpus baseline: 49/49 under the pinned Haiku judge, zero false triggers"
status: imported
kind: metric
created: 2026-09-02
updated: 2026-09-02
links:
  - id: DEC-150
    rel: relates-to
  - id: DEC-129
    rel: relates-to
  - id: WO-147
    rel: builds-on
  - id: SRC-066
    rel: relates-to
---

> Filed 2026-09-02 by the WO-159 session, from the first execution of
> the trigger corpus's judged leg. Until this run, the eval had only
> ever validated its own shape — [[SRC-066]] called the unexecuted
> corpus "a spec, not a test", and [[SRC-072]] carried the never-run
> judged leg as a caveat on REQ-040's verdict. This is the baseline
> future runs compare against.

## Parameters

- **Runner:** `node packages/cli/dist/cli.js skills eval --judge
  scripts/trigger-judge.sh` — the [[DEC-150]] contract exactly: the
  judge invoked once per case, `{"utterance","skills":[{"id",
  "description"},…]}` on stdin, verdict as the last non-empty stdout
  line.
- **Judge:** `scripts/trigger-judge.sh`, a `claude -p` wrapper with
  the model pinned to `claude-haiku-4-5-20251001` so baseline runs
  stay comparable; changing the model starts a new baseline, not a
  comparison. The prompt hands the judge the descriptions verbatim,
  tells it to honor their "Not for" exclusions, and to prefer `none`
  over a stretched match.
- **Corpus:** `skills/trigger-corpus.yaml` at 49 cases over 10 skills
  (16 of them the negative set), every entry backed by a method
  document — integrity validated clean before the judged leg ran.

## Result

**49 of 49 cases pass. Negative set: 0 false triggers across 16
cases.** No failing cases to name. Every gate skill was hit at least
once by the positive set: wayfinder 6, plan-work 4, define 3, decide 3,
implement 3, evidence-intake 3, product-discovery 3, did-it-work 3,
review 3, health 2 — and all 16 negatives (ordinary work,
conversation, out-of-remit asks) resolved to `none`.

## DEC-129's floor, read against this run

[[DEC-129]] expresses the floor as **no regression against the
committed corpus, plus zero false triggers on the negative set** —
deliberately not a percentage. Read against this run: **the floor
holds.** With a clean sheet, the floor's operational meaning from here
forward is exact: any previously passing case failing, or any negative
case firing a skill, is a regression; there is no failure budget to
spend.

## What this does and does not say

- The judged leg in CI (`skills-eval.yml`) still skips loudly —
  `VERI_TRIGGER_JUDGE` is unset, and setting the repository variable
  to `scripts/trigger-judge.sh` is the maintainer's act.
- A perfect score on a hand-written corpus measures the corpus's
  coverage and the descriptions' separability under one judge — not
  coaching efficacy, which [[DEC-129]] explicitly excludes from the
  pre-ship gate and assigns to the proving ground. A green run is not
  evidence the interviews produce good documents.
- One run, one judge model, one day. The comparison value arrives with
  the second run.
