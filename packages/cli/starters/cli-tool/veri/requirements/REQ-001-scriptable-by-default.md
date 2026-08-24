---
id: REQ-001
type: requirement
title: Scriptable by default
status: draft
created: 0001-01-01
updated: 0001-01-01
---

The tool behaves like a good citizen of a pipeline. Someone who has
never read the docs can wire it into a shell script and trust the
result: exit codes mean what they always mean, results go to stdout,
diagnostics go to stderr.

## Acceptance criteria

- [ ] Exit code 0 exactly when the command succeeded; distinct nonzero
      codes for the failure classes the docs name
- [ ] Result output goes to stdout; progress, warnings, and errors go
      to stderr — piping stdout never captures diagnostics
- [ ] Output intended for machines is stable: scripts written against
      it do not break on a patch release
- [ ] No color codes or spinners when stdout is not a terminal
