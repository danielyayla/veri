---
id: SRC-072
type: source
title: "Outcome — the skill library operated its own project end to end: REQ-040's graph-health bet, measured"
status: imported
kind: outcome
created: 2026-09-02
updated: 2026-09-02
links:
  - id: REQ-040
    rel: supports
  - id: WO-133
    rel: outcome-of
  - id: WO-134
    rel: outcome-of
  - id: WO-135
    rel: outcome-of
---

> Filed 2026-09-02 at Daniel's direction, after [[WO-125]] closed the
> last of [[REQ-040]]'s fourteen work orders. The one real project the
> bet's target names is this repository itself — Veri is self-hosted,
> and the 2026-09-01 migration batch is the end-to-end run. Reality's
> answer supports the bet, with the caveats below; judging what it
> means for the requirement is the user's act.

## The declared target, measured

**A zero-violation graph.** `veri check` on 2026-09-02: 429 documents,
0 issues. The graph has held at zero violations through the entire
skill-operated batch.

**Requirements with evidence links.** 27 of 42 requirements carry a
`derived-from` link to a source. Every one of the 15 without predates
the skill library — they are the pre-skill intuition-only baseline the
check's REQ-038 advisories name; no requirement filed through the
skills lacks its evidence link.

**Decisions with recorded alternatives.** 150 of 150 decision
documents carry a `## Rejected alternatives` section. The skill-era
decisions were spot-verified beyond the section's presence: the
veri:review pass ([[SRC-071]]) read [[DEC-148]]'s four alternatives
and found them genuinely argued, not filled in.

**Hypotheses with outcome sources.** [[REQ-035]]'s bet was settled by
[[SRC-062]]; with this filing, no hypothesis whose work orders are all
done lacks an outcome source — the check's untested-bet advisory
count returns to zero.

**Continued skill use after first invocation.** All ten skills remain
installed in `.claude/skills/`. In the week after first install the
gates ran repeatedly and productively: veri:plan-work cut the
fourteen-order migration backlog, veri:decide filed the migration's
decisions, veri:implement ran every one of WO-141–154's sessions, and
veri:review's first real pass produced five findings that were all
repaired ([[SRC-071]]). No skill-filed document has been withdrawn as
noise to date.

**End to end.** The full loop closed through the skills: evidence in
([[SRC-066]], the playbook audit) → requirements and decisions →
bounded work orders → shipped implementation with receipts → outcome
sources ([[SRC-062]], [[SRC-064]], [[SRC-065]], this document).

## Caveats the numbers do not carry

- **The one real project is Veri itself**, operated by its own
  maintainer and agent sessions. Self-hosting is a real end-to-end
  run, but it is the friendliest possible user; adoption by a project
  that did not build the tool is unmeasured, and until [[WO-155]]
  ships the format-5 reader an outside `npx @verikb/cli` user cannot
  reproduce this run at all.
- **The trigger corpus's judged leg has not run** — [[WO-147]]'s
  runner holds the mechanical floor, but the LLM-judged tier awaits
  the `VERI_TRIGGER_JUDGE` repository variable.
- **Skill-use evidence is one week deep.** "Users keep the skills
  installed" is true so far and shallow; the refuting outcome
  (invoked once, abandoned) can only show up with time.
