---
id: SRC-064
type: source
title: "Observed — the format-4 bump closed the whole MCP surface to a session already running, mid-session"
status: imported
kind: investigation
created: 2026-08-28
updated: 2026-08-28
links:
  - id: WO-131
    rel: outcome-of
  - id: REQ-015
    rel: supports
  - id: DEC-030
    rel: derived-from
  - id: DEC-125
    rel: informed-by
---

First-hand record of what happened when the format-4 bump landed
underneath a Claude Code session that was already running. Filed as
evidence rather than as a bug: nothing malfunctioned. The guard did
exactly what [[REQ-015]] specifies, and the cost of it doing so is the
finding.

## What happened

The session had just finished implementing the skill library — ten
work orders, of which [[WO-131]] added the `method` document type and
bumped `CURRENT_FORMAT` 3 → 4 (`5fb8119`, 2026-08-27 22:09). Later the
same session installed the nine skill shells and tried to run one.

Two attempts, two refusals, for two different causes:

1. **`veri:health` refused on `requires:`.** Its five required tools
   include `list_documents`, `get_queue` and `get_receipts`, all added
   by later work orders in the same batch. The connected server did not
   expose them. The gate named the missing tools and stopped, which is
   the [[DEC-125]] behaviour — refuse, do not degrade.

2. **`veri:decide` refused on the format.** Its four required tools
   were all present, so tool presence was not the binding constraint.
   Every call returned the same sentence:

   > this project uses veri format 4, but this Veri understands only up
   > to format 3 — update Veri to open it

   `run_check` returned it too. The refusal is not per-tool: `guardFormat()`
   runs at the top of every handler in `packages/mcp/src/server.ts`, so a
   newer-format project closes the entire surface at once.

## What was verified

- `veri/format` contains `4`.
- `packages/mcp/dist/` was rebuilt at 23:46, after the 22:09 bump —
  `enumerate.js`, `receipts.js` and `init.js` are present. **The build on
  disk was current.** The stale thing was the *process*: a Node server
  started earlier in the session, holding the format-3 code in memory.
- The terminal CLI was unaffected — `npx veri check` resolved a current
  build and reported 388 documents, 0 issues, 18 advisories. Nothing
  about the repository looked wrong from the terminal, which is why the
  lockout was invisible until an MCP tool was actually called.
- `guardFormat()` re-classifies on **every call**, deliberately, so the
  marker can change under a running server (its comment names a
  migration or a `git pull` as the cases). That per-call freshness is
  what makes the lockout instantaneous rather than deferred to restart.

## What it means

**The guard passed its own acceptance test on a live case.** [[WO-131]]
required that a format-4 project read by a format-3 reader "reports the
format, not invalid frontmatter". That is precisely what happened, on a
real stale reader rather than a fixture. [[REQ-015]]'s "Checked." clause
is satisfied and needs no amendment.

**The blast radius is wider than the record says.** `RELEASING.md`'s
format-bump checklist frames the bump as something to get right *before
a release*, and its worked example is the installed 0.2.1 app misreading
`ready` work orders — an **installed** reader that is behind. This case
had no release in it at all. The bump landed on `main` and stranded a
reader in the same working tree, seconds later, whose source code was
already correct. A format bump is breaking for every **running** reader,
not only every installed one, and nothing in the record says so.

**The refusal sentence is wrong for this case, in a way that costs
time.** "update Veri to open it" is correct advice for a released app.
Here the update had already happened; the repair was a restart. A
maintainer following the message literally would rebuild something that
was not stale and still be locked out. The message names one of the two
repairs, and not the one that applied.

**Order matters when a batch both bumps the format and adds tools.** The
two refusals arrived in that order by accident, and the second masked
the first: once the format guard closes, a missing-tool diagnosis is
unreachable, because the tool that would report it is closed too.

## Limits of this record

One session, one host (Claude Code), one transport (stdio). Whether
other MCP hosts surface the refusal as legibly, and whether any of them
restart a server without being told to, was not tested.
