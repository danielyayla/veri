# Handoff: Brownfield import (proposed SRC-039)

## Overview
UI for [[REQ-024]] / [[WO-075]]: adopting Veri on a project that already
exists. The app hands the user's connected agent an instruction package
telling it what to mine (code layout, git history, ADRs, READMEs,
CLAUDE.md/AGENTS.md) and how to file findings; the agent writes back
draft requirements, proposed decisions, and SRC evidence documents; the
user reviews and stamps what survives. This handoff designs the four
surfaces of that loop: the brownfield entry points, the Import view
(preflight → kickoff → live progress → done), the import group in the
review queue, and the provenance treatment on an imported document.

The non-UI mechanics (the instruction package served over MCP, the
filing surface for draft requirements and evidence sources, the CLI
command) are specified here only as behavior contracts; their mechanisms
are decisions to file when implementation starts, per repo convention.

## About the Design Files
`brownfield-import.html` is a self-running design reference (open in a
browser; the scenario bar switches all six states), not production code.
Recreate in `packages/ui`'s existing vanilla-TypeScript renderer
patterns (DEC-008). Do not ship the HTML.

## Fidelity
High-fidelity. Colors, typography, spacing, and copy are final. Every
token used here already exists in `packages/ui/renderer/styles.css`;
this design introduces no new tokens. Component idioms reuse the
navigation-model, approval-gate, new-project-flow, and
first-run-onboarding handoffs.

## Non-negotiable principles
- **Files are the source of truth (DEC-002).** There is no import
  registry, no import state machine persisted anywhere. An import
  "batch" exists only as documents on disk: the agent files one SRC
  **import manifest** describing the session, every mined document
  links to it, and every surface below is derived by reading those
  links. Kill the app mid-import and nothing is corrupt — there are
  simply fewer files.
- **The agent does the reading (DEC-002, REQ-024).** Veri never
  touches the repo's code and never makes an LLM or network call. The
  Import view's job is to brief the agent and then watch files land.
- **Everything imported lands non-binding (REQ-008).** Mined
  requirements arrive `draft`, mined decisions `proposed`. The import
  surfaces reuse the approval-gate machinery unchanged: same banner,
  same one-at-a-time approve popover, **no bulk approve** — the batch
  grouping makes sequential review pleasant, not skippable.
- **One failure, one action (SRC-002 convention).** Every preflight
  failure state names one cause and offers exactly one action.
- **Import is an offer, never a gate.** Declining or ignoring the
  import path leaves every existing flow exactly as it is today.

## Vocabulary
- **Brownfield project**: an open project whose root contains tracked
  files beyond `veri/` while `veri/` itself is *unpopulated*.
- **Unpopulated**: zero documents other than the scaffolded workflow
  document and templates. One hand-written REQ means the user has
  started authoring; the import offer demotes itself (entry point 1
  disappears; the palette command and CLI remain available).
- **Import manifest**: the SRC document the agent files first,
  describing the session (what it read, when). Mined documents link to
  their evidence SRCs and the manifest; the manifest id is the grouping
  key for the review queue.

---

## Surface 1 — Entry points

### 1a. Home START HERE card, brownfield variant
The SRC-013 empty-state card keeps its chrome (eyebrow `START HERE`,
16px heading, path-of-work row). On a brownfield project the action row
changes:

- Primary button (ember): **Import project knowledge** → opens the
  Import view (Surface 2).
- Ghost button: **Start from scratch** → collapses the variant to
  today's greenfield card (session-only; nothing persisted).
- Caption (11.5px ghost): `Your connected agent reads this repo and
  files proposals — nothing becomes binding until you approve it.`

On a greenfield project (folder with no other files) the card is
exactly today's — this variant never appears.

### 1b. New-project sheet, created state
When the sheet (SRC-007) finishes scaffolding into a folder that
contains other files, the success notice gains one line under the
existing copy: `This folder already has code — Veri can mine it for
requirements and decisions.` followed by a link-style action **Import
project knowledge →** routing to the Import view. No new modal, no
extra step; the sheet closes as it does today.

### 1c. Command palette
New `command` row (SRC-007 pattern): `+ Import project knowledge…`,
visible whenever the open project is brownfield (populated or not —
re-running an import later is legitimate; the agent is instructed to
file only what is not already covered).

### 1d. CLI (behavior contract, no visuals)
`veri init` on a non-empty folder prints one hint line after its normal
output: `This folder has existing code. Run "veri import" to have your
agent mine it into proposals.` `veri import` prints the same kickoff
prompt Surface 2 copies, to stdout, for terminal-first users (REQ-017
parity). Mechanism filed as a DEC at implementation.

---

## Surface 2 — The Import view

A single centered column (max 640px, the connection-panel idiom), title
**Import project knowledge**, subtitle: `Your agent reads this repo —
code, git history, ADRs, READMEs — and files what it finds as
proposals. You review every one before it binds.`

### States

