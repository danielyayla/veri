---
id: DEC-084
type: decision
title: "Hero install surface leads with the DMG until the npm publish executes; the copyable command block ships with the publish"
status: active
approved: 2026-08-25
created: 2026-08-24
updated: 2026-08-25
links:
  - id: WO-084
    rel: constrains
  - id: DEC-077
    rel: follows-from
  - id: DEC-033
    rel: consistent-with
---

## Choice

Until the [[DEC-077]] npm publish actually executes (Daniel's scope
claim plus `NPM_TOKEN` plus a non-dry workflow run), the site's hero
install surface leads with the signed DMG — the one path that works
verbatim on a clean machine today — and carries **no command block**.
In its place, a plain-type platform sentence (`.dl-platforms`) sits
directly under the hero download sub-line telling non-Mac visitors
exactly what works for them now: the `veri check` CI gate on any
platform, and the CLI/MCP server from a source checkout on Node 20+,
explicitly "not yet on npm". The same sentence appears in the
quickstart prerequisites and, harmonized, in the homepage fin.

The copyable hero command block (`npm install -g @veri/cli` /
`npx @veri/cli check`, with a clipboard affordance under the no-build
rule) ships in the same change that flips the packages live on the
registry — whoever executes the DEC-077 publish also lands the hero
command, so the command and the registry state can never disagree.
Quickstart step 1 flips to lead with the command-line install at that
same moment.

## Rejected alternatives

- **Show the npm command now, labeled "coming soon"** — advertises an
  install path that fails verbatim today (`npm error 404`, checked
  2026-08-24), violating WO-084's own out-of-scope line ("claiming an
  install path before it actually works on a clean machine") and its
  acceptance test 4. A grayed-out command in a hero still reads as an
  instruction.
- **Hero command block showing the source checkout
  (`git clone … && npm install && npm test`)** — works verbatim only
  with git and Node ≥ 22.18 present, is a developer build rather than
  an install, and puts a four-step toolchain command in front of the
  evaluator audience the hero exists for. The source path stays where
  it belongs: the README's "Installing the CLI" section, which the
  platform sentence links.
- **Hero command block showing the CI action snippet
  (`- uses: danielyayla/veri@v1`)** — the one command-shaped thing
  that works on any platform today, but it is workflow YAML, not an
  install command; it belongs on the CI gate page, which the platform
  sentence links instead.
- **Ship the command block markup hidden/commented for later
  activation** — dead code in a hand-authored no-build site
  ([[DEC-033]]); the block is a few lines to add when it becomes
  true.

## Rationale

WO-084's acceptance test 1 anticipates exactly this state: when no
command-line install exists, the hero states the DMG path plainly and
the test is re-scoped in a receipt. [[DEC-077]] is active but chose a
path whose execution is gated on human acts; between approval and
execution the shipped reality is app + action + source, and the site
must match shipped reality, not approved intent (acceptance test 4).
Coupling the hero command to the publish commit is the only ordering
in which no visitor can ever copy a command the registry will refuse.
The platform sentence, meanwhile, closes SRC-041's critical finding
#2 today: a Linux or Windows developer now finds an explicit,
truthful statement of what they can use within the first viewport,
instead of silence.
