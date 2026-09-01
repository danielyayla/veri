---
id: SRC-071
type: source
title: "veri:review of WO-143 — dispatch replaces ready, read against its work order"
status: imported
kind: investigation
created: 2026-09-02
updated: 2026-09-02
links:
  - id: WO-143
    rel: reviews
  - id: MET-010
    rel: derived-from
  - id: DEC-148
    rel: constrained-by
  - id: SRC-070
    rel: filed
---

> The findings report of the first veri:review pass ([[MET-010]]), run
> 2026-09-02 on Daniel's ask against [[WO-143]]'s ten commits
> (0f80ee0..94e3c10, claim fable-wo143), filed as a source at his
> direction. The fixes below were applied the same day, also at his
> direction — the applied-repair notes were added at filing time and
> were not part of the review's delivery.

## Parameters

Reviewed WO-143 against its work order, [[DEC-143]], [[DEC-148]],
[[REQ-015]], [[REQ-008]], and WF-001. Check at review time: 0
violations, 16 advisories, skipped verbatim: provenance, binding
drift, design gate diff, shell drift — the git tier did not run over
MCP; the terminal `veri check` the same day was green, and provenance
was read by hand (which produced nit 1).

## Verdict per criterion — all five genuinely evidenced

1. **No ready in the schema; dispatch flips backlog → in-progress with
   stamp and claim in one write** — schema enum, `dispatch.ts` single
   `writeFile` after prospective gates; `dispatch.test.ts` proves one
   write and that an existing stamp is spent, never re-dated.
2. **MCP e2e proves no agent path can dispatch** — exact tool-list
   pin, the retired `start_work_order` and an imagined
   `dispatch_work_order` both fail on the wire, `amend_document`
   refuses the stamped-backlog shape, file asserted byte-identical.
3. **An on-disk ready project migrates cleanly and checks clean** —
   migration test preserves stamps byte-for-byte with
   `checkProject(load).issues` empty; live proof in this repo's own
   migrated queue.
4. **stamped-backlog retired, replacement tested** — the rule and its
   advisory kind deleted; each replacement semantic (quiet, amend-
   refused, spendable, drift-exempt) tested and named in [[DEC-148]].
5. **Rule 8 and docs describe the single gesture; suite green** — 930
   tests at close, docs sweep honestly deferred to WO-148's named
   scope.

Boundary walk: every in-scope item has hunks, every hunk claimed
(including the negative-space UI grant and amend.ts under item 3);
out of scope respected. No smuggled decision found — [[DEC-148]] was
filed with four genuinely-argued alternatives and covers every fork
in the diff. No proposed decision filed by this review.

## Findings — important

1. **The work order's own sequencing blocker was overrun,
   undisclosed.** The Summary ends "the format bump waits until WO-125
   ships format 4"; WO-125 was in-progress when d624dce bumped the
   marker to 5, and every installed pre-5 reader refused the repo for
   the rest of the day — exactly the stranding the blocker guarded
   against. Neither receipt nor report named the divergence. *(Clause:
   WO-143 Summary, BLOCKER sentence.)* — **Applied:** disclosure
   receipt appended to WO-143; the strand persists until [[WO-155]]
   ships the format-5 reader to npm.
2. **packages/ui touched with no design-gate artifact.** e0abf33 edits
   the status control; WO-143 carried no designed-by link and no
   `binds:` declaration, against WF-001 rule 7, and the
   undeclared-touch advisory retires at done leaving no trace.
   *(Clause: WF-001 rule 7.)* — **Applied:** [[SRC-070]] filed as the
   retroactive design note and linked designed-by; recurrence guard
   added to AGENTS.md.

## Findings — nits (3 of 5; none dropped)

1. **The receipt's citation was unverifiable**: `d624dce..587de5a`
   parses to zero SHAs (the range form fails `SHA_RE`; dots are not
   split characters), so the one claim a receipt makes under REQ-021
   was silently unchecked. *(REQ-021 as amended.)* — **Applied:**
   rewritten comma-separated.
2. **Rule 8's rewrite did not carry [[DEC-148]]'s distinction**
   between writing a fresh stamp (the user's only) and spending an
   existing one (a pure claim act); a reader of rule 8 alone would
   call the migration batch's agent-run dispatches violations.
   *(Rule 8 vs DEC-148.)* — **Applied:** rule 8 amended; WF-001
   awaits Daniel's re-stamp.
3. **A format-4 project under a format-5 reader misreported**:
   still-ready documents rendered as invalid-frontmatter beside the
   migrate hint, against [[REQ-015]]'s "Checked" promise (a clear
   statement, never a misparse). *(REQ-015, Checked.)* — **Applied:**
   b6d17fd — the status enum names DEC-143's retirement and `veri
   migrate`; tested both ways.
