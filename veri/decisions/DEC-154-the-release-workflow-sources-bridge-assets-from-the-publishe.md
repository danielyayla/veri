---
id: DEC-154
type: decision
title: "The release workflow sources bridge assets from the published v0.1.8 release, gated by the pinned sha512"
status: proposed
created: 2026-09-02
updated: 2026-09-02
links:
  - id: WO-165
    rel: constrains
  - id: DEC-064
    rel: refines
---

## Choice

The WO-165 attach step downloads Veri-0.1.8-universal-mac.zip, its .blockmap, and latest-mac.yml from the published v0.1.8 GitHub release at tag-build time, verifies the zip's sha512 against the value pinned inside the fetched latest-mac.yml before attaching anything, and attaches all three to the draft release the workflow creates. The v0.1.8 release is the single immutable origin — no asset is ever copied forward from an intermediate release.

## Rejected alternatives

- **Commit the assets into the repo** — ~200 MB of frozen binary in git history; every clone pays for three files that change never, and the repo becomes the second source of truth for artifacts GitHub Releases already hosts.
- **Git LFS** — a new infrastructure dependency (LFS quota, CI credentials) for exactly three files that will one day be deleted, not maintained.
- **Copy from the previous release instead of v0.1.8** — a copy-of-a-copy chain: one corrupted or manually mangled release propagates forever, and provenance becomes "whichever release came before" instead of the artifact DEC-064 actually shipped.
- **CI cache** — caches evict and are scoped per-branch; a cache miss on a release tag would silently rebuild nothing and fail late, or worse, attach nothing.

## Rationale

v0.1.8 is the terminal Electron release ([[DEC-064]]) and GitHub release assets are immutable once published, so fetching from the origin gives every future release byte-identical bridge files with provenance the record already names. The sha512 inside latest-mac.yml is what electron-updater itself verifies on the user's machine, so gating the attach on that same value means CI proves exactly the property the installed base depends on — a transport corruption or a substituted asset fails the job instead of shipping.

Revisit when the 0.1.x install population reaches zero and the bridge retires (the future decision DEC-064 and WO-165 both defer): the attach step and this sourcing rule are then deleted together, not maintained.
