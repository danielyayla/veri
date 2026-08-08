# Handoff: Agent handoff actions (work-order context panel)

## Overview
Replaces the misleading "Serve via MCP" toggle on the work-order screen's
context panel with two real actions delivering [[REQ-007]]:

- **Copy kickoff prompt** — puts a short, agent-neutral instruction on the
  clipboard that tells any agent to fetch the context package over MCP.
- **Start agent session** — opens a picker of locally *detected* agents
  (Claude Code, Cursor, Codex CLI, Gemini CLI) and launches the chosen one
  in the project directory with the kickoff prompt pre-filled.

The design is provider-neutral by construction: the picker renders whatever
the agent adapter registry reports; adding an adapter adds a row, never new
UI. Web-only chat apps are never shown as launchable — they get a copy-only
row that steers to the kickoff prompt.

## About the Design Files
`agent-handoff.html` is a **design reference created in HTML** — a working
prototype of the context panel and picker, not production code. Recreate it
in `packages/ui` using the codebase's existing renderer conventions
(vanilla TypeScript `h()` views, per DEC-008/DEC-009). A `scenario` control
in the prototype switches picker states for review.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and copy are final and use
the app's existing dark-theme tokens (identical to the SRC-002 token sheet).

## Placement
Work-order screen, right-hand context panel (`panel-context`), directly
below the package card, replacing the current `pkg-buttons` row and the
`mcp-snippet` block.

Button row (`pkg-buttons`, unchanged 8px gap, buttons full-row stacked):
1. **Start agent session ▾** — primary: 34px tall, radius 7px, bg
   `#E8703A`, text `#141414` 13px/600. The `▾` (mono, 11px) signals a
   picker, not an immediate action.
2. **Copy kickoff prompt** — secondary: 30px tall, border `#26262C`,
   text `#A09DA6` 12.5px/500, hover border `#3A3A44`. On click, label
   flips to `✓ Copied` in `#7FAF8A` for ~1.8s (same pattern as existing
   copy button).
3. **Copy full package** — ghost text-button, mono 10.5px `#6E6B76`,
   right-aligned under the row; this is the renamed existing
   "Copy for agent" (it still copies the assembled package verbatim, for
   agents with no MCP at all). Hover `#A09DA6`.

The old "Serve via MCP" toggle and its snippet are **removed**. The
snippet's one useful piece — `via .mcp.json · connection settings →` —
moves into the picker footer.

## Kickoff prompt (exact template)
```
Implement <WO-ID> — <WO title>.
Before writing any code, fetch the full context package with the Veri
MCP tool: get_context("<WO-ID>"). Follow the linked decisions and stay
inside the work order's scope.
```
Plain text, no markdown, no provider names. Same template is used by the
copy action and as the launch prompt.

## Agent picker (popover)
Anchored below the primary button, width = panel width, radius 8px, bg
`#151519`, border `#26262C`, shadow `0 12px 32px rgba(0,0,0,.5)`. Opens on
click; closes on Esc, outside click, or launch. Header eyebrow
`START A SESSION IN` — mono 10px, letter-spacing .1em, `#6E6B76`.

Each adapter renders one **row** (padding 10px 12px, divided by `#1B1B20`,
hover bg `#1B1B20` when actionable):
- Agent name — 13px/500 `#E7E4DE`
- Mono detail line — 10.5px `#55525E` (see per-state content)
- Right-aligned action or status

### Row states (all four must be implemented)
1. **Detected & connected** (binary on PATH, veri entry present in that
   agent's MCP config): detail = binary path (e.g. `~/.local/bin/claude`);
   action chip **Launch** — 24px, bg `rgba(232,112,58,0.12)`, border
   `#3A2418`, text `#E8703A` 11px/600. Clicking launches immediately.
2. **Detected, not connected** (binary found, veri entry missing): detail =
   `mcp config: veri entry missing` in `#D9A03F`; action chip
   **Set up & launch** — amber treatment (bg `rgba(217,160,63,0.12)`,
   border `#3A3020`, text `#D9A03F`). Clicking writes the veri entry to
   that agent's config (DEC-011 recognized-entry gate; a conflicting
   foreign entry aborts and deep-links to the connection panel instead),
   then launches. No restart banner is needed — the launched session is
   new and reads config at start.
