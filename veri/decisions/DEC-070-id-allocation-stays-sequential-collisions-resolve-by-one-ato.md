---
id: DEC-070
type: decision
title: "Id allocation stays sequential; collisions resolve by one atomic renumber"
status: active
approved: 2026-08-24
created: 2026-08-24
updated: 2026-08-24
links:
  - id: WO-077
    rel: constrains
  - id: REQ-026
    rel: satisfies
  - id: REQ-001
    rel: consistent-with
  - id: DEC-037
    rel: builds-on
  - id: DEC-002
    rel: consistent-with
---

## Choice

Per-type sequential allocation with the [[DEC-037]] `veri/ids` floor stays
exactly as it is — no collision-resistant allocation scheme. Two branches
allocating the same id is accepted as a merge-time possibility and made
loud and mechanically fixable instead of impossible:

- **Detection** is the existing `duplicate-id` check. Its message is
  upgraded from `duplicate id DEC-070` to name every claimant file and
  state the resolution path: pick the claimant that moves and run
  `veri renumber`.
- **A new core operation `renumberDocument`** (CLI:
  `veri renumber <ID> [--to <NEW-ID>] [--file <path>]`) moves one document
  to a new id — defaulting to the next free id for its type — in one
  computed-then-written pass: the frontmatter `id:` line, the id prefix of
  the file's own name, every inbound frontmatter link, every
  `superseded_by`, and every inline `[[ref]]` across the corpus. Every
  rewritten file is re-parsed before anything is written (the `approve.ts`
  guard pattern), and `veri/ids` is bumped so neither the vacated nor the
  new number is ever reissued.
- **Uniquely-held id** (plain renumber): all inbound references are
  rewritten to the new id. Nothing dangles, nothing is left behind.
- **Contested id** (duplicate claimants): `--file` selects which claimant
  moves. Inbound references to the contested id are **never rewritten by
  guessing** — they keep resolving to the remaining claimant, so the tree
  stays dangle-free — and the command prints every referencing file:line
  for review, with `--refs <file...>` to rewrite the references in
  explicitly named files to the new id.
- **`veri/ids` merge conflicts resolve to the max** of the two sides — the
  file is a self-healing floor per [[DEC-037]], so taking the higher line
  is always safe and the next write repairs any remainder. The team docs
  state this rule.

## Rejected alternatives

- **Content-hash or random ids** — collision-free by construction, but
  destroys the readable sequential ids every sort, palette, and piece of
  prose is built on, and changes the solo experience REQ-026 explicitly
  freezes.
- **Per-committer id ranges reserved in veri/ids** — configuration
  ceremony before the first document, ranges exhaust or fragment, and it
  still collides the moment someone forgets to reserve.
- **Branch- or initials-suffixed ids** (`DEC-dk-070`) — leaks transient
  branch context into permanent identifiers and breaks every id regex,
  sort, and link in the corpus.
- **Allocate-on-merge** (numbers assigned only on main) — makes documents
  unlinkable while on a branch, which is exactly when a work order and its
  links are being authored.
- **Automatic git-blame attribution of contested references** — tempting,
  but it guesses semantic intent from line history, drags git into pure
  core (DEC-040 keeps git facts in the host), and a merged tree cannot
  always attribute a reference line to a side.

## Rationale

The CI gate (WO-076) already makes a collision loud before it lands: a PR
that merges main fails `veri check` on `duplicate-id`, so resolution
happens on the branch — where the author knows precisely which references
meant their document. Given that, the right tool is an atomic, link-safe
renumber that is mechanical about everything mechanical (the id, the
filename, the floor, unambiguous references) and explicit about the one
thing that is genuinely semantic (contested references), rather than a new
allocation scheme that taxes every solo user to prevent a merge-time event
the gate already catches. Sequential ids survive because they are the
substrate; the fix costs one command at the moment of the rare collision.
