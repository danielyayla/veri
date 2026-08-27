---
id: DEC-137
type: decision
title: "A shell's identity is its upstream slug, and only a marked shell is ever removed"
status: proposed
created: 2026-08-27
updated: 2026-08-27
links:
  - id: DEC-125
    rel: follows-from
  - id: DEC-130
    rel: constrained-by
  - id: REQ-040
    rel: serves
  - id: DEC-018
    rel: consistent-with
  - id: WO-135
    rel: constrains
  - id: WO-136
    rel: constrains
---

## Choice

Four mechanics of the shell emitter, settled while implementing [[WO-135]].

**A shell is named for the method's slug, not its id or its title.**
`upstream:`'s last segment first — `veri/plan-work` becomes the skill
`veri-plan-work` — then the `veri:<name>` token a method's title leads with,
then the slugified title. The same slug is what tiering is read against. This
is [[DEC-130]]'s own argument for keying upgrade on `upstream:`, applied to
the name: ids are minted per project, and titles and filenames are things
the user is invited to edit.

**Tiering is [[REQ-040]]'s nine, plus every method the project wrote
itself.** A method with no `upstream:` is the project's own; somebody
authored it into `veri/methods/` and approved it, which is a clearer
statement of intent than any list Veri ships. The tier exists to keep Veri's
five advanced gates out of a default install, not to second-guess a project
about its own gates.

**Tier gates creation only — never refresh, never removal.** A shell that
already exists is kept current whatever its tier, so a project that ran
`--all` does not silently lose its advanced shells the next time somebody
runs a plain `install`. Removal has exactly one trigger: the method behind a
shell is no longer an `accepted` method of this project.

**Only a shell carrying the generated marker is ever deleted.** Every
emitted shell holds one HTML-comment line saying it was generated and should
not be edited. `install` removes a stale file only if that marker is present,
so a hand-authored skill sitting in the same harness directory is never
touched. The marker also gives [[WO-136]]'s drift comparator a cheap way to
tell Veri's shells from everything else in that directory.

Serialization is deterministic: the `description:` is emitted as a
double-quoted YAML scalar via JSON string escaping, on one line, so the same
method emits the same bytes every time.

## Rejected alternatives

- **Name the shell after the method's `MET-` id.** Stable within a project
  and trivially resolvable. Rejected because the name is user-facing — it is
  what somebody types and what a harness lists — and `veri-met-003` tells a
  reader nothing about which gate it opens.
- **Name it after the title.** Reads well, and needs no new rule. Rejected
  because the title is explicitly the user's to edit, so renaming a method
  would silently orphan its installed shell and leave a duplicate behind.
- **Treat a project-authored method as advanced (no shell without
  `--all`).** Defensible as "Veri only vouches for what it ships". Rejected
  as backwards: the project authored and approved that method, and making
  the user pass a flag to reach their own gate is the opposite of the
  ownership [[DEC-125]] exists to grant.
- **Let a default `install` remove shells outside the default tier.** Makes
  `install` idempotent in the strong sense — the disk always equals the
  default set. Rejected because it turns a routine reinstall into silent
  data loss for anyone who deliberately opted into an advanced gate.
- **Remove any file in the harness directory that no method claims.**
  Simpler, and keeps the directory tidy. Rejected outright: Veri does not
  own `.claude/skills/`, and deleting somebody's hand-written skill because
  it does not correspond to a Veri document is a defect, not tidiness.
- **A frontmatter field (`veri: true`) instead of a comment marker.**
  Cleaner to parse. Rejected because the harness owns that frontmatter's
  schema and an unknown key is a risk we would be taking on the user's
  behalf; a comment in the body is inert everywhere.
- **Emit the description as a YAML block scalar (`>-`), as the method
  documents themselves do.** Prettier to read. Rejected because folding and
  chomping make round-tripping a paragraph byte-for-byte a matter of getting
  indentation indicators right, and both idempotence and [[WO-136]]'s drift
  rule are decided by byte comparison.

## Rationale

Everything above is one property in four places: the emitted set has to be a
pure function of the accepted methods, so that running `install` twice is a
reported no-op and a third party ([[WO-136]]) can recompute what should be on
disk and compare. Determinism is what buys that, and every choice that looked
like a matter of taste — the name, the serialization — turned out to be a
choice about whether the comparison is decidable.

The removal rule is the one place the emitter reaches outside its own output,
and it is deliberately the most conservative rule here. `.claude/skills/` is
a directory Veri writes into but does not own. A generator that deletes files
it did not write is a generator nobody can safely run twice.
