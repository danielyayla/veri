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
  - id: SRC-061
    rel: derived-from
  - id: REQ-041
    rel: constrains
  - id: DEC-069
    rel: consistent-with
  - id: DEC-075
    rel: consistent-with
  - id: DEC-126
    rel: replaces
---

## Choice

The skill library ([[SRC-060]], [[REQ-040]]) ships in two separable halves.

**The method** — what each skill asks, which gate it staffs, what it may and may not file, how it hands off — lives in Veri documents in the project's own `veri/`, alongside the workflow. It is harness-agnostic and travels through the context package like every other document ([[DEC-018]]).

**The invocation shell** — the small harness-native file that makes a skill discoverable and triggerable (a Claude Code `SKILL.md` under `.claude/skills/`, and the equivalent for other harnesses as they appear) — is *generated* by Veri scaffolding as a thin pointer into the method document, the same relationship `AGENTS.md` and `CLAUDE.md` already have to `veri/workflow.md`.

Concretely: `veri init` (and a `veri skills install` for existing projects) writes the shells; the method documents are Veri documents the user can read, amend, and approve. A skill shell contains a trigger description and a pointer, not the coaching content.

## How method documents are upgraded

Scaffolding the method into each project raises the question the split otherwise leaves open: a project pins the coaching text current at its init, and an improvement to the method never reaches projects already running. The answer is that method documents are **owned by the project once scaffolded, and upgraded by proposal**. `veri skills upgrade` re-derives the current method documents and writes the differences as `proposed` amendments the user reviews and approves, never overwriting silently. Drift from Veri's shipped method is therefore permitted and visible rather than silent and inevitable: a team that has tuned how its discovery interview runs keeps that tuning, and declines the upgrade for the documents it has made its own.

This is the same act Veri already asks of every other document — an agent proposes, the user promotes ([[REQ-008]], [[DEC-111]]) — applied to the method itself.

## Mechanics carried over from the distribution grilling

Settled alongside the shape above, and independent of it (these hold whether the method lives in `veri/` or elsewhere):

- **Skills reach Veri only through MCP tool calls** — never shelling out to the CLI, never reading `veri/` off disk. Reading files directly would bypass the id machinery and the `draft`/`proposed` guarantees [[REQ-008]] rests on.
- **Capability checks probe the tool list** MCP already sends at connect, rather than reading `serverInfo.version` or adding a capabilities tool. Presence is the question actually being asked, version is a worse proxy — a tool can be present and wrong, as a stale MCP build reporting violations a terminal `veri check` did not has already demonstrated — and a capabilities tool would be a second source of truth about what the server can do when the tool list already is that truth.
- **A skill missing a required tool refuses with a named repair instruction** and never degrades to coaching it cannot file. Interviewing a user and then having nowhere to put the result produces the worst artifact in the system: durable-feeling intent that exists only in a transcript, with no id, no status, and no place in the graph.
- **Nothing is written at install time.** Installing is a statement of interest, not consent to restructure a repository. The first skill invocation asks before it initializes, and scaffolds through an `init` MCP tool rather than duplicating `packages/core/src/scaffold.ts` — a fifth item for [[REQ-041]], which is still `draft` and so takes it as an amendment.
- **No new claimant on the `v*` tag namespace.** [[DEC-075]]'s guard job already disambiguates twice; skills ship with the CLI that scaffolds them and need no tag of their own.
- **`veri` is the user-facing name throughout** — the CLI, the repo, the skill prefix. `@verikb` stays an artifact of npm scope availability and does not propagate into anything a user types.

## Rejected alternatives

- **A standalone Claude Code plugin, content and all.** The fastest path to something installable, and it gets marketplace distribution for free. Rejected as the primary form because it puts the coaching method outside `veri/`, where the user cannot amend it per project, it never reaches the context package, and it binds the whole library to one vendor's mechanism — the exact coupling [[DEC-018]] rejected for the workflow. A plugin remains a plausible *distribution wrapper* for the scaffolder later; it is the ownership of the content that is being decided against.
- **Skills as pure context-package sections, no harness files at all.** Maximally harness-agnostic and requires no new emitters. Rejected because it gives up triggering entirely: a skill's value is that "I have an idea" reaches the right coaching without the user knowing a skill exists. Content with no invocation surface is documentation, and the project already has documentation.
- **A separate `@verikb/skills` npm package the user installs and points at.** Clean dependency boundary and independent release cadence. Rejected as more machinery than the content warrants — the method is markdown, and Veri already scaffolds markdown into projects; a second package adds an install step and a version-skew surface between the skills and the MCP tools they depend on ([[REQ-041]]).
- **Skills served over MCP as prompts.** Would make the library work anywhere MCP reaches, with no files at all. Rejected for now because MCP prompt support is unevenly implemented across harnesses and offers no trigger-on-intent behavior; worth revisiting if that changes.

- **Method documents scaffolded once and never upgraded** — the pure copy-and-forget shape [[WO-091]] uses for starter bundles. Correct for seed *documents*, which the owner rewrites into their own canon, but wrong for the method: it strands every project at the coaching text current at its init, which is the decay [[SRC-061]] named as this effort's largest long-term risk arriving through a different door.
- **Method held in the package with the project holding only overrides** — always-current text without an upgrade step, but it adds a resolution layer between shipped defaults and project edits, and makes the method something the user reads *through* Veri rather than something they own in `veri/` — losing the property this decision exists to secure.
- **Silent re-scaffolding on upgrade** — keeps every project current at no review cost, but overwrites deliberate local tuning and violates the propose-then-promote grain the rest of the system runs on.

## Rationale

This is the same shape [[DEC-018]] already chose for the workflow, applied one level down, and it resolves the tension the skill library otherwise creates. Skills as a concept are harness-specific — `.claude/skills/` is Claude Code's, and other harnesses have their own or none — but the *thinking* a skill coaches is exactly the durable, reviewable, project-specific material Veri exists to hold. Putting the method in `veri/` means: a user can amend how their project runs discovery without editing a vendor file; the method arrives in every context package, so even a harness with no skill mechanism gets the coaching; and the method is versioned, linked, and approvable like everything else, which is the property [[DEC-111]] says Veri is for.

Keeping the shell generated rather than hand-authored keeps [[DEC-018]]'s "harness files are thin pointers" rule intact and means supporting a new harness is a new emitter, not a fork of fourteen skills' content.

The split also makes the default/advanced tiering from [[SRC-060]] a scaffolding choice rather than a packaging one: the same method documents exist, and installation decides which shells get written.

Open and deliberately not settled here: whether the method documents are a new `type:` or reuse an existing one, and whether the shells are emitted per-project or installed once per user. Both are smaller choices that should follow this one, not block it.

## On the alternative this replaces

[[DEC-126]] was filed concurrently from the same route document ([[SRC-061]]) and reached the opposite answer on content ownership: a committed Claude Code plugin built from a host-neutral core, owning the coaching text and distributed from Veri's own marketplace. It is withdrawn in favour of this decision, and its reasoning is kept rather than deleted because the two disagree on a real question.

The case against it is the case [[DEC-018]] already made: content that lives in a vendor's plugin cannot be amended per project, never reaches the context package, and binds the library to one harness's mechanism. What it got right — that improvements must be able to reach projects already running — is answered above by upgrade-as-proposal rather than by moving the content out of `veri/`, and its mechanical conclusions are carried over intact.

The npm-publishing prerequisite DEC-126 created largely dissolves under this shape: the CLI is already the install vector and carries the MCP server with it, so publishing remains a prerequisite for Veri generally, as it already was, rather than a new blocker this library introduces.
