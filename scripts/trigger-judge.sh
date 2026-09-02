#!/usr/bin/env bash
# The reference trigger judge (WO-159, DEC-150): `veri skills eval
# --judge scripts/trigger-judge.sh` invokes this once per corpus case,
# passing {"utterance","skills":[{"id","description"},...]} as JSON on
# stdin; the verdict is the last non-empty line of stdout — one skill id
# verbatim from the list, or `none`.
#
# CI reads its judge from the VERI_TRIGGER_JUDGE repository variable
# (.github/workflows/skills-eval.yml, skipped loudly when unset);
# setting that variable is the maintainer's act. Re-run locally:
#   node packages/cli/dist/cli.js skills eval --judge scripts/trigger-judge.sh
#
# The judge model is pinned so baseline runs stay comparable across
# invocations; changing it starts a new baseline, not a comparison.
set -euo pipefail
# CI bootstrap: the runner has no claude CLI; the first invocation
# installs it (globals persist across the job's 49 calls). All install
# output is silenced — the verdict contract is the last non-empty
# stdout line, and npm chatter would corrupt every answer.
command -v claude >/dev/null 2>&1 || npm install -g @anthropic-ai/claude-code >/dev/null 2>&1
CASE=$(cat)
claude -p --model claude-haiku-4-5-20251001 "You are a skill router for an agent harness. Below is a JSON object carrying a user utterance and the available skills, each with an id and the trigger description its author wrote. Decide which ONE skill's description claims this utterance. Take the descriptions at their word — including their 'Not for' exclusions — and prefer no skill over a stretched match: if the utterance is ordinary work, conversation, or outside every description's remit, the answer is none.

Reply with EXACTLY one line: one id verbatim from the skills list, or none. No punctuation, no explanation.

$CASE"
