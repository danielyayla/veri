---
id: SRC-016
type: source
title: "Design critique — Veri under the Obsidian × 8090 lens"
status: imported
kind: investigation
created: 2026-08-18
updated: 2026-08-27
links:
  - id: REQ-009
    rel: supports
---

Full-surface design critique of Veri 0.1.3, conducted 2026-08-18 by an agent
session (Claude Code) at Daniel's request. Method: inspected the running
desktop app surface by surface (Home, type panels, reader/editor, work-order
detail with context package, Board, Graph, ⌘K palette, Settings, Templates,
Agent connection, project switcher, welcome flow), all four packages
(core/cli/mcp/ui), this repo's own 100-document corpus, and all twelve design
bundles under `design/`. Analysis only — nothing was implemented. The full
formatted report (with scorecard meters and evidence file refs) is published
as a private artifact: https://claude.ai/code/artifact/5390d59b-0633-48e0-aac0-518f28eca1b7

The brief: evaluate Veri against the intersection of two philosophies — the
simplicity, ownership, and composability of Obsidian with the structured
intent → architecture → execution → verification model of an AI-native
software factory (8090) — and judge whether Veri is drifting toward either
failure mode ("a nice markdown editor" / "enterprise SDLC with markdown
underneath").

## The verdict in five findings

1. **The architecture is honest; both poles are real.** Files genuinely are
   truth — no database ([[DEC-002]]), no second index (DEC-009), backlinks
   derived, raw markdown editable under guard ([[DEC-020]]). And the
   governance loop genuinely binds — approval stamps ([[REQ-008]]), gates,
   receipts ([[DEC-003]]), deterministic packages ([[DEC-006]]). Veri is
   already at the intersection structurally.
2. **The rigor is rules, not intelligence.** Context assembly is an unranked,
   unbudgeted 2-hop dump (~19.8k tokens for [[WO-028]] at 100 docs); `rel`
   has 28 vocabulary variants of which code reads exactly one
   (`designed-by`, [[DEC-012]]); receipts cite commit SHAs nothing verifies.
   Provenance, drift, and propagation are social, not mechanical.
3. **The agent is handed a workflow bigger than its tools.** [[WF-001]]
   orders agents to propose work orders; no MCP tool can create one. Agents
   cannot read any document outside the package (no `get_document`), cannot
   traverse the graph, and `veri context` — promised in every scaffolded
   AGENTS.md — does not exist.
4. **Context preservation is the weakest UX axis.** No back/forward, recents
   tracked but rendered nowhere, no split view, tabs lost on project switch —
   in a product whose core act is following WO → REQ → DEC → SRC trails.
5. **The product should shrink before it grows.** Board, Graph, and the
   orphaned Decision log are three redundant lenses; the palette, type
   panels, and Connections panel already carry the load.

## Mental models

Today the shell communicates **"a work-order console over a typed document
store"** — the work order is the only doc with an inline status control and a
dedicated side panel, and it anchors Board, Home's IN FLIGHT, and agent
kickoff. [[WO-035]]/[[WO-036]] ([[SRC-014]]) already defeated most of the
"collection of modules" reading; the residue is Board and Graph holding
permanent sidebar seats and the Decision log existing in no navigation at all.

The desired model, in three escalating sentences: *your project's memory is a
folder of markdown files; files link to each other and every screen is a
slice of that graph; your agent reads the same files through a contract you
can inspect, and nothing binds until you stamp it.* Files → graph → contract.
The gap is editorial, not architectural — the best possible finding.

## Surface critiques (condensed)

**Navigation.** The labeled sidebar + type panel ([[SRC-014]]) and the ⌘K
palette are the correct spine and already exist. Defects: no history; dead
breadcrumb; Decision log reachable only via ⌘K; Board is a read-only
restatement of the Work Orders panel; Graph is a columnar hairball with no
zoom/filter that is decorative at 100 docs and dead at 500; the palette caps
at 8 rows with no "all results" view. The simplest architecture that works at
10 and 2,000 docs: Home · four collections · working context (pinned/recent)
· ⌘K · Settings — nothing more.

**Editor.** Veri's best surface; genuinely file-native. Edit mode is the
actual file with guarded lines that explain themselves; read mode renders
frontmatter as a card; approve shows the exact three-line diff. Gaps: the
rendered markdown subset (no tables/fences/images) degrades exactly the SRC
design docs this repo is richest in; the reader's `[[ID]]` regex omits WF so
[[WF-001]] links only work in edit mode; two different `[[` autocompletes;
typed `links:` entries are raw-YAML-only; no find-in-document.

**Human–agent collaboration.** "Agent conversations are temporary, project
knowledge is durable" is achieved — the 33 done work orders are the proof.
But parity is asymmetric: humans can inspect exactly what agents receive (the
package panel, parsed from the same rendered markdown — the most
differentiated screen in the app), while agents cannot traverse, discover, or
propose most of what the workflow demands. `search` returns one metadata line
per hit, no bodies.

**Context delivery (recommendation).** Keep the contract, restructure the
contents: a guaranteed **core** (workflow + work order + direct links, full
text) + a **context map** (the 2-hop ring as annotated index rows: id, title,
status, rel-path, tokens) + **retrieval** (`get_document` makes the map
actionable). Deterministic escalation: below ~15k tokens, inline the ring
anyway, so small projects keep today's simplicity. Retrieval failure is
mitigated because the map names the adjacent documents explicitly.

**Scale at 2,000 docs.** Survives: sidebar, type panels, Home. Strains:
palette (8-row cap), snapshot pipeline (full reparse + 3 git shells per file
event). Dies: Board (a DONE column with 380 cards), Graph, the 2-hop package
(approaches the whole corpus verbatim), and the id space — `\d{3}` caps every
type at 999, so the brief's 1,000 sources cannot exist. Scale is a search
problem; the surfaces that die are the render-everything surfaces.

**Accidental complexity.** Remove the Decision log view and global Graph;
fold Board into the Work Orders panel; unify the two autocompletes; collapse
`draft`/`proposed` into one UI word ("pending" — the palette's `is:proposed`
already treats them as one); stop asking authors to curate `rel` vocabulary
the system ignores; fix promise/reality drift (`veri context` missing; README,
`get_context` description, and the PACKAGE RULES footer still claim CLAUDE.md
ships in packages, removed by [[DEC-018]]); de-hardcode `packages/ui` from
core's design gate; make `file_decision` honor the project decision template
([[DEC-023]]).

## Scorecard (1–5)

| Dimension | Score | | Dimension | Score |
|---|---|---|---|---|
| Ownership | 5 | | Cognitive load | 3 |
| Local-first integrity | 5 | | Knowledge composability | 3 |
| Human control | 5 | | Human–agent parity | 3 |
| Learnability | 4 | | Context quality | 3 |
| Direct manipulation | 4 | | Traceability | 3 |
| Search | 4 | | Information architecture | 3 |
| Agent interoperability | 4 | | Progressive disclosure | 3 |
| SDLC rigor | 4 | | Simplicity | 3 |
| Navigation | 3 | | Context preservation | 2 |
| | | | Scalability | 2 |
| | | | Added intelligence | 2 |

Low scores in one line each: context preservation — no history/recents/split;
scalability — package explosion, render-everything views, 999-id ceiling;
added intelligence — everything smart is a hand-written rule; the graph is
stored but never reasoned over.

## The moat

Veri is the only tool in its space that makes project knowledge
simultaneously **owned like Obsidian and binding like a factory**. A vault
has no notion of authority; CLAUDE.md + markdown has no lifecycle, graph,
check, or receipt trail; 8090-class factories own your process on their
infrastructure. The narrow, defensible claim: Veri turns a plain repo
directory into governed shared memory — authorship cheap for humans and
agents, authority a human stamp with a three-line git footprint, the exact
agent context a contract either party can read — while remaining a folder of
markdown that works without Veri. The moat is the gate plus the inspectable
contract, not (yet) intelligence.

## Proposed design manifesto

1. **Files are truth. Veri is a lens.** Any feature that stores truth
   elsewhere is rejected outright.
2. **Authorship is cheap; authority is a stamp.** Nothing binds until a human
   approves, visibly, in git.
3. **Show the write before it happens.** Every mutation previews its exact
   bytes — approval diffs, scaffold trees, config writes, context packages.
4. **Agents get a contract, not a transcript.** Deterministic, inspectable,
   reproducible; chat history is never load-bearing.
5. **Derive, don't book-keep.** Backlinks, health, provenance, drift —
   computed from files and git, never maintained in parallel.
6. **Rules block; opinions advise.** Hard failure only for broken truth;
   structure and drift whisper from the advisory tier ([[DEC-025]]).
7. **One concept, one implementation.** Same search, same assembly, same
   approve for CLI, UI, and MCP.
8. **Views are cheap; concepts are expensive.** Every ontology addition must
   prove it can't be a view, a link, or a derivation first.
9. **Never imply liveness you can't verify.** ([[REQ-005]])
10. **Scale is a search problem.** Anything that lists everything must
    filter, window, or die.

## Priorities

**P0 — before adding more surface area:** navigation history + render the
persisted recents; close the agent contract gap (`get_document`, neighbors,
work-order proposals — or amend [[WF-001]]); restructure the package
(core + map + retrieval with the small-project inline rule); kill
promise/reality drift; unify pending vocabulary; de-hardcode `packages/ui`;
accessibility floor (real buttons, focus states, ARIA).

**P1 — high-leverage:** receipt verification against git + derived
"implemented in"/"why does this exist" from the existing `WO-nnn:` commit
convention; first drift advisories on the [[DEC-025]] chassis (REQ edited
after implementing WO closed; active WO citing superseded DEC; post-stamp
edits); full search-results view + `related:` filter; hover previews on link
chips; reader markdown parity; resolve the Decision log.

**P2 — refinement:** local graph on the document (retire the global view);
split panes; tab persistence across project switches; Board time-windowing or
demotion; widen the id space; incremental snapshots; typed-link editing UI;
find-in-document.

## Final test — remove 50% of the surface

Remove: global Graph, Board, Decision log, the Updates and Project settings
pages, one of the two package-copy actions, the fake topbar search field, the
"Appearance · soon" placeholder. What remains — Home, four collections with
panels, tabs, reader/editor, work-order detail with context package, ⌘K, and
a two-entry Settings popover — keeps every capability and is genuinely
better: a first-run user meets five ideas instead of eleven, and each deepens
with use. The minimum surface that exposes the maximum power of the system:
**an editor, a panel, a palette, a home, and a gate.**
