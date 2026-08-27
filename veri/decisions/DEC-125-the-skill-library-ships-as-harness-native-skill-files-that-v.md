---
id: DEC-125
type: decision
title: "The skill library ships as harness-native skill files that Veri scaffolds, with the coaching method held in Veri documents"
status: proposed
created: 2026-08-27
updated: 2026-08-27
links:
  - id: SRC-060
    rel: derived-from
  - id: REQ-040
    rel: serves
  - id: DEC-018
    rel: follows-from
  - id: DEC-111
    rel: follows-from
---

## Choice

The skill library ([[SRC-060]], [[REQ-040]]) ships in two separable halves.

**The method** — what each skill asks, which gate it staffs, what it may and may not file, how it hands off — lives in Veri documents in the project's own `veri/`, alongside the workflow. It is harness-agnostic and travels through the context package like every other document ([[DEC-018]]).

**The invocation shell** — the small harness-native file that makes a skill discoverable and triggerable (a Claude Code `SKILL.md` under `.claude/skills/`, and the equivalent for other harnesses as they appear) — is *generated* by Veri scaffolding as a thin pointer into the method document, the same relationship `AGENTS.md` and `CLAUDE.md` already have to `veri/workflow.md`.

Concretely: `veri init` (and a `veri skills install` for existing projects) writes the shells; the method documents are Veri documents the user can read, amend, and approve. A skill shell contains a trigger description and a pointer, not the coaching content.

## Rejected alternatives

- **A standalone Claude Code plugin, content and all.** The fastest path to something installable, and it gets marketplace distribution for free. Rejected as the primary form because it puts the coaching method outside `veri/`, where the user cannot amend it per project, it never reaches the context package, and it binds the whole library to one vendor's mechanism — the exact coupling [[DEC-018]] rejected for the workflow. A plugin remains a plausible *distribution wrapper* for the scaffolder later; it is the ownership of the content that is being decided against.
- **Skills as pure context-package sections, no harness files at all.** Maximally harness-agnostic and requires no new emitters. Rejected because it gives up triggering entirely: a skill's value is that "I have an idea" reaches the right coaching without the user knowing a skill exists. Content with no invocation surface is documentation, and the project already has documentation.
- **A separate `@verikb/skills` npm package the user installs and points at.** Clean dependency boundary and independent release cadence. Rejected as more machinery than the content warrants — the method is markdown, and Veri already scaffolds markdown into projects; a second package adds an install step and a version-skew surface between the skills and the MCP tools they depend on ([[REQ-041]]).
- **Skills served over MCP as prompts.** Would make the library work anywhere MCP reaches, with no files at all. Rejected for now because MCP prompt support is unevenly implemented across harnesses and offers no trigger-on-intent behavior; worth revisiting if that changes.

## Rationale

This is the same shape [[DEC-018]] already chose for the workflow, applied one level down, and it resolves the tension the skill library otherwise creates. Skills as a concept are harness-specific — `.claude/skills/` is Claude Code's, and other harnesses have their own or none — but the *thinking* a skill coaches is exactly the durable, reviewable, project-specific material Veri exists to hold. Putting the method in `veri/` means: a user can amend how their project runs discovery without editing a vendor file; the method arrives in every context package, so even a harness with no skill mechanism gets the coaching; and the method is versioned, linked, and approvable like everything else, which is the property [[DEC-111]] says Veri is for.

Keeping the shell generated rather than hand-authored keeps [[DEC-018]]'s "harness files are thin pointers" rule intact and means supporting a new harness is a new emitter, not a fork of fourteen skills' content.

The split also makes the default/advanced tiering from [[SRC-060]] a scaffolding choice rather than a packaging one: the same method documents exist, and installation decides which shells get written.

Open and deliberately not settled here: whether the method documents are a new `type:` or reuse an existing one, and whether the shells are emitted per-project or installed once per user. Both are smaller choices that should follow this one, not block it.
