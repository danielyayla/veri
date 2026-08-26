---
id: WO-001
type: work-order
title: UI work with a dangling design link
status: in-progress
claimed_by: session-a
claimed_at: 2026-08-01
created: 2026-08-01
updated: 2026-08-01
links:
  - id: REQ-001
    rel: implements
  - id: SRC-999
    rel: designed-by
binds:
  paths:
    - packages/ui/src/**
---

## Summary

Adds a panel to the app; the designed-by link points at nothing.
