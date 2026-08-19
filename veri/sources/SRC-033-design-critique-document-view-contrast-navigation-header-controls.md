---
id: SRC-033
type: source
title: "Design critique — Document view: contrast, linked-card navigation, header controls"
status: imported
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-004
    rel: designs
  - id: REQ-020
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
  - id: SRC-032
    rel: builds-on
---

A structured design critique of the document view (2026-08-19),
reviewed live against WO-060 and DEC-041 in the running app and
grounded in the renderer source (`packages/ui/src/renderer/views/
workorder.ts`, `reader.ts`, `widgets.ts`, `renderer/styles.css`).
Contrast ratios measured from the dark-palette hex tokens. The three
priority findings are the scope of [[WO-061]]; the rest is recorded
here as observed.

## Priority findings (the WO-061 scope)

### 1. Contrast floor — `--faint` and `--ghost` fail on information-bearing text

- `--faint` `#6E6B76` on `--bg` `#0F0F11` measures ~3.7:1, used at
  10–11px for breadcrumbs, micro-labels (ACTIVITY, CONTEXT PACKAGE),
  the created/updated metadata line, and the **inactive status
  segments** — interactive controls. WCAG AA wants 4.5:1 at these
  sizes.
- `--ghost` `#55525E` on `--bg` measures ~2.5:1, used for activity
  timestamps (`.act-time`, 10.5px).
- Passing for reference: `--muted` ~5.5:1, `--ember` ~6.2:1,
  `--secondary` and body text comfortably above.

**Direction:** raise `--faint` to ≈`#7E7B87` (4.5:1) in the dark
token block with a matching light-palette value; move `.act-time`
off `--ghost` to a passing token; reserve `--ghost` for decorative
glyphs. Coordinate with [[SRC-032]]'s validated ladder (≥ 7:1
primary, ≥ 4.5:1 secondary, ≥ 3:1 meta-only faint) rather than
inventing a parallel scale — the open question for review is whether
inactive status segments count as "meta-only faint" (3:1) or as
control labels (4.5:1); this critique argues controls.

### 2. Linked-card IDs do not navigate

In Linked requirements/decisions cards (`linkedCard`,
`workorder.ts`), the document ID is a plain colored span inside the
disclosure `<button>`: clicking `DEC-012` toggles the row instead of
opening the document (verified live). Everywhere else — sidebar,
prose chips, Connections cards, local graph — an ID navigates. This
is the one place the ID grammar lies to the user.

**Direction:** render the ID as a real `idChip` with
`stopPropagation` (⌘-click backgrounds, per SRC-004 rule 1); chevron
and title remain the disclosure surface. Hover preview comes free
with the chip.

### 3. Header control twins — a file mutation one misclick below a view toggle

The read|edit mode toggle and the backlog / in progress / done
status radiogroup are visual twins: bordered mono-11px segments,
ember-tinted active state, stacked ~30px apart in the header. Status
is an instant, undo-less write to disk; read|edit is a benign view
switch. The mode toggle is also ~21px tall (3px vertical padding),
under the 24px WCAG 2.5.8 target minimum.

**Direction:** quiet the mode toggle (drop the bordered-segment
treatment, or relocate it out of the header stack) so the status
control alone owns that visual voice; bring its hit target to
≥ 24px; add an undo toast on status change ("WO-060 → done · Undo")
that restores the prior status on disk.

## Secondary findings (recorded, out of WO-061 scope)

- **Metadata inconsistency:** reader docs get the frontmatter card
  (id, type, status, approved, created, updated, links editor);
  work orders get one faint line and **no links editor** — links on
  a WO cannot be managed in the UI. Status renders three ways
  (tinted chip, segmented control, bare 10px colored text in linked
  cards). Worth its own work order.
- **Pin chip:** floats between title and status control, misaligned
  against multi-line titles; ☆ Pin ↔ ★ Pinned label swap shifts
  layout width.
- **Misplaced emphasis:** `branch main` is the only ember item in
  the metadata line — the least actionable fact gets the most
  salient color.
- **Activity feed:** a full labeled section for a single "Last
  edited" row on fresh docs; session rows are ephemeral across
  restarts with no visual distinction from file activity.
- **Note composer:** Enter-to-commit has no visible affordance once
  the placeholder is gone.

## What works (do not regress)

The type-color system is token-clean and consistent across every
surface; linked cards expanding to acceptance criteria/rationale
inline are the right altitude; the hover-preview state machine
(350ms in / 150ms out, never focus-trapping) is sound; the a11y
architecture — real buttons, roving tabindex radiogroup,
`:focus-visible` ring, aria-labels, no color-only states — is a
genuine strength and the substrate the fixes above build on.
