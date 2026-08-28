---
id: DEC-138
type: decision
title: "Shell facts are an optional host input, and an orphan is anchored to the shell when its method is gone"
status: active
approved: 2026-08-28
created: 2026-08-27
updated: 2026-08-28
links:
  - id: DEC-130
    rel: follows-from
  - id: DEC-040
    rel: constrained-by
  - id: DEC-129
    rel: consistent-with
  - id: DEC-137
    rel: consistent-with
  - id: WO-136
    rel: constrains
---

## Choice

Four mechanics of the shell drift comparator, settled while implementing
[[WO-136]].

**Shell facts join `HostFacts` as an optional third state.** `git` is
two-valued — collected, or unavailable with a reason. Shells are
three-valued, and the third state is the one that matters: `ok` (this host
writes shells and looked), `unavailable` (this host could look but is not
the one that writes them, so it reports a skip rather than a pass), and
*absent* (this host emits no shells at all and therefore makes no claim
about a harness directory). The terminal is `ok`, the MCP server is
`unavailable`, and a surface that neither writes nor reads shells simply
omits the field.

**Silence for an uninstalled project is structural, not a special case.**
Both rules are keyed on a shell that exists on disk, so a project with no
harness directory produces no findings without anything testing for one.
There is deliberately no `installed:` flag and no "accepted method with no
shell" rule: `veri skills install` is an offer, and a project that declined
it is not in a defective state.

**The comparator lives beside the emitter, in `packages/core/src/skills.ts`,
not with the other drift detectors.** It re-renders through the same
`SkillEmitter` that wrote the files. There is one definition of what a
method emits now, and drift is the byte comparison against it.

**An advisory anchors to the method document when one exists, and to the
shell when none does.** A stale or out-of-play shell is reported on
`veri/methods/<file>` with the method's id, so document-keyed surfaces group
it where the repair is authored; an orphan whose method is gone has no
document to name, so it is reported on the shell's own repo-root-relative
path with the skill name as its id — the shape `drift-unclaimed-change`
already uses for a finding no document owns. Both name
`veri skills install` as the repair.

Out of play is read as "not `accepted`", not as the enumerated
`retired`/`withdrawn`. `draft` is the same defect wearing a different label:
the shell still triggers, and the coaching behind it has not been ratified.
The advisory names the actual status.

## Rejected alternatives

- **Make shell facts required on `HostFacts`.** Symmetrical with `git`, and
  it would force every surface to state its posture explicitly. Rejected
  because it compels a surface that emits no shells to invent an answer:
  either a false `ok` over a directory it does not own, or an `unavailable`
  skip note about a tier it was never in. An absent field is the honest
  encoding of "no claim", and it keeps the change additive for existing
  callers.
- **Carry an explicit `installed: boolean` so the silence rule is visible
  in the data.** Attractive because the requirement — never nag a project
  that has no shells — would then be stated rather than implied. Rejected as
  a fact with no consumer: no rule reads it, and a field the comparator
  ignores is one a future rule could quietly start trusting after the
  collector stopped maintaining it.
- **Add "an accepted method with no installed shell" as a third rule.**
  The apparent completion of the set. Rejected because it turns a
  never-installed project into a permanently advisory one, which is exactly
  the nagging [[WO-136]] rules out, and because it presumes every project
  wants every gate on disk — the opposite of [[DEC-137]]'s tiering posture.
- **Put the comparator in `drift.ts` with the other drift detectors.**
  Better topical grouping, and the advisory kinds join that family. Rejected
  because the comparison is a re-render: `drift.ts` would import the emitter
  and its slug rules, and the rule that matters — one rendering, never two —
  would be an import away from being violated by somebody re-deriving a
  shell path locally.
- **Compare against a hash recorded at install time**, in the shell's
  frontmatter or a manifest. Cheaper than re-rendering, and it distinguishes
  an edited shell from an amended method. Rejected because it makes drift
  detectable only from one side: a method amended after install would match
  its own recorded hash and pass. Re-rendering is what makes detection
  symmetric, which is the property [[WO-136]] asks for by name.
- **Report an orphan on the method's file even when the method is gone**,
  by parking it on the methods directory. Keeps every advisory
  document-keyed. Rejected because it names a file that does not exist,
  which is worse than naming the shell that does.
- **Treat only `retired` and `withdrawn` as out of play**, letting a `draft`
  method with an installed shell pass. A literal reading of [[DEC-130]]'s
  wording. Rejected because [[DEC-130]]'s actual rule is that only an
  `accepted` method may have a shell, so a `draft` with one is the same
  contradiction; reporting it costs nothing and the message names the status
  the reader will see.

## Rationale

The through-line is that this tier reports on files Veri writes but does not
own, so every choice is about not over-claiming.

The three-valued input is the smallest honest vocabulary for that: "I
looked", "I could look but this is not my directory", and "I have nothing to
say". Collapsing the last two loses the difference between a skip note that
tells an agent where to get the answer and silence that reads as a pass —
the failure [[DEC-129]] cares about, one level down.

Re-rendering rather than recording a hash is the same instinct as
[[DEC-137]]'s determinism argument, cashed in. That decision made the emitted
set a pure function of the accepted methods precisely so a third party could
recompute it; a stored hash would have thrown that away and bought a
one-sided check with it.

Anchoring is a presentation choice with a correctness edge: an advisory that
names a nonexistent file cannot be opened, and a surface that groups findings
by document would create a phantom entry for it. Naming the shell is both
truthful and actionable, and the precedent for a document-less advisory was
already set by unclaimed-change.
