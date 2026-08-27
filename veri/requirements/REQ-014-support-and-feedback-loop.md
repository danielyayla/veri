---
id: REQ-014
type: requirement
title: "Support and feedback loop"
status: accepted
approved: 2026-08-27
created: 2026-08-17
updated: 2026-08-27
links:
  - id: SRC-012
    rel: derived-from
  - id: REQ-011
    rel: depends-on
  - id: DEC-002
    rel: constrained-by
---

Users of the installed app have one obvious, low-friction way to
report problems and give feedback, and the maintainer can diagnose
a report remotely. Veri ships no telemetry ([[DEC-002]] local-first
stance; reaffirmed in [[WO-028]]'s out-of-scope), so user reports
are the only signal that something is wrong in the field — the
loop must compensate by making reports easy to file and rich
enough to act on.

- **One channel.** GitHub Issues on the public repo is the support
  channel, with an issue template that captures app version and
  macOS version.
- **Reachable from the app.** A "Report an issue" affordance in
  the app opens a prefilled issue (version and OS included) so the
  user never hunts for where to complain.
- **Diagnosable.** Main-process and updater activity is logged to
  a known local file location, documented in troubleshooting, so
  "attach your log" is a possible support request. Update-check
  failures are silent by design ([[REQ-011]]); the log is the only
  place they are visible.
- **Private by default.** Logs stay on the user's machine and
  contain no knowledge-base content; nothing is transmitted
  anywhere except by the user attaching it themselves.

## Acceptance criteria

- [ ] Filing an issue from the installed app takes one action and
      arrives pre-populated with app version and OS version
- [ ] The repository presents an issue template that requests
      reproduction steps and the log file
- [ ] Updater and main-process events (including failed update
      checks) are readable from a documented local log path
- [ ] Logs contain no document bodies or knowledge-base content
- [ ] The no-telemetry stance is stated in user-facing docs
