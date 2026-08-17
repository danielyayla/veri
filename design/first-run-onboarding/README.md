# Handoff: First-run onboarding and connection verification (WO-030)

## Overview
Three surfaces that close the gap between "installed Veri" and "working
with an agent", scoped exactly to [[WO-030]] / [[REQ-013]]:

1. **Welcome screen** — shown only when launch resolution finds no known
   project; replaces the bare OS folder-picker loop for that one case.
2. **Empty states** — the home view and sidebar teach the path of work in
   a documentless project; the connection panel's existing not-set-up hero
   gains a runtime pre-check notice.
3. **Live connection check** — a "Verify connection" affordance in the
   agent-connection panel that launches the configured server once, speaks
   real MCP to it, and reports success or a named cause.

The Node-runtime mechanism behind surfaces 2–3 is [[DEC-031]]
(detect-and-guide via a login-shell probe; configs keep `command:
"node"`). Nothing here changes the config shape [[DEC-011]] gates.

## About the Design Files
`first-run-onboarding.html` is a self-running design reference (open it in
a browser; the scenario bar at the top switches states), not production
code. Recreate it in `packages/ui`'s existing vanilla-TypeScript renderer
patterns. Do not ship the HTML.

## Fidelity
High-fidelity. Colors, typography, spacing, and copy are final. Every
token used here already exists in `packages/ui/renderer/styles.css`; this
design introduces no new tokens.

## Non-negotiable principles
- **Files are the source of truth (DEC-002).** Every state on these
  surfaces derives from disk (or from a probe/spawn that just ran) —
  nothing is cached as app state, and no "onboarding completed" flag
  exists anywhere. The welcome screen appears when no known project
  resolves, and never again once one does; the START HERE card exists
  exactly while the project has zero non-workflow documents.
- **The sidebar footer never shows liveness (SRC-002).** Verification
  results are transient, live only inside the panel, and never recolor
  the footer's config-state dot.
- **One failure, one action (SRC-002).** Every failed verification names
  a single cause and offers exactly one corrective action. Copy-command
  actions copy; the app never installs, builds, or runs anything on the
  user's behalf beyond the one server spawn the user just clicked for.
- **Nothing is written silently.** The welcome screen's actions lead into
  the existing WO-018 picker → sheet flow, which shows the write before
  it happens. The welcome screen itself never creates files.

---

## Surface 1 — Welcome screen

**Trigger.** Launch resolution ([[DEC-027]] chain) finds no explicit
project argument and no valid MRU entry. Instead of the bare
`pickProjectDir()` dialog loop, the main window opens on this screen.
The WO-032 format-refusal dialog is unchanged and still precedes it when
a pick is inoperable. Once any project opens successfully (and thus
enters the MRU), this screen is never seen again — it is a cold-start
surface, not a tour.

**Layout.** Full window on app background `#0F0F11`. Centered column,
max-width 480px, vertically centered at 44% height.

Top to bottom:
1. **Wordmark** — "Veri", 26px/600, `--text`, letter-spacing -0.01em.
2. **One-liner** — 14px `#A09DA6`, line-height 1.65, max 2 lines:
   "A knowledge base your coding agents read — requirements, decisions,
   and work orders as plain markdown files living in your repo."
3. **Three action cards**, stacked, 10px gap, each: border `#26262C`,
   radius 10px, bg `#151519`, padding 16px 18px, hover border `#3A3A44`
   and bg `#18181D`, cursor pointer. Anatomy: 13.5px/600 title row with
   a trailing `→` in `#4A4852`, then a 12.5px `#8B8893` one-liner.
   - **Create a new project** — title in `--text` with a leading `+` in
     `#E8703A`. Body: "Pick a folder — Veri scaffolds a `veri/`
     directory inside it. Works in an existing repo." Activates the
     existing new-project flow (OS picker → New project sheet, SRC-007).
   - **Explore the sample project** — leading `◈` in `#908BA8`. Body:
     "A working invoicing-app knowledge base — 16 documents you can
     read, edit, and connect an agent to." Activates the same picker →
     sheet flow with the demo-seed toggle **pre-enabled** (the only
     behavioral delta from SRC-007; the sheet still shows what will be
     written and the toggle stays interactive).
   - **Open an existing folder** — leading `→` in `#7EA6C4`. Body: "A
     repo that already has a `veri/` directory." Opens the OS picker.
4. **Inline notice** (conditional) — picking a folder without `veri/`
   from the third card does not spawn the old dialog loop; the welcome
   screen stays and an amber notice line appears under the cards (6px
   `--amber` dot + 12.5px `--amber` text on `rgba(217,160,63,0.06)`,
   border `#3A3020`, radius 6px, padding 9px 12px):
   "No `veri/` directory inside {folder} — choose another, or create a
   new project there instead."
