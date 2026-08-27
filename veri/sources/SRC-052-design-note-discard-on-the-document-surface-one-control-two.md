---
id: SRC-052
type: source
title: "Design note — discard on the document surface: one control, two verbs, withdraw first"
status: imported
approved: 2026-08-26
created: 2026-08-26
updated: 2026-08-26
links:
  - id: REQ-004
    rel: designs
  - id: DEC-012
    rel: constrained-by
  - id: DEC-110
    rel: builds-on
  - id: SRC-051
    rel: builds-on
---

> Drafted 2026-08-26 by an agent session (Claude Code) implementing
> [[WO-110]], under Daniel's blanket authorization to implement all
> backlogged work orders — the same authorization and provenance shape
> as [[SRC-051]]. Stamped `approved:` on that authorization; Daniel
> reviewed and confirmed the approval on 2026-08-27.

## The question

[[DEC-110]] gives Veri two discard verbs — withdraw (status flip, file
and links kept) and hard delete (file removed, guarded) — and [[WO-109]]
landed both in core and the CLI. The app can create a document from a
cold start (⌘N) but cannot discard one. Where does the affordance live
on the document surface, how are two verbs that differ in consequence
kept from being confused, what does the confirm step say, and how does a
withdrawn document render?

## The design: one quiet entry, one popover, two clearly unequal verbs

**Entry point.** A single muted `discard…` text button at the foot of
the frontmatter card — the properties header both the reader and the
work-order view share, so one placement covers every document type. It
is quiet by design: discard is rare, and the card is where the
document's identity (id, status, dates) already lives. The control is
absent on exactly two documents where the verb has no meaning:

- the workflow document (core refuses to withdraw the operating manual), and
- an already-withdrawn document (it is already terminal; delete of a
  withdrawn document stays a CLI/git act, since a withdrawn document was
  kept precisely because something referenced it or it was approved).

**The popover is the confirm step.** Pressing `discard…` opens a
focus-trapped dialog anchored to the card (the `rv-pop` grammar —
Escape closes, Tab cycles, focus returns to the invoker). It names the
document — id and title — and offers the verbs stacked, withdraw first:

- **Withdraw** (primary): caption "Keeps the file and its inbound
  links. `<ID>` becomes `withdrawn` — terminal, out of the queues and
  context packages." One press performs the withdraw; Cancel (or
  Escape) writes nothing.
- **Delete file** (secondary, destructive treatment): shown as a
  pressable control **only when core's guard would allow it**. The app
  asks the sidecar for the guard's verdict when the popover opens — the
  same `deleteRefusal` core's CLI uses, never a renderer
  re-implementation — and:
  - allowed: the control is live, captioned "Removes `veri/<file>`
    permanently. The id stays issued. Allowed because `<ID>` was never
    approved and nothing references it." One deliberate press inside
    the already-open confirm dialog performs it (git remains the undo
    for tracked files, [[DEC-002]]).
  - refused: the control renders disabled with the guard's own reason
    printed beside it — the refusal text names the `approved:` date or
    the referring document ids verbatim — never hidden silently.

**After the act.**

- Withdraw: the open tab stays; the document re-renders with the
  terminal treatment; a toast announces "`<ID>` withdrawn — file and
  inbound links kept".
- Delete: the document leaves the snapshot, so its tab closes exactly
  as an externally-deleted file's tab does today (a dirty editor keeps
  its Restore/Close choice, REQ-009 §5); a toast announces the removal.

## Withdrawn rendering — the existing terminal grammar, no new vocabulary

- **Status color**: `withdrawn` joins the status palette as
  `var(--muted)` — the same muted ink as `retired`. Status chips
  everywhere (frontmatter card, panel rows, palette rows, previews)
  inherit it with no per-surface work.
- **Sidebar**: a withdrawn document is not living. It leaves the
  collection counts and the panel's living list and joins the type's
  dead group behind the in-place expander. Sources — which had no dead
  state — gain one: the expander label for sources is `withdrawn`.
- **Palette**: withdrawn documents leave the default results (empty
  query, or bare type filters). They stay findable: a text query
  matches them, and `is:withdrawn` lists them — consistent with how
  the CLI keeps them out of queues but visible in `veri list`.
- **Approval queue**: automatic — a withdrawn document is never
  pending, so the Home NEEDS REVIEW card and the review banner drop it
  by the existing `isPending` predicate.
- **Board / in-flight**: automatic — both filter on the four lifecycle
  statuses.
- **Work-order status control**: on a withdrawn work order every
  segment renders with the existing `seg-item-gated` treatment and
  refuses with "a withdrawn work order is terminal — restoring it is a
  git edit, not a status click" — the SRC-051 exit-gate grammar
  extended to the second terminal state, closing the resurrect-by-click
  hole the ready gate closed for demotion.
- **Local graph**: a withdrawn neighbor dims like a superseded one.
- **Inbound `[[ID]]` links**: unchanged — the document is still in the
  snapshot, so chips, previews, and clicks keep resolving.

## Rejected alternatives

- **A delete/withdraw button in the tab or crumb row** — too prominent
  for a rare act, and the crumb row is navigation, not mutation.
- **Two separate entry points (a withdraw button and a delete button)**
  — doubles the surface for a verb pair the user should compare side by
  side; the guard's refusal would have nowhere natural to land.
- **Hiding delete entirely when refused** — explicitly ruled out by
  WO-110: silence teaches nothing; the refusal text is the education.
- **A native OS confirm dialog** — breaks the app's popover grammar,
  unstyleable, and cannot show the guard's reason inline.
- **Renderer-side guard evaluation** (bundling the refusal predicate
  into the browser) — a second evaluation site for the guard invites
  drift; the sidecar asks core once, when the popover opens.
