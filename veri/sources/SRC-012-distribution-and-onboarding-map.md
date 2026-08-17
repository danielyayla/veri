---
id: SRC-012
type: source
title: "Distribution and onboarding map"
status: imported
created: 2026-08-17
updated: 2026-08-17
links:
  - id: REQ-011
    rel: builds-on
---

Planning-session map (2026-08-17) of the complete distribution and
onboarding experience: from a stranger discovering Veri, through
download, install, first project, agent connection, and learning the
workflow, to staying updated and reporting problems. Captured as the
evidence base for the draft requirements [[REQ-012]] (website and
user documentation), [[REQ-013]] (first-run onboarding and agent
connection verification), [[REQ-014]] (support and feedback loop),
and [[REQ-015]] (knowledge-base format versioning).

Ground truth at time of writing: [[WO-028]] has built and locally
verified the release pipeline — electron-builder DMG+ZIP+blockmaps,
electron-updater with consensual restart, tag-triggered CI publishing
to GitHub Releases ([[DEC-028]], [[DEC-029]]) — but no signed
artifact has shipped (Apple credentials pending) and no user-facing
material exists outside the developer README.

## The journey, stage by stage

### 1. Discovery — website and positioning

Nothing exists. Needed: a landing page that answers what Veri is,
who it is for, and why it beats prompting an agent directly — shown
via the real loop (file a work order → agent pulls the context
package → receipt lands), not described abstractly. Hosting is a
decision to file (GitHub Pages from the public repo fits the
zero-infrastructure pattern of [[DEC-029]]). The download link
should be a stable pointer at the latest GitHub Release. Before
going public: a naming/trademark/domain check on "Veri".

### 2. Releases and versioning

Pipeline built. Open items: adopt semver with an explicit 0.x
stance (1.0 reserved for a stable `veri/` format); verify the
running version is visible in the app (open [[REQ-011]] criterion);
establish release-notes discipline — GitHub Release notes are the
changelog, and possibly surface in the update dialog. The unowned
risk: [[WO-028]] explicitly punted versioning of the `veri/`
knowledge-base format itself → [[REQ-015]].

### 3. Signing, notarization, first release

The hard blocker. Wiring exists; credentials do not. Checklist:
Apple Developer Program enrollment, Developer ID Application
certificate, notarytool credentials as CI secrets, push the first
tag, then verify the remaining [[WO-028]] acceptance boxes on a
clean Mac (Gatekeeper-clean install, real N→N+1 differential
update, Later-installs-on-quit).

### 4. Installation and first launch

DMG drag-to-Applications is done. Gap: what a brand-new user with
no project sees. Today's launch path is MRU-or-folder-picker
([[WO-027]]); a first-run experience needs a designed path into
creating a project or opening a bundled sample ([[DEC-007]]'s
demo-as-real-files is a ready-made candidate). Empty states across
home view, sidebar, and connection panel are where onboarding
actually happens. UI work → design gate ([[DEC-012]]).

### 5. Connecting the AI agent — make-or-break

Veri is worthless until an agent is connected, and this step has
the most external moving parts:

- **Node dependency.** The connection panel writes MCP configs of
  the shape `{command: "node", args: [server.js, projectRoot]}`
  ([[DEC-011]]). The packaged app bundles server.js, but the agent
  spawns it with the user's own `node` — a machine without Node
  >= 20 gets a silently broken connection. Options to weigh in a
  DEC: detect-and-guide, point configs at the Electron binary via
  ELECTRON_RUN_AS_NODE, or bundle a standalone runtime.
- **Path stability across updates.** Configs embed an absolute path
  into the installed bundle; verify it survives Squirrel.Mac
  updates and that configs written by version N still work after
  N+1.
- **Verification.** Users need a way to know the connection works —
  a test-connection affordance in the panel, plus per-agent doc
  pages (what gets written, where, how to check).

### 6. Learning the Veri workflow

The deepest onboarding challenge is the method, not the app.
[[DEC-019]]'s scaffolded workflow document teaches agents;
humans need layered docs: a 10-minute quickstart (install → create
project → connect agent → file one work order → watch the agent
use it), a workflow guide (concepts and why), and reference
(document types, frontmatter, link rels, templates, `veri check`
rules). The quickstart matters most; the bundled demo doubles as
its worked example.

### 7. Staying updated

Essentially done in [[WO-028]]. Remaining: verify real-feed
acceptance boxes after release one; decide whether the update
dialog shows release notes. Staged rollouts/channels stay out of
scope; document "roll back = re-download the old DMG" in
troubleshooting.

### 8. Troubleshooting, issues, feedback

Nothing exists. Minimum loop: GitHub Issues as the single channel
with a template capturing app + macOS version; an in-app "Report an
issue" item opening a prefilled issue URL; a decided location for
main-process/updater logs so "attach your log" is possible (update
failures are silent by design, so logs are the only remote
diagnostic). No telemetry is the standing stance ([[DEC-002]],
[[WO-028]] out-of-scope) — market it, and accept that issues are
the only signal.

### 9. Loose ends before public

No LICENSE file in the repo root (public repo without one is
all-rights-reserved); a short privacy statement (app contacts
GitHub Releases for updates, nothing else); README currently leads
with dev setup and should lead with the download once one exists.

## Suggested sequence

1. Finish [[WO-028]] — credentials, first tagged release, remaining
   acceptance boxes. Everything gates on this.
2. Node-runtime decision for the MCP connection (proposed DEC).
3. First-run experience + connection verification ([[REQ-013]]),
   design-gated.
4. Website + quickstart docs ([[REQ-012]]).
5. Support loop ([[REQ-014]]).
6. Knowledge-base format versioning ([[REQ-015]]) — file now,
   implement before format changes ship to strangers.
