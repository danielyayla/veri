---
id: DEC-031
type: decision
title: "Node runtime handled by detect-and-guide; configs keep command \"node\""
status: proposed
created: 2026-08-17
updated: 2026-08-17
links:
  - id: WO-030
    rel: constrains
  - id: REQ-013
    rel: implements
  - id: DEC-011
    rel: builds-on
---

## Choice

Agent configs keep the [[DEC-011]] recognized shape — `{"command": "node", "args": [<server.js>, <project root>]}` — and the Node >= 20 dependency is **detected and guided, not removed**. At connection time (panel open, setup, and the [[WO-030]] verification affordance) the app probes the user's login shell — `$SHELL -l -c 'command -v node && node --version'` — because that is the environment a terminal-launched agent actually resolves `node` in, not the GUI app's own launchd PATH. A missing or too-old runtime is stated in the panel with install guidance **before** the user ever starts an agent session; the verification affordance goes further and performs a real MCP `initialize` handshake with the exact configured command, classifying failure as missing runtime, runtime too old, server path missing, or wrong project root.

Spike evidence (2026-08-17, this repo):

- `ELECTRON_RUN_AS_NODE=1 <Electron binary> server.js <root>` completes a full MCP session (initialize, tools/list, tools/call); the embedded Node is v22.22.0, so the escape hatch is real and stays available.
- The login-shell probe finds the user's Homebrew/nvm node even from a clean GUI-style environment (`env -i HOME=... $SHELL -l -c ...` → `/opt/homebrew/bin/node`, ~1.2s), where a naive `spawn('node')` from the app would see only launchd's bare PATH and false-negative.
- Update survival: the packaged server path (`Veri.app/Contents/Resources/app/node_modules/@veri/mcp/dist/server.js`) contains no version segment, and Squirrel.Mac replaces the .app in place, so a config written by version N still resolves after updating to N+1. asar is already disabled for exactly this ([[WO-028]]).

## Rejected alternatives

- **Config targets the app's own binary via `ELECTRON_RUN_AS_NODE`** (`{"command": "/Applications/Veri.app/Contents/MacOS/Veri", "env": {"ELECTRON_RUN_AS_NODE": "1"}, ...}`): proven to work by the spike, but it poisons the committed `.mcp.json` with a machine-specific absolute path and an `env` block — the file stops working for every teammate ([[REQ-005]]'s commit-and-share story), breaks [[DEC-011]] shape recognition everywhere it is enforced, breaks if the user moves or renames the app, and has no answer for repo-checkout installs where no packaged binary exists. Revisit only if detect-and-guide proves to be a wall in practice.
- **Bundle a standalone Node binary inside the app** for configs to target: same portability poison as above plus ~50 MB and a second runtime to patch, for no gain over the Electron binary the app already ships.
- **Probe `node` from the app's own environment** (no login shell): simplest, but the GUI app inherits launchd's PATH (`/usr/bin:/bin:...`), so every Homebrew/nvm/fnm install — i.e. nearly every real developer machine — would false-negative into scary wrong guidance.
- **Do nothing (status quo)**: [[REQ-013]] names the silent agent-time failure as the defect; keeping it is not an option.

## Rationale

The committed config is a contract with every machine that clones the repo, so it must stay portable — `node` on PATH is the only spelling that is. That rules out baking any machine's runtime path into the file and leaves the failure mode (no usable Node) to be caught where Veri can see it: at connection time, in the user's real shell environment, with a verification that exercises the true launch path end to end instead of inferring health from file existence.
