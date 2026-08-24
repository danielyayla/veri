---
id: DEC-082
type: decision
title: "Per-platform signing posture: Windows Authenticode deferred with a stated SmartScreen caveat; Linux ships unsigned per platform norm; minisign covers the updater everywhere"
status: proposed
created: 2026-08-24
updated: 2026-08-24
links:
  - id: WO-092
    rel: constrains
  - id: REQ-030
    rel: satisfies
  - id: DEC-065
    rel: builds-on
  - id: DEC-063
    rel: follows-from
---

## Choice

Code signing is decided per platform, and every gap is stated rather than
papered over:

- **macOS (unchanged):** Developer ID signing plus notarization, exactly as
  the pipeline already does. This posture is not revisited here.
- **Windows: Authenticode signing is deferred.** The NSIS installer ships
  unsigned. Microsoft Defender SmartScreen will warn on first install
  ("Windows protected your PC"), and the caveat is documented wherever the
  artifact is offered: the release notes (the pipeline's SIZES.md carries an
  update-channels section naming it) and the site's download surface once
  Windows builds exist in a published release. Deferral is revisited when
  install friction shows up in practice — a user report, or a distribution
  channel (winget) that requires a signature.
- **Linux: no code signing, by platform norm.** Neither AppImage nor .deb
  has a Gatekeeper/SmartScreen equivalent; mainstream Linux distribution
  signs at the package-manager/repository layer (apt repo GPG), which only
  becomes relevant if an apt repository is ever stood up — a distribution
  channel owned by [[WO-081]]'s decision, not this one. Shipping unsigned
  binaries on GitHub Releases is what the platform's users expect.
- **The updater trust chain is platform-independent and non-negotiable:**
  every updater artifact on every platform carries the minisign signature
  ([[DEC-065]]) that the installed app verifies before installing. The
  release workflow refuses to build on any platform without
  `TAURI_SIGNING_PRIVATE_KEY`. OS-level signing governs first install
  friction only; update integrity never depends on it.

## Rejected alternatives

- **Buy an Authenticode certificate now (OV, ~$100–400/yr)** — an OV
  certificate no longer silences SmartScreen by itself: since Microsoft's
  2023 policy changes, reputation accrues per-file/per-publisher over
  download volume, so early installs of a low-volume tool warn anyway.
  Recurring cost plus CI key-handling for a warning that mostly remains.
- **Buy an EV certificate or Azure Trusted Signing (~$300–700/yr, or
  ~$10/mo with eligibility hurdles)** — EV's instant SmartScreen reputation
  is the real fix, but it requires hardware-token or cloud-HSM signing
  wired into CI and an organization-verification process; Trusted Signing
  requires a Microsoft-verifiable legal identity (and its individual tier
  has waitlisted). Disproportionate standing cost and process for a
  pre-1.0 tool with no Windows install base yet; exactly the deferral this
  decision records, revisitable on evidence of friction.
- **Self-signed Authenticode certificate** — silences nothing (SmartScreen
  treats it as unsigned or worse), adds a false sense of coverage, and
  trains users to trust an unverifiable publisher name. Worthless.
- **Hold Windows builds until signing is solved** — REQ-030 exists because
  non-Mac developers currently get nothing; a warned install with a
  documented caveat beats no artifact. The WO's own framing: an unsigned
  NSIS installer with a documented SmartScreen caveat beats silence.
- **Sign Linux artifacts with a detached GPG signature on the release** —
  no mainstream verification path for end users of a GitHub-Releases
  download; the minisign updater signature already covers update
  integrity, and first-download integrity on GitHub rides TLS + the
  release page, same as every peer tool. Ceremony without a consumer.

## Rationale

The costs that matter are asymmetric. On macOS, an unsigned app is
effectively uninstallable for normal users (Gatekeeper), so signing is
table stakes and already done. On Windows, the honest accounting is:
an unsigned installer costs each first-time user one SmartScreen
click-through, while making that warning actually disappear costs an EV
certificate or Trusted Signing enrollment — hundreds of dollars a year
plus identity-verification and CI-HSM plumbing — because a cheap OV
certificate no longer buys quiet installs. For a tool with zero current
Windows users, that trade is clearly deferral, provided the caveat is
stated where the download is offered, which this decision makes a
requirement rather than a hope. On Linux there is nothing to defer: the
platform has no install-time signature check to satisfy, and the layer
where signing does exist (package repositories) belongs to a distribution
channel this project has not adopted. What must never be platform-relative
is update integrity, and it is not: the minisign-signed updater feed
([[DEC-065]]) is enforced by the workflow on every platform, so a
machine-in-the-middle cannot ride the auto-updater regardless of the
OS-level signing story.
