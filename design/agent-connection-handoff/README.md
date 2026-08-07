# Handoff: Agent connection panel

## Overview
A screen in the Veri desktop app that lets a user set up, verify, and repair the MCP connection between the currently open project and agent apps (Claude Code and compatible clients) — without hand-editing `.mcp.json`. The panel manages only the server side of the connection: the project-scoped `.mcp.json` file next to the project's `veri/` directory. It never shows or implies live client-side connection status.

Source PRD requirements: one-click setup, four health checks with exactly one corrective action per failure, a copyable user-scoped `claude mcp add` alternative, a restart notice after every write, an inline explainer of the four MCP tools, and five designed states (see below).

## About the Design Files
The files in this bundle are **design references created in HTML** — a working prototype showing intended look and behavior, not production code to copy directly. Recreate this design in the Veri codebase's existing environment (the repo is a Tauri-style desktop app with a webview UI; `packages/ui` holds the frontend, `packages/mcp` the MCP server the panel configures). Use the codebase's established patterns and component conventions.

`agent-connection.html` (a copy of `Veri.dc.html`) contains the full app shell; the Agent connection screen is the block marked `<!-- ===== AGENT CONNECTION ===== -->` and its logic is the `mcp*` values in the script at the bottom.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and copy are final. Recreate pixel-perfectly using the app's existing dark theme (the values below already match the rest of the Veri UI in this prototype).

## Entry points
1. **Sidebar footer** (persistent, project-scoped). A clickable row at the bottom of the sidebar showing honest *config* state — never live status:
   - Not set up → amber dot `#D9A03F`, label `agent connection · not set up`
   - Configured & healthy (incl. after external edit) → green dot `#7FAF8A` (static, no pulse — a pulse implies liveness), label `agent connection · configured`
   - Broken or conflicting → amber dot, label `agent connection · needs attention`
   - Row: mono 10px `#6E6B76`, padding 9px 14px, top border `#1E1E24`, trailing `→` in `#4A4852`, hover bg `#1B1B20`.
2. **Work-order context panel**: under the "Serve via MCP" snippet, the line `via .mcp.json · connection settings →` (link in `#E8703A`) navigates to the panel.

## Screen layout
Centered column, max-width 640px, padding `30px 40px 60px`, on app background `#0F0F11`.

Top to bottom:
1. **Breadcrumb** — `skiff / Agent connection` (mono 11px, `#6E6B76`, current segment `#E8703A`).
2. **Title row** — h1 "Agent connection" (24px/600, letter-spacing -0.01em) + right-aligned ghost button "↻ Re-run checks" (28px tall, border `#26262C`, text `#A09DA6` 12px/500; hidden in the not-set-up state).
3. **Subhead** — 13.5px `#8B8893`, line-height 1.6: "Sets up this project's `.mcp.json` so agent apps like Claude Code can launch Veri's MCP server. Veri manages the file only — your agent reads it when a session starts."
4. **Banners** (conditional, order: external-edit, then restart).
5. **State card** (not-set-up hero OR conflict card OR health checks card + config card).
6. **"Prefer user-scoped setup?"** section (always).
7. **"What the connection provides"** section (always).

## States (all five must be implemented)

### 1. Not set up (`.mcp.json` absent, or present with no veri entry)
Hero card: border `#26262C`, radius 10px, bg `#151519`, padding 20px 22px.
- Eyebrow `NOT SET UP` — mono 10px, letter-spacing .1em, `#D9A03F`
- Heading "Connect a coding agent to this project" — 16px/600
- Body (13.5px `#A09DA6`): "One click writes `.mcp.json` next to the `veri/` directory — a plain file you can read, diff, and commit so teammates get the connection too. Nothing to type."
- **Primary button "Set up connection"** — 34px tall, radius 7px, bg `#E8703A`, text `#141414` 13px/600. This is the single action of the happy path: it writes a complete, correct entry (server path + project root pointing at the directory *containing* `veri/`) with no fields to fill.
- `WHAT WILL BE WRITTEN` label + read-only JSON preview (mono 11px on `#0F0F11`, border `#1F1F24`): the exact `mcpServers.veri` object (`"command": "node"`, `"args": [<server.js path>, <project root>]`), with `"veri"` key highlighted `#E8703A`, values `#C9C6CF`, punctuation `#8B8893`.
- Caption: "Any other servers already in the file are left untouched." (11.5px `#6E6B76`)

