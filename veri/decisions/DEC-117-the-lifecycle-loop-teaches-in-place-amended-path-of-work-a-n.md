---
id: DEC-117
type: decision
title: "The lifecycle loop teaches in place: amended path-of-work, a ninth rule, and the thesis as the headline"
status: proposed
created: 2026-08-26
updated: 2026-08-26
links:
  - id: REQ-034
    rel: implements
  - id: WO-116
    rel: derived-from
  - id: DEC-111
    rel: constrained-by
---

## Choice

Implementing REQ-034 (WO-116), the intent-loop teaching lands inside the existing structures rather than as new ones. In WF-001, the original one-sentence path of work stays and the loop is appended to it — the section now says receipts are the middle of the path and states the full loop plus the humans-define-intent operating principle with its four gate points. The constraint/hypothesis and outcome-evidence guidance lands as rule 9 in the existing "Rules for implementers" list, so the numbered rules remain the single place an implementing agent is told what to do; the loop section carries the why, the rule carries the how. The source template teaches outcome filing as a parenthetical with a concrete `links:` YAML example, matching the requirement template's REQ-032 parenthetical. Publicly, the DEC-111 thesis becomes the headline (README lede, site title/meta/hero h1 and oneliner) while the context-package machinery keeps its existing copy as the supporting mechanism — bands, demos, and docs pages are untouched.

## Rejected alternatives

- **A separate "The learning loop" section in WF-001** — splits the path of work into two competing narratives; the loop *is* the path, so it belongs in that section.
- **Folding the hypothesis guidance into the loop prose instead of a numbered rule** — implementers are taught to follow the numbered rules; guidance living only in narrative prose is guidance an agent can miss. Precedent: the design gate is rule 7, not a paragraph.
- **Rewriting the site's bands to the intent framing** — the WO forbids redesigning pages; the hero and metadata are where positioning lives, and the mechanism copy below remains true and coherent under the new headline.
- **Retiring the "knowledge base your coding agents read" claim entirely** — it is the mechanism the thesis rides on; it moves from headline to supporting sentence rather than disappearing.

## Rationale

REQ-034's bar is that a newcomer reading only the workflow document and templates learns the whole loop — that argues for amending the documents readers already read, in the places they already look (the path section, the rules list, the template parentheticals), not for adding parallel surfaces that could drift. Making the thesis the public headline while keeping mechanism copy intact is the minimal edit that satisfies "state the thesis" without a page redesign. Origin: implementing WO-116.