5. **Footer caption** — 11.5px `#55525E`, margin-top 22px: "Nothing is
   written until you choose — projects are plain files on disk, and
   this screen never creates anything on its own."

**Keyboard.** `↩` activates Create a new project. `⌘O` activates Open an
existing folder (matches the in-app binding).

**Transitions.** A successful create/open loads the project into the
same window exactly as `pointAppAt` does today. Cancelling any picker
returns to the welcome screen (never quits). Quit remains ⌘Q / close.

## Surface 2 — Empty states

A fresh project contains exactly one document (WF-001, the workflow).
"Empty" everywhere below means **zero non-workflow documents** — the
state every new non-demo project starts in.

### Home view — START HERE card
Full-width card above the grid, in the slot NEEDS REVIEW uses (they
cannot coexist: a documentless project has nothing pending). Card: bg
`#151519`, border `#26262C`, radius 10px, padding 18px 20px.

- Eyebrow `START HERE` — mono 10px, letter-spacing .1em, `#E8703A`.
- Heading — "This project is empty — evidence comes first." 16px/600.
- **Path-of-work row**: four mini-cards in a row (gap 8px, equal width;
  bg `#18181D`, border `#1F1F24`, radius 8px, padding 10px 12px), each
  a mono type label in its type color + an 11.5px `#8B8893` one-liner,
  joined by `→` glyphs in `#4A4852`:
  - `sources` `#908BA8` — "Evidence in: notes, specs, transcripts"
  - `requirements` `#7EA6C4` — "What must be true"
  - `decisions` `#CFA83D` — "What was chosen, and why"
  - `work orders` `#E8703A` — "Work an agent can pick up"
- **Action row** (margin-top 14px, gap 10px): primary button "New
  document" (34px, radius 7px, bg `#E8703A`, text `#141414` 13px/600)
  opening the existing new-document flow; ghost button "Connect an
  agent →" (border `#26262C`, text `#A09DA6`) navigating to the
  agent-connection panel.
- Caption under the actions, 11.5px `#55525E`: "Or let your agent file
  documents for you — the MCP connection gives it `file_decision` and
  `file_receipt`."

The card derives from the snapshot on every render and disappears the
moment a first non-workflow document exists. No dismiss control.

### Sidebar — ghost hint rows
Each empty type section (REQUIREMENTS, DECISIONS, WORK ORDERS, SOURCES)
keeps its header (label + count `0`) and renders one **ghost row** in
place of document rows: height 26px like `.sb-row`, text 12px italic
`#55525E`, leading `+` in `#4A4852`:

- requirements — "What must be true"
- decisions — "What was chosen, and why"
- work orders — "Work an agent can pick up"
- sources — "Evidence brought in"

Hover: bg `#1B1B20`, text `#8B8893`, and the row reads `+ New
requirement…` (swapping the hint for the action, singular type name).
Click starts the existing new-document flow with that type preselected.
A ghost row exists exactly while its section has zero documents; the
workflow section (never empty) and PINNED/RECENT (hidden when empty
today — unchanged) get no ghost rows.

### Connection panel
The not-set-up hero (SRC-002) already teaches this surface and is
unchanged, with one addition — the **runtime pre-check notice** — see
Surface 3, state F.

## Surface 3 — Live connection check

### Placement
A new section in the agent-connection panel, directly below the health
card (present whenever the four static checks render, i.e. config state
`ok` — hidden in not-set-up/conflict/unparseable states, which have
nothing launchable). Eyebrow `LIVE CHECK` — mono 10px, `#6E6B76`.

Body copy (13.5px `#8B8893`): "The checks above read files. This one
launches the server the way your agent will — once, with the config
exactly as written — and confirms it answers over MCP."

Ghost button **"Verify connection"** (28px, border `#26262C`, text
`#A09DA6` 12px/500). While running: disabled, label "Verifying…" (no
spinner — local spawn, typically < 3s; hard timeout 10s).

### Mechanism (implementer notes, per DEC-031)
- Resolve the runtime with the login-shell probe: `$SHELL -l -c
  'command -v node && node --version'` — never the app's own PATH.
- Spawn the resolved node with the entry's args exactly as resolved by
  the existing checks (`serverPathResolved`, `rootPathResolved`), speak
  newline-delimited JSON-RPC: `initialize`, `notifications/initialized`,
  `tools/list`, then one `search` call for a document id taken from the
  open project's snapshot (proves the server is serving *this*
  project's files). In a documentless project, skip the search step and
  report the tools-only proof honestly.
