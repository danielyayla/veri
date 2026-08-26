---
id: DEC-110
type: decision
title: "Discarding a document is a withdraw, with hard delete reserved for the unapproved and unreferenced"
status: proposed
created: 2026-08-26
updated: 2026-08-26
links:
  - id: REQ-008
    rel: narrows
  - id: REQ-006
    rel: changes-schema-of
  - id: DEC-037
    rel: builds-on
  - id: DEC-002
    rel: constrained-by
  - id: WO-104
    rel: depends-on
---

## Choice

Veri gains two distinct ways to discard a document, and they are not the same verb.

**Withdraw** is the primary act and works on any document type: a new terminal status `withdrawn` (requirement: draft → accepted → retired | withdrawn; decision: proposed → active → superseded | withdrawn; work-order: backlog → ready → in-progress → done | withdrawn; source: imported | withdrawn). The file stays on disk, the id stays issued, inbound `[[ID]]` links keep resolving. A withdrawn document drops out of context packages, `veri next`, the work-order queue, and the approval queue, and renders in the app with the same muted treatment as retired/superseded. It carries no `approved:` stamp requirement — withdrawing is not a promotion, so an agent or the user may do it, unlike accept/activate ([[REQ-008]]).

**Hard delete** (`veri delete <id>`) removes the file, and refuses unless the document is (a) never approved — no `approved:` frontmatter stamp, ever — and (b) unreferenced: no other document links to it in frontmatter `links:` or mentions it as an inline `[[ID]]`. It is the escape hatch for a mistyped `veri new` or a scratch document, not a way to erase project history. The issued id is never recovered: `veri/ids` remains a high-water floor ([[DEC-037]]), so a deleted DEC-112 leaves a permanent hole.

This narrows REQ-008's non-goal ("a reject/delete button — discarding a proposal is a git act") rather than reversing it: rejecting an approval proposal remains a git act on the file's content, but bringing a document to a terminal, non-binding state is now a first-class product act on both surfaces.

## Rejected alternatives

- **Hard delete only, on every document** — the literal ask and the simplest mental model, but it strands inbound `[[ID]]` links: deleting an abandoned decision that three work orders reference turns one cleanup into three `veri check` violations, and the user's only fix is to hand-edit the referrers. It also destroys the record that a path was considered and dropped, which is the kind of knowledge Veri exists to keep.
- **Withdraw only, never remove a file** — keeps files-as-truth perfectly intact and closes the one-way door, but leaves no answer for the genuine mistake (`veri new decision "Untitled"`, typo, wrong type). Those documents accumulate as permanent clutter in the sidebar and in `veri list`, and telling the user "your typo is now a permanent withdrawn document" is a worse answer than the current `rm`.
- **Status quo — discarding is a git act** ([[REQ-008]]'s non-goal as written) — coherent for a terminal-first tool and it costs nothing to keep, but it predates the app being able to create documents at all. The non-goal's reasoning was about *rejecting a proposal under review*, not about undoing a creation, and it is now being applied to a case it never considered.
- **Trash folder (`veri/.trash/`) with restore** — friendlier than removal and reversible, but it introduces a second place documents can live, which `veri check`, context assembly, search, and the id allocator would all have to learn to ignore. Git already is the undo for a tracked file; a second undo layer duplicates it and contradicts files-as-truth ([[DEC-002]]).
- **`deleted: true` frontmatter flag instead of a status value** — avoids touching the status enum and therefore the format bump, but it creates two parallel notions of "this document is over" (terminal status vs. flag) that every consumer must check independently, and it is precisely the kind of drift DEC-037 called out when it collapsed two id allocators into one.
- **Delete in the app only, leaving the CLI without it** — the reported gap is in the app, so this is the minimum fix. Rejected because the CLI is the surface agents and scripts drive, and a verb that exists in one surface and not the other is the asymmetry that produced this bug report in the first place.

## Rationale

The app can create documents from a cold start (⌘N → the sidecar's `create-doc` channel), but neither the app nor the CLI can undo that. For a user who never opens a terminal — exactly the user the desktop app exists for — document creation is a one-way door, and the documented escape hatch (`rm` plus a git commit) is invisible from inside the product. Creation and discard should live on the same surface.

Splitting the verb is what keeps that from reopening problems Veri already closed. A raw delete on any document would strand inbound `[[ID]]` links and turn `veri check` into a source of new violations every time someone cleans up; withdraw preserves the graph, which is the whole point of a linked knowledge base — the record of a decision that was proposed and abandoned is itself project knowledge. Conversely, forcing a mistyped `veri new` to live forever as a withdrawn husk is bureaucratic noise for a document that never meant anything; the two-condition guard (never approved, unreferenced) makes hard delete safe by construction, because a document meeting both has no history to lose and no dependents to break.

DEC-037 already made removal safe on the axis that used to bite: `veri/ids` is a high-water floor, so a deleted file can never cause id reuse. That closed the objection that kept deletion out of the tooling; what remained was link integrity, which withdraw handles.

Adding a status value is exactly the schema change [[WO-104]] is about — an older bundled core rejects unknown `status:` frontmatter, drops the document from its set, and then misreports every inline reference to it as a broken link. So `withdrawn` ships behind an on-disk format bump, in the same change, per WO-104's release rule.
