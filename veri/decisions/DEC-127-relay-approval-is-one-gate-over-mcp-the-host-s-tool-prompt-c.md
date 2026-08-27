---
id: DEC-127
type: decision
title: "Relay approval is one gate over MCP: the host's tool prompt carries the ceremony, identity is collected rather than claimed"
status: proposed
created: 2026-08-27
updated: 2026-08-27
links:
  - id: REQ-041
    rel: satisfies
  - id: REQ-008
    rel: constrained-by
  - id: DEC-071
    rel: builds-on
  - id: DEC-002
    rel: consistent-with
  - id: DEC-103
    rel: consistent-with
  - id: DEC-111
    rel: consistent-with
  - id: DEC-125
    rel: consistent-with
  - id: SRC-061
    rel: derived-from
  - id: SRC-060
    rel: informed-by
---

## Choice

**The framing first, because it changes what the mechanism must do.** The promotion boundary is not an access-control boundary and never was. Any agent with filesystem access can write `approved: YYYY-MM-DD` into a document, and `veri check` accepts it — as this decision's own session demonstrated while editing `veri/` directly. What [[REQ-008]] actually protects is *deliberateness*: that a human read the thing and said yes on purpose, with git history as the audit trail per [[DEC-002]]. Relay approval is therefore designed to make the user's act explicit and legible, not to be unforgeable. [[REQ-041]] item 4's "keeping the stamp human" is retained in that sense and no other.

**One gate, one door.** A single MCP tool takes a `verdict` of `approve` or `request-changes`, for exactly one document per call. `approve` delegates to `approveDocument` in core — the same implementation the CLI and the app already share, so no second promotion path exists. `request-changes` appends a dated entry under `## Review notes` via core's existing `appendToSection`, carrying the user's words verbatim so the note reaches agents through normal context packages ([[REQ-008]] criterion 5). Two separate tools were rejected: one door means every verdict passes through the same call shape and the same host prompt.

**The ceremony is the host's tool-approval prompt.** The call is self-describing — it carries the exact frontmatter edit in its arguments, so whatever surface shows the pending tool call shows precisely what will be written. This is the same promise the desktop app already makes ([[REQ-008]]'s UI section: approve shows the exact frontmatter edit before writing it), reusing ceremony the host provides rather than inventing a parallel one.

**Batched review, never a batched verdict.** Reviewing many documents in one sitting is how the work actually happens and the skill must support it. What is forbidden is a single "yes" promoting more than one document — hence one document per call, with no array form.

**Identity is collected, not claimed.** The approver name is read from git `user.name` server-side, the same host-collects-the-identity pattern `veri approve` already uses. The tool never accepts an agent-supplied name: that is the one place where taking the agent's word would launder an act rather than relay it. In a project declaring maintainers ([[DEC-071]]'s hard tier), a collected name absent from the roster is refused, with the CLI named as the way through — team semantics are where DEC-071 deliberately made the stamp strict, and the relay must not be the soft spot. No `relayed_by` or similar provenance field is added: the stamp is the record and the commit is the audit trail ([[DEC-002]]).

## Two limits recorded rather than papered over

1. **A host in auto-approve mode bypasses the ceremony entirely.** This is accepted: under the framing above it is ceremony, and a user who has turned ceremony off has made a choice. It is written down so it is known rather than discovered.
2. **Presentation is skill discipline, not a guarantee.** That the skill explains what a document binds, what it rules out, and what breaks if it is wrong *before* offering the verdict is a rule this decision states and cannot enforce. Only the visibility of the frontmatter edit at the moment of approval is mechanical. Writing an unenforceable rule into a decision is fine; pretending it is enforced is not.

## Rejected alternatives

- **Do not build it — approval stays CLI and app only, and the skill hands over the exact `veri approve` commands.** The strongest alternative, and the context switch to a terminal is itself real ceremony. Rejected because an ergonomic gap does not preserve deliberateness; it makes the sloppy path the convenient one. The failure mode being avoided is a user who batch-stamps twelve documents unread precisely because reviewing them properly is tedious.
- **A challenge token the user types back, or any verdict registry.** Invents state outside the files, which [[DEC-002]] forbids, in order to defend a boundary the filesystem already leaves open. Ceremony proportional to a threat that does not exist.
- **An agent-supplied approver name parameter.** Consistent on its face with [[DEC-071]]'s solo tier, where a name is recorded without validation, but over a relay it launders the agent's assertion into the human's record. Collecting the identity host-side costs nothing and asserts nothing false.
- **MCP elicitation as the primary mechanism.** Mechanically the strongest — the host asks the human directly and the agent cannot answer for them — but support across hosts is uneven, so it cannot carry the design today. Worth revisiting as the obvious upgrade if hosts converge.
- **Separate `approve` and `add_review_note` tools.** Lets the two habits drift apart, so a skill reaches for note-appending as one reflex and stamping as another, with only one of them passing a gate.
- **Using `amend_document` to record review feedback.** It replaces the whole body and belongs to the agent's revise half of [[DEC-103]]; review notes are the user's words appended verbatim, and core already has `appendToSection` for exactly this.
- **A multi-id or array form for efficiency.** Directly defeats the one property worth protecting — that a single yes never promotes more than one document.
- **A `relayed_by` provenance field distinguishing relayed stamps from hand-typed ones.** Superficially honest, but the commit already carries that context, and a second approval field is the taxonomy bloat [[DEC-111]] filters against.
- **Comprehension checks before approval — a summary the user must confirm, or a question they must answer.** Named here only so it is not reinvented: [[REQ-008]] already dropped this as an explicit non-goal.

## Rationale

Origin: the second grilling ticket on [[SRC-061]]'s frontier, and the item [[REQ-041]] flagged as carrying the only real design question among its five.

The whole decision turns on noticing that the boundary being defended is not the one the requirement's language implies. "Keeping the stamp human" reads as access control, and designing for access control produces challenge tokens, verdict registries, and unforgeable gestures — all of which are defeated in one line by an agent that can write files, which every coding agent can. Once the boundary is named correctly as deliberateness, the design collapses to something small: make the act explicit, make the edit visible at the moment it happens, and refuse to let one yes cover two documents.

Reusing the host's tool-approval prompt rather than building a confirmation mechanism follows the same instinct as [[DEC-069]]'s refusal of the `@actions/core` toolkit — the surrounding platform already provides a stable, documented affordance, and adding a parallel one buys nothing but surface. It also keeps the relay honest about what it is: a door, not a guard.

Collecting identity host-side rather than accepting it as a parameter is the single most important detail. [[DEC-071]] made the stamp strict in team projects and `veri check` enforces the roster; a relay that accepted a name would let an agent write a maintainer's name into a document that maintainer never read, and the check would pass. Refusing in that case, and pointing at the CLI, keeps the strict tier strict.

Recording the two limits — auto-approve hosts, and presentation as unenforceable discipline — is deliberate. A decision that claimed a guarantee it cannot deliver would be worse than the ergonomic gap it replaces, because the next reader would build on a promise that was never true.
