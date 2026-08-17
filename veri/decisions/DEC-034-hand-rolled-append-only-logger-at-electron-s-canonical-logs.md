---
id: DEC-034
type: decision
title: "Hand-rolled append-only logger at Electron's canonical logs path"
status: proposed
created: 2026-08-17
updated: 2026-08-17
links:
  - id: WO-031
    rel: constrains
  - id: REQ-014
    rel: implements
  - id: DEC-002
    rel: extends
---

## Choice

Main-process and updater logging is a hand-rolled module (`packages/ui/src/lib/log.ts`): plain line-oriented appends — ISO timestamp, level, message — to `main.log` inside Electron's canonical logs location, pinned explicitly to `~/Library/Logs/Veri/` via `app.setAppLogsPath` (the default derives the directory from package.json's `name`, which would scatter it under `Logs/@veri/ui/`). Rotation is a size cap checked on every append: past 512 KB the file is renamed to `main.old.log` (replacing any previous one) and a fresh file starts, so disk use is bounded at ~1 MB and the tail of history survives rotation. The logger is pure Node with an injectable directory, so rotation and formatting are unit-testable without Electron; `main.ts` wires it to the real path. electron-updater's pluggable `logger` property takes an adapter over the same module, which makes update-check failures — silent in the UI by design (REQ-011) — visible in the log. Logged: app lifecycle, update-check outcomes including errors, MCP-config writes (action and path only). Never logged: document bodies, titles, or any knowledge-base content.

## Rejected alternatives

- **electron-log** — the standard choice and what electron-updater's
  docs suggest, but it brings renderer IPC transports, remote logging
  hooks, scope/catch-errors machinery, and its own config surface for
  what [[WO-031]] needs: append a line, cap the size. The repo's
  posture ([[DEC-033]], [[DEC-029]]) is to hand-author where the need
  is small.
- **Console/stdout only** — invisible in a packaged .app launched
  from Finder; nothing for a user to attach to an issue, which is the
  whole point ([[REQ-014]]).
- **macOS unified logging (os_log / Console.app)** — a platform API
  whose output is awkward for users to extract and attach; a plain
  file the troubleshooting page can name by path wins.
- **Date-based rotation (daily files)** — unbounded file count
  without a reaper; a size cap with one `.old` file is strictly
  simpler and satisfies the acceptance test directly.

## Rationale

The log exists for exactly one flow: a user hits a problem, support
says "attach your log", and the file at a documented path contains
what the UI deliberately did not show ([[REQ-011]]'s silent update
failures above all). A dependency-free appender keeps that flow
auditable end to end — every line written is grep-able in one small
source file, which is also how the "no knowledge-base content in
logs" guarantee ([[DEC-002]]'s privacy posture) stays reviewable.
Electron's own logs path means zero configuration and the place a
macOS user's muscle memory (and every support guide) already looks.
