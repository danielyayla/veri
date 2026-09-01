---
id: DEC-150
type: decision
title: "The corpus runner is a shell-command judge behind veri skills eval, and the committed corpus is its own baseline"
status: active
approved: 2026-09-01
created: 2026-09-01
updated: 2026-09-01
links:
  - id: WO-147
    rel: constrains
  - id: DEC-129
    rel: implements
  - id: DEC-134
    rel: builds-on
  - id: DEC-125
    rel: consistent-with
---

## Choice

Four sub-choices, made together while building WO-147's runner:

1. **The judge is a shell command, invoked once per case.** `veri skills
   eval --judge <command>` runs the user's command through the shell for
   every corpus case, writing `{"utterance", "skills": [{"id",
   "description"}, …]}` as JSON on stdin and reading the verdict — a lineup
   skill id or `none` — as the last non-empty line of stdout. A non-zero
   exit, a hang past the timeout, or a verdict outside the lineup is a
   *judge error*: reported per case, never a pass, never a false trigger.
   The last-non-empty-line rule is deliberate, so an LLM-backed judge that
   reasons aloud stays inside the contract.

2. **The lineup is every method document present, status not consulted.**
   The judge grades the `description:` of each `veri/methods/` document —
   the same text the shell emitter installs — and the same id set is the
   backing set referential integrity checks the corpus against, so the two
   floors cannot drift. Existence is the bar because WO-147 sets it there,
   and because the corpus legitimately covers a draft gate (WO-146
   committed veri:review cases while MET-010 is draft); a lineup narrowed
   to `accepted` would flunk the corpus this repository ships.

3. **The committed corpus is the baseline — there is no results file.**
   DEC-129's "no regression against the corpus" is read the way DEC-069
   reads its committed bundle: the corpus is the known-good artifact, and
   the floor is that every committed case keeps passing, with zero false
   triggers on the negative set as its hardest subset. `eval` exits 0 only
   on a full pass. A case a judge cannot pass is fixed in the open — sharpen
   the description or revise the corpus entry in the commit that caused it —
   never recorded in a side file of tolerated failures. This is not a raised
   floor: it is the only mechanical reading of "no regression" that needs no
   second artifact to defend.

4. **CI's judge is repository configuration, skipped loudly when absent.**
   The integrity half gates every push (ci.yml); the judged half runs on
   `veri/methods/**` and `skills/**` changes through the repository variable
   `VERI_TRIGGER_JUDGE`, and until that is set the workflow emits a visible
   warning naming the repair instead of failing or pretending. The product
   ships no judge and makes no network call — v1's constraint holds; the
   judge is the user's command even when the user is this repository.

## Rejected alternatives

- **A committed results-baseline file (corpus + last run's pass/fail),
  regressions measured against it.** The most literal "no regression".
  Rejected because it institutionalises tolerated failures: a case could sit
  red in the baseline forever without anyone defending why, which is a
  score with extra steps — exactly what DEC-129 refused. It also adds a
  second committed artifact that can drift from the first.
- **A batch judge protocol — all cases in one invocation.** Fewer process
  spawns, cheaper for API-backed judges. Rejected because it moves
  per-case error attribution and output framing into the judge's contract
  (49 verdicts must come back keyed and ordered), making every judge
  harder to write; per-case invocation keeps the contract one line.
- **Judging only emitted (accepted) methods.** Matches DEC-130's "a draft
  never triggers". Rejected because it contradicts the integrity floor
  WO-147 states (MET existence) and would fail the shipped corpus, whose
  veri:review cases WO-146 deliberately committed against a draft method.
- **Shipping a deterministic heuristic judge (keyword matching) so CI can
  always run judged.** Rejected as a cheap metric standing in for the real
  one — SRC-062's failure mode. A toy judge's verdicts on near-miss pairs
  are noise, and a green judged lane would be read as evidence the triggers
  discriminate.
- **Failing CI hard when no judge is configured.** Loudest possible
  degradation. Rejected because it blocks every method edit on repository
  configuration only the maintainer can supply, punishing the wrong actor;
  the warning annotation names the repair without holding unrelated work
  hostage.

## Rationale

The runner's whole job is to make DEC-129's floor mechanical without
inventing a second artifact to defend. Everything above follows from taking
the corpus seriously as *the* baseline: the judge contract is small enough
to hold in one line, the lineup is derived from the same documents integrity
is checked against so one loader feeds both verdicts, and the exit code
states the floor rather than a score. The seam DEC-134 left — data in
`skills/`, schema in core, location known to the caller — is exactly where
the runner sits: `judgeInputFor`, `parseJudgeAnswer`, and `scoreTriggerEval`
are pure in core beside the schema, and the CLI owns only the spawn and the
report, the same split every other host surface uses (DEC-040).