### 2. Configured and healthy
Calm confirmation — no celebration.
- **Health card**: header row `HEALTH` (mono 10px `#6E6B76`) + right-aligned `all 4 checks pass` (mono 10.5px `#7FAF8A`). Four check rows, each: 16px circle badge (bg `rgba(127,175,138,0.15)`, `✓` in `#7FAF8A`), check name 13.5px/500 `#E7E4DE`, right-aligned mono detail 10.5px `#55525E`. Rows divided by `#1B1B20`.
- Card footer note (11.5px `#55525E`): "Checks read the file and disk only — they can't tell whether an agent session is currently connected."
- **Effective config card** (read-only key/value rows, mono): config file `~/dev/skiff/.mcp.json`, command `node`, server `~/dev/veri/packages/mcp/dist/server.js`, project root `~/dev/skiff`. Keys 11px `#6E6B76` in a 110px column; values 12px `#C9C6CF`.
- Caption: "Read-only here. Edit the file directly if you need to — external changes are picked up and re-checked automatically."

### 3. Configured but broken
Same health card; header count becomes `N check(s) failing` in `#D9A03F`. A failing row shows:
- Badge: `!` on `rgba(217,160,63,0.15)` in `#D9A03F`; detail column empty.
- Below the row (indented 26px): plain-language failure message (12.5px `#D9A03F`) + **exactly one** action button (26px tall, bg `rgba(217,160,63,0.12)`, border `#3A3020`, text `#D9A03F` 11.5px/600).

