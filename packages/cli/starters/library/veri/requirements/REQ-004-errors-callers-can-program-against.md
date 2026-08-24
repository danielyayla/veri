---
id: REQ-004
type: requirement
title: Errors callers can program against
status: draft
created: 0001-01-01
updated: 0001-01-01
---

Failure is part of the API. A caller can distinguish this library's
failure modes in code — by type, code, or documented shape — and react
to each one differently, without parsing prose messages that a patch
release might rewrite.

## Acceptance criteria

- [ ] Each documented failure mode is distinguishable in code, and the
      distinguishing key (type or code) is part of the stable surface
- [ ] Error messages are for humans and may improve freely; nothing in
      the docs tells callers to match on message text
- [ ] Failure modes appear in each public export's documentation
      alongside its return value
- [ ] Tests assert the error contract the same way they assert return
      values
