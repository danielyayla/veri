---
id: DEC-140
type: decision
title: "Supersession requires an active successor, which is what makes it an agent-runnable act"
status: active
approved: 2026-08-28
created: 2026-08-28
updated: 2026-08-28
links:
  - id: WO-138
    rel: derived-from
  - id: REQ-008
    rel: constrained-by
  - id: DEC-110
    rel: builds-on
---

## Choice

`veri supersede <DEC-id> --by <DEC-id>` and the `supersede_decision` MCP tool flip an active decision to `superseded`, writing `status:` and `superseded_by:` in one edit. Two rulings, and the second follows from the first:

1. **The successor must be an `active` decision.** A `proposed` successor is refused, naming the stamp that unblocks it (`veri approve DEC-N`). So is a successor that is superseded, withdrawn, or not a decision at all, and so is superseding anything that is not itself an active decision.
2. **Supersession is therefore not the user's exclusive act.** Both surfaces carry it, agents included, and it needs no `approved:` stamp of its own — the same standing [[DEC-110]] gave withdrawal.

The second ruling is safe only because of the first. Authority does not move at the flip; it moves when the user approves the successor. By the time this verb may run, the human act is already on disk, and the flip only records what that stamp implies.

## Rejected alternatives

- **Accept a `proposed` successor.** Matches the natural drafting order — a skill files the replacement, the flip happens in the same session — and it is the shape the `decide` method's manual workaround has been describing. Rejected because it lets a session leave the fork governed by nothing: the old decision retired, the new one not yet binding, and `veri check` blind to the hole (it validates only that `superseded_by` names a document that exists). Retiring a live decision on the word of an unapproved one is exactly the downstream power [[REQ-008]] denies. The cost is real — a session must return after the stamp — but it is the same cost every other approval gate imposes, and the sequence it forces (approve the replacement, then retire the old) is the correct one.
- **Make supersession the user's exclusive act — a CLI verb with no MCP tool.** Defensible on the reading that supersession *transfers* authority and so resembles `approve` more than `withdraw`. Rejected as a consequence of ruling 1: with an active successor required, nothing is transferred at the flip, and reserving a bookkeeping edit to the human leaves the reversal half-recorded in exactly the sessions best placed to finish it. If ruling 1 is ever relaxed, this must be revisited in the same change — they are one decision, not two.
- **Warn instead of refuse on a proposed successor.** Rejected: an advisory that arrives after the file is written does not restore the authority that was just revoked, and the surfaces' posture elsewhere is that preconditions refuse (`veri start` on an unapproved work order, `veri delete` on a referenced document) while *findings* advise.
- **Let supersession also flip the successor to active.** Rejected outright — that is promotion, which is the user's act alone ([[REQ-008]]) and the one line no write path crosses.

## Rationale

The reversal was the record's most important move and the only one no surface performed: `amend_document` covers born-pending statuses only, and there was no `veri supersede`. Sessions were told to hand-edit two frontmatter lines, which the schema then holds to a pair invariant — a half-applied edit is invalid frontmatter, so the most delicate act in the graph was also the most manual.

Requiring an active successor is what lets the verb be ordinary. It converts a question about authority ("may an agent retire a live decision?") into a question about sequence ("has the user approved what replaces it?"), and the second question has a mechanical answer that the code can check. Origin: implementing [[WO-138]].
