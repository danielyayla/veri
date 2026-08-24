---
id: REQ-003
type: requirement
title: Authentication and session lifecycle
status: draft
created: 0001-01-01
updated: 0001-01-01
---

Signing in, staying signed in, and signing out behave predictably and
safely. Session handling is where web apps quietly accumulate risk;
this requirement makes the lifecycle explicit so every change to it is
deliberate.

## Acceptance criteria

- [ ] The session mechanism is documented here: where the session
      lives, how long it lasts, and what invalidates it
- [ ] Sign-out invalidates the session server-side, not just in the
      browser
- [ ] Authentication-sensitive actions (password change, email change,
      deletion) re-confirm the user's identity
- [ ] Session and authentication changes always get human review
      before merge
