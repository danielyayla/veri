---
id: DEC-051
type: decision
title: "The new-project picker reports an existing folder instead of opening it, and switchProject carries the notice"
status: proposed
created: 2026-08-19
updated: 2026-08-19
links:
  - id: WO-058
    rel: constrains
---

## Choice

`veri:new-project-pick` returns `{ kind: 'existing', dir }` when the picked folder already holds `veri/`, instead of calling `pointAppAt` from inside the handler. The renderer routes that result through `guardDirtyReload` and, on proceed, the existing `veri:switch-project` channel — which gains an optional second argument `notice?: 'existing'` that `pointAppAt` forwards as the reload query param, so the post-reload "veri/ was already here, nothing was written" message is unchanged. `NewProjectPick` shrinks to `null | existing | new`: the `opened` and `error` variants had no remaining producer (open errors now surface through the switch call's own error return, the same `projectError` surface as before).

## Rejected alternatives

- **A dedicated `veri:open-existing-pick` IPC channel** — a second channel whose body would be `pointAppAt(dir, 'existing')`, i.e. exactly `switch-project` plus one query param; a parameter on the existing channel is less surface for the same behavior.
- **Tracking dirty state in the main process and asking before `pointAppAt`** — dirty-ness lives in renderer buffers (DocEdit, template islands); mirroring it across IPC just to ask a question the renderer can already ask inverts ownership and adds a synchronization surface that can lie.
- **Keeping the retired `opened`/`error` variants in `NewProjectPick` for version-skew tolerance** — nothing produces them after this change; dead union members read as reachable contract. The renderer already tolerates `null`/`undefined`, and main/preload/renderer ship together in the packaged app.

## Rationale

WO-054's guard works because the renderer decides to reload — `guardDirtyReload` wraps the call that triggers `pointAppAt`. The picker's existing-folder path broke that pattern by letting the main process reload unilaterally, which is why it could not be guarded in place. Moving the decision (not the mechanism) to the renderer restores the one pattern every reload path now shares: the renderer guards, then asks main to point the app. Reusing `switch-project` keeps one funnel for "open this project directory" and confines the delta to a notice parameter that only affects the reload's query string.
