---
id: REQ-002
type: requirement
title: Errors name the fix
status: draft
created: 0001-01-01
updated: 0001-01-01
---

Every error message tells the user what to do next. A CLI's error
output is its support channel: "invalid argument" costs a user ten
minutes; "unknown format 'ymal' — did you mean 'yaml'?" costs them
one second.

## Acceptance criteria

- [ ] Every user-triggerable error states what went wrong and the
      concrete next step (the flag to add, the file to create, the
      command to run)
- [ ] Misusing a command prints its usage line, not a stack trace
- [ ] `--help` on every command shows synopsis, flags with defaults,
      and at least one example invocation
- [ ] Internal failures (bugs) say so and where to report them,
      instead of masquerading as user error
