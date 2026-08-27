---
id: SRC-062
type: source
title: "Outcome — REQ-035's median-time-to-judgment was already past target before the intent home shipped; the metric does not discriminate"
status: imported
kind: outcome
created: 2026-08-27
updated: 2026-08-27
links:
  - id: REQ-035
    rel: tests
  - id: WO-117
    rel: outcome-of
  - id: WO-126
    rel: outcome-of
  - id: SRC-061
    rel: derived-from
---

Reality's answer to [[REQ-035]]'s bet, computed from the corpus as that requirement said it could be ("filed dates against `approved:` stamps... no external telemetry"). Measured from git rather than frontmatter, so the unit is elapsed time rather than calendar days: for every document carrying an `approved:` stamp, the interval between the commit that created the file and the commit that added the stamp.

The intent home shipped 2026-08-26 ([[WO-117]], commit 82a9520); [[WO-126]] extended it 2026-08-27 (1d99218). Measurement taken 2026-08-27.

## What was measured

| | n | median | under 48h |
|---|---|---|---|
| All filed-then-approved | 137 | 0.3h | 117/137 |
| Approved before 2026-08-26 | 71 | 0.6h | 52/71 |
| Approved after 2026-08-26 | 66 | 0.3h | 65/66 |

A further 57 of the 194 stamped documents were **born approved** — the stamp landed in the very commit that created the file, so no review interval existed at all. They are excluded from the table above rather than counted as zero.

Currently pending: 4 documents (3 backlog work orders, 1 proposed decision), the oldest waiting 1.5 hours. There is no aged review queue.

## What it means

**The bet is neither supported nor refuted, because the metric cannot discriminate.** [[REQ-035]] predicted that surfacing gate crossings on the home would shorten median-time-to-judgment, targeting under 48 hours. The median before the intervention was 0.6 hours — already roughly eighty times better than target. A metric that has been at ceiling since before the intervention cannot report on the intervention.

**The apparent improvement is a measurement artifact.** 0.6h → 0.3h looks like a gain, but the "after" window is one to two days wide, so any document approved within it was necessarily filed within it. The window mechanically caps the delay it can observe. Documents filed earlier and still unapproved never enter the sample at all. No causal claim about the home view survives this.

**What the median actually measures is not deliberation.** A median of eighteen minutes between filing and stamping does not describe a human weighing a proposal; it describes a batch approval pass run in the same session that produced the documents. That is a real and reasonable working pattern, but it means time-to-judgment is measuring session structure, not judgment latency. The 57 born-approved documents make the same point more sharply — nearly a third of stamps had no interval to measure.

**The home view may still be valuable.** Nothing here says it is not. It says this metric was the wrong instrument, chosen because it was cheap to derive from the corpus rather than because it tracked the thing believed to matter. Judging whether the view helps needs a different signal — one that can move.

## Consequences

1. [[REQ-035]] should not be marked confirmed on this evidence. Whether to revise the hypothesis, replace its metric, or retire it is the user's act ([[REQ-033]], [[DEC-113]]); this source only reports what reality said.
2. The pattern generalises to [[REQ-040]], whose own metric is already saturated on one dimension — 127 of 127 decisions carry rejected alternatives before any skill exists. A bet whose metric is at ceiling at filing time cannot be settled by shipping. Worth a check-time advisory: a hypothesis whose metric is already at target when the bet is filed.
3. This is the first outcome source in the project. 123 work orders have been completed and the learning loop had never once been closed; the corpus held 59 sources and zero with an `outcome-of` link. That absence, not the home view, is the more significant finding about whether Veri's loop actually runs.
