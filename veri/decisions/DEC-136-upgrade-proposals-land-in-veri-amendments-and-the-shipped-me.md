---
id: DEC-136
type: decision
title: "Upgrade proposals land in veri/amendments/, and the shipped method library is committed beside the demo"
status: active
approved: 2026-08-28
created: 2026-08-27
updated: 2026-08-28
links:
  - id: DEC-125
    rel: follows-from
  - id: DEC-130
    rel: constrained-by
  - id: WO-135
    rel: constrains
  - id: DEC-023
    rel: consistent-with
  - id: DEC-094
    rel: consistent-with
  - id: DEC-007
    rel: consistent-with
---

## Choice

Two mechanics `veri skills upgrade` needed and [[DEC-125]] left open.

**Where a proposal goes.** `veri/amendments/`, a fourth directory inside
`veri/` that deliberately holds files which are *not* documents — joining
`templates/` ([[DEC-023]]) and `originals/` ([[DEC-094]]) in the loader's
skip list. One file per diverged method, named `<MET-id>-<slug>.md`, holding
the shipped `description:`, `requires:`, and body, under a header saying in
as many words that nothing was changed and that deleting the file is a
legitimate answer. It carries no frontmatter, no id, and no status: it binds
nothing, `veri check` never sees it, and it cannot be mistaken for canon.

**Where the shipped library lives.** `packages/cli/methods/` — real markdown
files packed with the CLI, beside the skiff demo and the starter bundles
([[DEC-007]], [[WO-091]]) and listed in the package's `files`. The nine
shipped method documents are byte-identical copies of the ones this
repository authors under `veri/methods/`, and a test in the CLI package
asserts that identity so the copy cannot silently drift from its original.

`upgrade` reads the library, matches on `upstream:`, and compares three
fields: `description`, `requires`, and the body. Ids, statuses, dates,
titles, and links are never compared and never proposed — an id is minted
per project, a status is the user's verdict, and titles and filenames are
things [[DEC-130]] explicitly invites the user to edit.

## Rejected alternatives

- **Amend the method file in place, appending a "Proposed amendment"
  section.** No new directory, and the proposal sits where the reader
  already is. Rejected because it writes into an approved document to
  propose a change to it — the exact act upgrade-by-proposal exists to
  avoid, and one that would make "did anything change?" unanswerable by
  looking at the file's status.
- **File the proposal as a new `draft` method document.** Maximally
  on-grain: propose-then-promote is what the type already supports.
  Rejected because approving it would leave two accepted methods with the
  same `upstream:` and no rule for which one the emitter believes, and
  because a `draft` document in `veri/methods/` is a real document with a
  real id spent on a diff.
- **Write proposals outside `veri/` entirely** (beside the shells, or in a
  scratch directory). Keeps `veri/` free of non-documents. Rejected because
  a proposal about a Veri document belongs with that document, where a user
  reviewing their knowledge base will actually meet it; the harness
  directory is generated output and the wrong home for something that wants
  reading.
- **A unified diff instead of the shipped text.** Smaller files, and precise
  about what changed. Rejected because a diff is only reviewable against a
  base the reader has to reconstruct, and the artifact here is meant to be
  read as prose — it is coaching text, not code.
- **Resolve the shipped library from the running Veri repository's own
  `veri/methods/`.** Zero duplication, always current. Rejected because it
  only works inside this repository: an installed `@verikb/cli` has no
  `veri/` of Veri's to read, so `upgrade` would be a command that works for
  its authors and nobody else.
- **Generate `packages/cli/methods/` at build time from `veri/methods/`.**
  Also zero duplication. Rejected because the tests run without a build
  step, so the library would be absent exactly when it is being tested, and
  because this repository already prefers committed artifacts it can diff
  (the action bundle is enforced by `git diff --exit-code`).
- **A separate `@verikb/skills` package.** Independent cadence for the
  content. Already rejected by [[DEC-125]] for the library as a whole; the
  same reasoning applies to its shipped copy.

## Rationale

Both halves are answering the same question: where does something live that
is *about* the knowledge base without being *in* it?

For proposals, `veri/` already has the answer twice over. Templates and
preserved originals are both files under `veri/` that the loader skips
because they are inputs and evidence rather than claims. A shipped-method
proposal is a third of the same kind — text a human reads and acts on, with
no id and no standing. Reusing that pattern costs one line in `loadProject`
and no new concept.

For the library, the demo and the starter bundles already establish that the
CLI ships markdown corpora as data files. The one new risk is the copy
drifting from the authored original, and that risk is worth taking only
because it is mechanically detectable: the sync test fails the moment the two
diverge, and the repair is a copy. The alternative that avoids duplication
entirely — reading Veri's own `veri/` at runtime — trades a detectable
problem for an undetectable one.

Comparing three fields rather than the whole document is what makes an
upgrade honest. The library ships coaching; it does not ship the project's
bookkeeping, and proposing a title change to a user who was invited to
choose that title would be noise that trains people to ignore the command.
