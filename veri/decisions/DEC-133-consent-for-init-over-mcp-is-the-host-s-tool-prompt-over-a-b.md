---
id: DEC-133
type: decision
title: "Consent for init over MCP is the host's tool prompt over a bounded, reversible write — no confirmation parameter"
status: proposed
created: 2026-08-27
updated: 2026-08-27
links:
  - id: WO-129
    rel: decided-during
  - id: REQ-041
    rel: constrains
  - id: DEC-125
    rel: constrained-by
  - id: REQ-008
    rel: consistent-with
  - id: DEC-127
    rel: follows-from
  - id: DEC-111
    rel: consistent-with
---

## Choice

`init_project` ([[REQ-041]] item 5, [[WO-129]]) writes files into a user's
repository, and [[REQ-041]]'s criterion says it must never run without the
user being asked first. This decision records what "asked" means, because
the tool cannot verify it.

**The boundary is deliberateness, not access control** — [[DEC-127]]'s
framing, and it transfers intact. Any agent with filesystem access can
create a `veri/` directory by hand; a gate this tool enforces defends
nothing that `mkdir` does not walk around. What is worth protecting is what
[[DEC-125]] states directly: nothing is written at install time, and having
Veri installed is a statement of interest, not consent to restructure a
repository.

1. **The agent asks in conversation; the host's tool-approval prompt is the
   ceremony.** The same door [[DEC-127]] chose for relay approval, and for
   the same reason: the surrounding platform already provides a stable
   affordance for showing a pending call, and a parallel one buys nothing
   but surface. The call is self-describing — one optional `path`, and a
   description naming exactly what gets created and where — so whatever
   shows the pending call shows the write.

2. **No `confirmed` parameter, and no consent argument of any kind.** An
   agent satisfies its own boolean. Such a parameter is worse than absent:
   it writes "the user agreed" into the wire arguments and the server's
   answer, converting a question the system cannot answer into an answer
   that may be false. [[DEC-127]] refused an agent-supplied approver name
   for exactly this reason — taking the agent's word launders an act rather
   than relaying it.

3. **The write is bounded and reversible, and that is the real backstop.**
   The tool writes only inside the project root the host started the server
   on — a path climbing out of it is refused, and so is one naming a
   directory that does not exist, rather than scaffolding a typo into
   being. It refuses when a `veri/` is already there instead of overwriting
   or migrating. It modifies no existing file: root pointer files that are
   already present are skipped and reported as skipped, the guarantee
   [[DEC-007]] established for the demo's README. And the result names
   every path it created. An init the user did not want therefore destroys
   nothing and is undone by deleting exactly what the tool reported.
   Consent that cannot be enforced is backed by a write that cannot do
   damage.

4. **The refusal is core's, restated, never a second guarantee.**
   `ProjectExistsError` from the one scaffold implementation surfaces as a
   refusal naming the directory. The MCP door adds no policy about existing
   knowledge bases; it carries core's through.

## Two limits recorded rather than papered over

1. **A host in auto-approve mode calls without a prompt.** Accepted on the
   same terms [[DEC-127]] accepted it: under the framing above this is
   ceremony, and a user who has turned ceremony off has made a choice. It
   is written down so it is known rather than discovered.
2. **Whether the agent asked before calling is skill discipline, not
   mechanics.** The tool description states the rule and cannot enforce it.
   What is mechanical is the visibility of the call and the harmlessness of
   the write — points 1 and 3. Writing an unenforceable rule into a
   decision is fine; pretending it is enforced is not.

## Rejected alternatives

- **A `confirmed: true` (or `user_said_yes`) parameter the tool requires.**
  The obvious shape, and it reads like a gate. Rejected because the agent
  supplies it, so it gates nothing while producing a durable false record
  that consent was collected. It also teaches the wrong reflex: a parameter
  that always has one acceptable value is filled in without being read.
- **MCP elicitation as the primary mechanism.** Mechanically the strongest
  — the host asks the human directly and the agent cannot answer for them —
  and this is the obvious upgrade. Rejected today for the reason
  [[DEC-127]] gave: support across hosts is uneven, so a design resting on
  it would work in some harnesses and silently not gate in others. Revisit
  when hosts converge.
- **A two-call handshake: a preview call returning a token the write call
  must echo.** Invents state outside the files, which [[DEC-002]] forbids,
  to defend a boundary the filesystem leaves open anyway — and the agent
  can make both calls in one turn with no human between them. Ceremony
  proportional to a threat that does not exist.
- **No write over MCP at all — the skill hands the user `veri init` to
  type.** The strongest alternative: a context switch to a terminal is real
  ceremony, and the user's own keystroke is unambiguous consent. Rejected
  because it closes the front door [[REQ-041]] item 5 exists to open. The
  skill library is Veri's front door ([[DEC-125]]); a first invocation on a
  bare repo that dead-ends in a terminal is the "only works on projects
  that already ran `veri init`" failure this work was filed to remove.
- **Scaffolding on connect, at install time, or lazily on the first tool
  call that needs a knowledge base.** Removes the question entirely by
  never asking it, and directly contradicts [[DEC-125]]: nothing is written
  at install time, and the first invocation *asks* before it initializes.
- **Requiring an explicit `path` with no default, as evidence of intent.**
  An agent supplies a path as easily as a boolean, so it proves nothing,
  and it makes the ordinary case — the project root the host already named
  — the awkward one.
- **Scaffolding into a scratch directory for the user to move into place.**
  Leaves the repository untouched until a human acts, which is honest. But
  a knowledge base outside its project is not a knowledge base: nothing
  loads it, `veri check` has no repo to check, and the move is a manual
  step that will be done wrong more often than the init would have been
  regretted.

## Rationale

Origin: [[WO-129]], which deliberately left this open and asked for it as a
proposal ([[WF-001]] rule 4).

The temptation is to treat "the user must be asked" as something the server
enforces, and every enforcement shape collapses on the same observation
[[DEC-127]] already made about approval: the agent is on the other side of
the wire and can assert anything, including that a human said yes. Once
that is accepted, the useful questions change from "how do we verify
consent" to "how do we make the moment visible, and how little can the
write cost if consent was never given". Visibility comes free from the
host's own prompt; cost is bounded by refusing to overwrite anything and
reporting every path created.

The result is a door with no lock, which is what [[DEC-125]] asked for when
it said the first skill invocation asks before it initializes. A lock would
have been theatre; a door that cannot break anything on the way through is
the honest version, and [[REQ-008]]'s real property — that the documents
which eventually bind are promoted by a human — is untouched by this,
because an empty scaffold binds nothing. It contains one workflow document
and four empty collections.