**2a. Ready (agent connected).** Three stacked cards:
1. `WHAT THE AGENT MINES` — static two-column list (mono micro-labels):
   left `Reads` (code layout · git history · ADRs & design docs ·
   READMEs · CLAUDE.md / AGENTS.md), right `Files` (evidence sources ·
   draft requirements · proposed decisions — each with its status chip
   in the approval-gate pending style).
2. `PREFLIGHT` — one row, the SRC-013 LIVE CHECK component reused
   verbatim: green `✓ Agent connected — {agent} · config verified` or
   the failure states below.
3. Action card: primary button (ember) **Copy import kickoff** — copies
   the kickoff prompt (the instruction package pointer, same clipboard
   pattern as WO-011; flips to green `✓ Copied — paste into your
   agent` for 1.8s). Secondary ghost: **Show what it says** — expands
   an inline read-only mono block with the full prompt text. Caption:
   `Veri never reads your code itself. The agent works in your
   terminal; filed documents appear here as they land.`

**2b. Preflight failed (no agent connected).** Card 2 shows the amber
notice: `No agent connection found for this project.` One action:
**Open connection panel →** (routes to the existing panel, SRC-002).
The kickoff button is disabled at 40% opacity, tooltip `Connect an
agent first`.

**2c. In progress.** Once the watcher sees a document land that links
to a new import manifest, the action card is replaced by `FILING`
— a live feed (newest first, the ACTIVITY row idiom): ember dot + mono
`agent` tag + id chip in type color + title + relative time. Header
counts by type: `2 sources · 3 requirements · 4 decisions`. No
progress bar — total is unknowable; the feed itself is the progress.
A ghost row at the bottom: `Watching veri/ for filed documents…` with
the 3s pulse. This state is *derived*: it renders whenever the newest
manifest has documents younger than the session; there is no
"importing" flag anywhere.

**2d. Done.** When the agent files its receipt on the manifest (its
final act per the kickoff prompt), the feed collapses to a summary
card: green border (receipt idiom), `✓ Import complete — 14 documents
filed`, per-type counts, and primary button **Review imported
documents** → Home with the NEEDS REVIEW card scrolled into view.
If no receipt ever arrives, state 2c simply persists — accurate
(files are the truth) and harmless.

---

## Surface 3 — Review queue, import group

The approval-gate NEEDS REVIEW card on Home groups rows whose document
links a shared import manifest:

- Group header row (inside the card, above its rows): src-violet 7px
  swatch + mono 10px label `IMPORTED · {manifest title}` + right-aligned
  progress `3 of 11 reviewed` (mono 10.5px). The denominator counts only
  the group's requirements and decisions; "reviewed" = no longer
  draft/proposed, i.e. approved or superseded — derived from files, not
  counted in any registry.
- **Evidence rows.** The group's SRC documents are listed first — the
  review act is reading claims against evidence, so evidence leads — but
  they are *context, not queue items*: status `imported` is terminal
  (sources are never approved), so they carry a src-violet `evidence`
  chip (same geometry as the pending chip, src tint) instead of an amber
  pending chip, and are excluded from both the card's `{n} pending`
  count and the group progress denominator. Opening one shows no review
  banner.
- Requirement and decision rows are the approval-gate row anatomy
  unchanged (id chip · title · pending chip · time), requirements before
  decisions, oldest first within each.
- Non-imported pending docs list below the group, ungrouped, exactly as
  today. Empty behavior unchanged: card hidden when queue is empty.
- No bulk actions. The group affordance is orientation, not a
  checkbox.

Sidebar and palette pending markers (amber dot) apply to imported docs
with no changes.

## Surface 4 — Imported document, review banner

The approval-gate banner gains a provenance line for documents that
link an import manifest. Line 2 copy (11.5px `#A09DA6`), exact:

- decision: `Filed by an agent import session on {date} from evidence
  in {SRC id chips}. It is not yet binding — work orders that depend on
  it stay gated until you approve.`
- requirement: `Drafted by an agent import session on {date} from
  evidence in {SRC id chips}. Work orders can cite it but cannot start
  until you accept it.`

The `{SRC id chips}` are the document's linked evidence sources as
tinted src-violet id chips, clickable — the review act is reading the
claim against its evidence, so the evidence is one click away. The
"What approving means" disclosure, action row, approve popover, and
check-issue disabling are all unchanged from the approval gate.

Below the banner, nothing else changes: an imported document is a
normal document.

---

## Interactions & behavior
- All states derive from files + links; switching projects or
  restarting the app mid-import loses nothing.
- The Import view is reachable any time from the palette; on a project
  with a completed import it opens in state 2d (summary derived from
  the newest manifest + receipt).
- Copy flash, tooltips, hover rows, and pulse animation reuse existing
  timings (1.8s flash, 3s pulse, instant tooltips).

## State management
Per view: expanded prompt block, copy flash, feed rows (from the file
watcher), scroll target on review routing. App: none added — no flags,
no persisted import state.

## Assets
None. Glyphs are unicode (✓ ◌ → ⌁); fonts already bundled.

## Files
- `brownfield-import.html` — self-running prototype; scenario bar
  switches all six states (start-here, ready, no-agent, in-progress,
  done + review queue, imported-doc banner).
- This README — the written spec; copy is final.