- Kill the child afterward in all paths. Results are transient renderer
  state — never persisted, never recolor the sidebar footer.

### Result states
Success — a result row under the button: 16px circle badge (`✓` on
`rgba(127,175,138,0.15)` in `#7FAF8A`) + 13px `#E7E4DE`:
"Server answered over MCP — serving this project (`{n} documents`, 4
tools) with node `{vX.Y.Z}`." Caption below (11.5px `#55525E`):
"Verified just now. This proves the server launches and serves this
project — your agent still starts its own session." Empty project
variant: "Server answered over MCP — 4 tools available (project has no
documents yet)."

Failures — an amber result block (badge `!` on `rgba(217,160,63,0.15)`
in `#D9A03F`; message 12.5px `#D9A03F`; exactly one action button, 26px,
bg `rgba(217,160,63,0.12)`, border `#3A3020`, text `#D9A03F` 11.5px/600):

- **A · Missing runtime** — "No `node` found in your shell. Agent apps
  launch the server with `node`; it isn't installed, or isn't on your
  shell's PATH." Action: **Copy install command** (copies `brew install
  node`; label flips to "✓ Copied — install, then verify again").
  Caption: "Or install Node 20+ from nodejs.org — either works."
- **B · Runtime too old** — "Found node `{v18.19.0}` at `{path}` —
  Veri's server needs Node 20 or newer." Action: **Copy upgrade
  command** (`brew upgrade node`). Same caption as A.
- **C · Server path missing** — "Nothing at `{path}` — the server isn't
  on this machine at the configured location." Action: **Copy build
  command** (`npm run build -w packages/mcp`). Caption: "In a packaged
  install this usually means the app was moved — re-run setup above to
  rewrite the path."
- **D · Wrong project root** — "The server answered, but it's serving
  `{other-root}`, not this project." Action: **Fix path** (the existing
  repair; rewrites only the root argument, then shows the restart
  banner and re-runs the static checks).
- **E · No answer** — "The server started but didn't answer within 10
  seconds." Action: **Copy error output**. Below, a mono block (11px on
  `#0F0F11`, border `#1F1F24`, max 6 lines, scroll) with the captured
  stderr.

States A–C are also reachable without spawning (probe/stat fails
first); the copy is identical either way.

### F · Runtime pre-check in the not-set-up hero
When the panel opens in the not-set-up state, the login-shell probe runs
in the background. If it finds no usable Node (missing or < 20), a
notice appears between the JSON preview and the caption — same amber
treatment as the welcome notice: "Heads up — no usable `node` in your
shell (found: `{none | v18.19.0}`). Set up writes the file fine, but an
agent can't launch the server until Node 20+ is installed." + the same
single copy action as A/B. Setup is **not** blocked — the file is
still correct, and the notice says so.

## States checklist for implementation
1. Welcome screen, three cards.
2. Welcome screen, not-a-project inline notice.
3. Home view with START HERE card (documentless project).
4. Sidebar ghost rows, one per empty section (with hover swap).
5. Live check at rest (healthy config).
6. Verify: success (with and without documents).
7. Verify: missing runtime · runtime too old · server path missing ·
   wrong root · no answer.
8. Not-set-up hero with runtime pre-check notice.

All are in `first-run-onboarding.html` behind the scenario bar.

## Deliberately not designed
Per WO-030's out-of-scope list: no website/docs surfaces, no update
pipeline changes, no Windows/Linux onboarding, no multi-project or team
flows, no tours, tooltips-on-rails, or checklists beyond the empty
states above. Also excluded by this design specifically: no MRU editing
from the welcome screen, no "recent folders" list (the OS picker has its
own), no auto-verification on panel open (the user clicks; the only
background probe is the passive runtime pre-check, which spawns no
server), and no persistent record of verification results.

## Design Tokens
All existing: app bg `#0F0F11`; panel `#131316`; cards `#151519` /
`#18181D`; borders `#1E1E24` / `#1F1F24` / `#26262C`, hover `#3A3A44`;
text `#E7E4DE` / `#C9C6CF` / `#A09DA6` / `#8B8893` / `#6E6B76` /
`#55525E` / `#4A4852`; accent `#E8703A` (on-accent `#141414`); green
`#7FAF8A`; amber `#D9A03F` (border `#3A3020`); info blue `#7EA6C4`;
type colors: requirement `#7EA6C4`, decision `#CFA83D`, work order
`#E8703A`, source `#908BA8`. Type: "Source Sans 3" prose, "JetBrains
Mono" for ids/labels/code. Radii: cards 10px, inner 7–8px, small 6px.

## Assets
None — glyphs are unicode text (`+ ◈ → ✓ ! ↩`).
