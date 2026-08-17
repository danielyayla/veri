---
id: REQ-011
type: requirement
title: Installable, self-updating desktop app distribution
status: accepted
approved: 2026-08-17
created: 2026-08-17
updated: 2026-08-17
links:
  - id: REQ-004
    rel: depends-on
  - id: DEC-008
    rel: constrained-by
---

Veri reaches users as an installable desktop application, not a dev
checkout. Today the UI runs only via `electron .` from a cloned repo;
the people who have installed Veri have no path to receive fixes
short of a manual download and reinstall. While the app is under
active development with frequent releases, that path must be:

- **Automatic** — the installed app detects that a newer version has
  been published and brings itself current; the user never hunts for
  a download.
- **Consensual** — an update is applied only on user consent (restart
  now) or at a natural boundary (next quit). A running session, and
  any editor state in it, is never interrupted by an update.
- **Trustworthy** — installed and updated artifacts are signed (and
  on macOS notarized) so the OS verifies their origin; users never
  train themselves to bypass Gatekeeper-style warnings.
- **Cheap to ship and to receive** — publishing a release is a single
  versioned action for the maintainer, and frequent small updates
  download incrementally rather than as full artifacts.
- **Failure-tolerant** — no network, or an unreachable release feed,
  degrades to "no update this time" with the app fully usable;
  update checking never blocks or breaks launch.

The knowledge base stays local-first per [[DEC-002]]: the release
feed is the only network dependency this requirement introduces, and
it is touched only to check for and fetch updates.

macOS is the first platform; the requirement extends to any platform
Veri is later distributed on.

## Acceptance criteria

- [ ] A user with no dev tooling installs Veri from a published,
      signed artifact on a clean machine and the OS accepts it
      without warnings or overrides
- [ ] When a newer version is published, an installed app running the
      older version becomes current without the user downloading or
      reinstalling anything manually
- [ ] Updates apply only on explicit consent or on quit; an open
      session is never force-restarted
- [ ] Launching offline or with the release feed unreachable behaves
      identically to up-to-date, with no error surfaced
- [ ] The running app version is visible in the UI, and matches the
      published release it came from
