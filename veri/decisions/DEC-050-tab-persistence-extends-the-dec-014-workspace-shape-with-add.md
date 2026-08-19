---
id: DEC-050
type: decision
title: "Tab persistence extends the DEC-014 workspace shape with additive optional fields, version unchanged"
status: active
approved: 2026-08-19
created: 2026-08-19
updated: 2026-08-19
links:
  - id: WO-054
    rel: constrains
---

## Choice

The DEC-014 workspace-state entry per project gains two additive optional fields: `tabs?: { target: string; preview: boolean }[]` (one entry per open tab — its *current* target and preview flag only) and `active?: number` (index of the active tab). The file version stays 1. The loader tolerates absence (a pre-existing file behaves exactly as before), silently drops malformed rows and junk indices, and a missing or corrupt file still starts clean. Restore is a pure load-time twin of `retainTabs`: unresolvable targets (byId miss or retired ViewKey such as 'graph'/'board'/'decisions') are dropped, duplicate view tabs collapse to the first, at most one tab keeps the preview flag, each restored tab starts with single-entry history, and the active index maps to the nearest earlier survivor. Saves ride the existing `saveWorkspace` funnel, fired from `applyTabs`, fire-and-forget.

## Rejected alternatives

- **Persisting full history stacks (entries + index + scroll) per tab** — violates SRC-018's central clause ("history is session state, in memory only"), bloats a file meant to stay small and hand-inspectable, and multiplies the unresolvable-target surface at load time.
- **Bumping the file version to 2** — a version bump forces migration logic for a purely additive change; an older app reading a v1 file with the new fields already ignores them, and a new app reading an old file behaves exactly as today, so versioning buys nothing but churn.
- **A separate tabs file (or per-project tab files) in userData** — spreads workspace state across files against the DEC-014 single-file precedent, and tabs change on the same gestures that already save pins/recents, so a second write path would just race the first.
- **Rejecting (rather than normalizing) files with multiple preview tabs or duplicate views** — workspace state is disposable navigation convenience; DEC-014 already establishes that tolerating and cleaning beats failing.

## Rationale

SRC-026 fixes "tabs lost on project switch" (SRC-016 finding 4) by persisting the open set, not the trail: the Obsidian model. The tab set is exactly the kind of per-project, never-in-veri/ navigation state DEC-014 built the workspace file for, and additive optional fields keep every existing reader and writer correct without migration. Deriving restore rules from the same predicate family as retainTabs means retirement of a view key (as with 'graph' and 'board') automatically restores those tabs away with no migration code.
