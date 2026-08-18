---
id: DEC-013
type: decision
title: Sessions launch via a temp .command in Terminal.app; TOML configs get a regex-scoped veri gate
status: active
approved: 2026-08-18
created: 2026-08-08
updated: 2026-08-18
links:
  - id: WO-011
    rel: decided-during
  - id: DEC-011
    rel: extends
---

## Choice

Two implementation choices made during [[WO-011]]:

1. **Launch mechanism.** "Start agent session" writes a throwaway
   `.command` script (`cd <project root> && exec <agent> <kickoff prompt>`)
   to the OS temp dir and opens it with `open -a Terminal`, detached. The
   session runs in the user's real terminal where they can see and drive
   it; Veri never runs an agent headless. macOS only for now — on other
   platforms the launch IPC returns an error and the UI steers to Copy
   kickoff prompt.
2. **Codex TOML gate.** Codex CLI keeps MCP servers in
   `~/.codex/config.toml`. Rather than adding a TOML parser dependency,
   Veri recognizes only the exact block it writes itself
   (`[mcp_servers.veri]` + `command = "node"` + a two-string `args`
   array), appends that block when no veri section exists, and treats any
   other veri section as a conflict it never modifies — [[DEC-011]]
   applied to a second format with the same "recognized shape or hands
   off" rule.

## Rejected alternatives

- **Embedded terminal / headless child process with captured output** —
  turns Veri into a session monitor, explicitly out of scope in REQ-007;
  also hides the session from the user's normal workflow.
- **AppleScript into Terminal/iTerm** — needs automation permissions and
  per-terminal-app scripting; the `.command` file works with the default
  handler and no prompts.
- **A real TOML parser (smol-toml etc.)** — a new dependency to support
  writes Veri deliberately restricts to one self-owned block; the regex
  gate is narrower and fails closed (anything unrecognized → conflict,
  never written).

## Rationale

Both choices stay honest at zero cost: the `.command` launch puts the
session in the user's real terminal with no automation permissions or
new dependencies, and the regex-scoped TOML gate extends the
"recognized shape or hands off" rule to a second format — anything
unrecognized becomes a visible conflict, never a rewrite.
