---
id: REQ-004
type: requirement
title: Safe when non-interactive
status: draft
created: 0001-01-01
updated: 0001-01-01
---

The tool never hangs a pipeline waiting for a human. In CI, in cron,
or behind a pipe, every command either completes with the information
it has or fails fast with an error naming the missing input — no
hidden prompts, no surprise destructive defaults.

## Acceptance criteria

- [ ] When stdin is not a terminal, no command waits for interactive
      input; anything that would have prompted fails with the flag
      that supplies the answer
- [ ] Destructive operations require an explicit flag to proceed
      without confirmation
- [ ] The full test suite exercises the tool exactly as CI runs it:
      non-interactive, no terminal