The four checks and their failure treatments:
1. `.mcp.json exists` — detail: file path.
2. `Veri server entry present` — detail: `mcpServers.veri`.
3. `Server executable found` — fail message: "Nothing at ~/dev/veri/packages/mcp/dist/server.js — the server hasn't been built on this machine." Action: **Copy build command** (copies `npm run build -w packages/mcp`; label becomes "✓ Copied — build, then re-run checks"). The app never runs the build itself.
4. `Project root matches this project` — fail message: "Points at /Users/tom/dev/skiff — a path from another machine, likely a teammate's commit." Action: **Fix path** (rewrites only the veri entry's project-root arg, then shows the restart banner).

Repairs rewrite **only the veri entry**, preserving all other servers in the file.

### 4. Externally modified
Info banner above everything (border `#1F2A33`, bg `rgba(126,166,196,0.06)`, `↺` icon):
"**.mcp.json was changed outside Veri.** The file is the source of truth — checks re-ran just now and reflect what's on disk." (bold lead `#7EA6C4` 600, body `#A09DA6` 12.5px). Behavior: watch the file; on any external change re-run all checks without restart and render whichever state results. "Re-run checks" dismisses the banner.

### 5. Conflicting entry
Card (border `#3A3020`, bg `#151519`):
- Eyebrow `CONFLICTING ENTRY` (`#D9A03F`)
- Heading: `.mcp.json has a "veri" server Veri didn't write`
- Body: "It may be from an older setup or a teammate's machine. Veri won't touch it without your say-so."
- JSON block showing the unrecognized entry verbatim (read from the real file).
- Primary button **Replace with Veri's entry** (`#E8703A`) + inline caption: "Rewrites only this entry — other servers stay as they are. Or leave it: Veri never overwrites it silently." No other actions; leaving is doing nothing.

## Banners
**Restart notice** — shown after *any* write (setup, fix path, replace): border `#3A3020`, bg `rgba(217,160,63,0.07)`, `⟳` icon. Copy: "**Restart your agent session to apply.** Agent apps read .mcp.json on launch — quit and reopen Claude Code, or start a new session. This is the one step Veri can't do for you." Persists until checks are re-run or the panel is left.

## Always-present sections
**PREFER USER-SCOPED SETUP?** — body: "Instead of a file checked into the repo, add the server to your own Claude Code config. Copy the command and run it in a terminal — Veri only fills it in, it never runs it." Below: code row (bg `#0F0F11`, border `#26262C`) with the pre-filled command `claude mcp add veri -- node <server.js path> <project root>` + a **Copy** ghost button (label flips to "✓ Copied" for ~1.8s). Copy is the *only* action — the app must never execute it.

**WHAT THE CONNECTION PROVIDES** — 2×2 grid (gap 8px) of small cards (bg `#151519`, border `#1F1F24`, radius 8px), each a mono tool name in `#E8703A` + one-line description in `#8B8893` 12px:
- `get_context` — Pulls the assembled context package for a work order
- `search` — Finds requirements, decisions, and sources by id or text
- `file_decision` — Lets the agent file a decision doc mid-session
- `file_receipt` — Records commit, files, and summary when work completes

## Interactions & Behavior
- Set up connection → write file → healthy state + restart banner
- Fix path / Replace entry → targeted rewrite of the veri entry only → re-check → restart banner
- Copy actions → clipboard write + transient "✓ Copied" label; no side effects
- Re-run checks → re-evaluate all four checks from disk
- File watcher → external-edit banner + automatic re-check
- All hovers: buttons brighten (`filter:brightness(1.1)` on primary) or border lightens to `#3A3A44`; rows bg `#1B1B20`
- No loading spinners needed — all operations are local file reads/writes

## State Management
- `checks: { fileExists, entryPresent, executableFound, rootMatches }` — derived from disk on open, after every write, and on file-watch events; never cached as app state (files are the source of truth)
- `conflict: boolean` + the foreign entry's JSON — set when a `veri` key exists whose shape wasn't written by the app
- `wroteThisSession: boolean` — drives the restart banner
- `externallyModified: boolean` — drives the info banner, cleared on re-check
- Derived views: not-set-up = no file or no entry; conflict; healthy = all checks pass; broken = some fail

## Out of scope (do not build)
- Live client connection status of any kind
- Editing/displaying non-Veri servers in `.mcp.json`
- Running `claude mcp add` or restarting agent apps
- Building the server from the panel (explain + copy the build command only)
- Network calls

## Design Tokens
Colors — app bg `#0F0F11`; panel bg `#131316`; card bg `#151519`; code bg `#0F0F11`; borders `#1E1E24` / `#1F1F24` / `#26262C`; dividers `#1B1B20`; text primary `#E7E4DE`, body `#C9C6CF`, secondary `#A09DA6`, muted `#8B8893` / `#6E6B76`, faint `#55525E` / `#4A4852`; accent orange `#E8703A` (on-accent text `#141414`); success green `#7FAF8A`; warning amber `#D9A03F` (border `#3A3020`); info blue `#7EA6C4` (border `#1F2A33`).

Typography — UI: 'Source Sans 3' (400–700); code/ids/labels: 'JetBrains Mono' (400–600). Eyebrow labels: mono 10px, letter-spacing .1em, uppercase. h1 24px/600; card headings 16px/600; body 13.5px; captions 11.5–12.5px; code 11px.

Radii — cards 10px, inner blocks/buttons 7–8px, small actions 6px. No shadows on cards (flat dark UI); dropdowns elsewhere in the app use `0 12px 32px rgba(0,0,0,.5)`.

## Assets
None — no images or icon fonts. Glyphs are unicode text (`↻ ↺ ⟳ ✓ ! →`).

## Files
- `agent-connection.html` — full interactive prototype (open in a browser). Agent connection screen: `<!-- ===== AGENT CONNECTION ===== -->` block; logic: the `mcp*` section of the script. A `mcpScenario` prop (`notsetup | healthy | broken | external | conflict`) switches states for review.