3. **Not installed** (binary not on PATH): row at 45% opacity,
   non-interactive; detail = `not detected on this machine`; right status =
   mono 10.5px `—`. Never hidden: seeing the roster is how users learn
   what Veri supports.
4. **Copy-only** (web chat apps): a single grouped row at the bottom,
   name `Web chat (ChatGPT, Claude.ai, …)`, detail = `can't be launched
   with a local MCP server`; action chip **Copy prompt** (secondary chip
   treatment, border `#26262C`, text `#A09DA6`). Copies the kickoff prompt
   and closes the picker with the button-level `✓ Copied` feedback.

### Picker footer
Single line, mono 10.5px `#55525E`, top border `#1B1B20`, padding 8px 12px:
`launches in <project root, ~-abbreviated> · connection settings →` — the
link in `#E8703A`, navigating to the existing agent-connection panel.

## Launch behavior
- Spawn the adapter's CLI **detached, in the user's default terminal app**,
  working directory = project root, kickoff prompt passed as the initial
  prompt argument per the adapter's launch template
  (e.g. `claude "<prompt>"`). Veri never runs the agent headless and never
  captures its output (out of scope: session monitoring).
- On successful spawn: close picker, append a session-log entry
  (`Started a <agent name> session`, existing `sessionLog` mechanism), and
  show a transient toast-style line under the button row — 11.5px
  `#7FAF8A`, `✓ Launched <agent> — check your terminal` — fading after 4s.
- On spawn failure: same line in `#D9A03F`:
  `Couldn't launch <agent> — <one-line reason>. Copy the kickoff prompt
  instead.` The picker stays open.

## States and Interactions
| Element | State | Behavior |
|---|---|---|
| Start agent session | hover | `filter: brightness(1.1)` |
| Start agent session | open | picker visible, `▾` flips to `▴` |
| Start agent session | no agents detected | button stays enabled; picker shows all rows in state 3 + copy-only row, plus an amber hint line: `No local agents detected — use Copy kickoff prompt with any agent.` |
| Copy kickoff prompt / Copy prompt chip | clicked | clipboard write, `✓ Copied` 1.8s, session-log entry `Copied the kickoff prompt` |
| Set up & launch | conflicting foreign entry | abort write, navigate to connection panel with the conflict card visible |
| Picker | Esc / outside click | closes, no side effects |

Detection runs when the picker opens (fresh from disk/PATH every time —
files are the source of truth, DEC-002; never cached as app state). All
operations are local; no spinners except a brief inline `launching…`
(mono 10.5px `#6E6B76`) replacing the chip while spawning.

## Accessibility
- Picker is `role="menu"`, rows `role="menuitem"`; not-installed rows
  `aria-disabled="true"`.
- Focus order: primary button → (open) first actionable row → … → footer
  link. Arrow keys move between rows; Enter activates; Esc closes and
  returns focus to the button.
- Copy feedback also sets an `aria-live="polite"` announcement
  ("Kickoff prompt copied").

## Edge cases
- Long project paths in the footer: middle-truncate with `…`, full path in
  `title`.
- Work order not in `backlog`: actions still work (re-handing off an
  in-progress WO is legitimate); no state gating.
- More adapters than fit: picker scrolls internally, max-height 320px.

## Out of scope (do not build)
- Live session status, output streaming, or agent monitoring after launch.
- Hosted-agent APIs or any network calls.
- Editing non-veri entries in any agent's MCP config.
- Auto-running builds or `claude mcp add`-style commands.

## Design Tokens
Identical to the SRC-002 token sheet (`design/agent-connection-handoff/README.md`
§ Design Tokens): app bg `#0F0F11`, card `#151519`, borders
`#1E1E24/#1F1F24/#26262C`, dividers `#1B1B20`, accent `#E8703A`
(on-accent `#141414`), success `#7FAF8A`, warning `#D9A03F` (border
`#3A3020`), text scale `#E7E4DE → #4A4852`. UI font 'Source Sans 3',
mono 'JetBrains Mono'. No new tokens are introduced.

## Files
- `agent-handoff.html` — interactive prototype of the context panel +
  picker (open in a browser). A `scenario` switcher (`mixed | all |
  none`) drives the three detection situations; every chip and copy
  action is clickable with real feedback states.
