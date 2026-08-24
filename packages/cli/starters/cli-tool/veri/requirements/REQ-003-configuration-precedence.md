---
id: REQ-003
type: requirement
title: Configuration precedence is documented and boring
status: draft
created: 0001-01-01
updated: 0001-01-01
---

When the same setting can come from several places, the order is
fixed, documented, and free of surprises: command-line flags override
environment variables, which override the config file, which overrides
built-in defaults. No setting behaves differently.

## Acceptance criteria

- [ ] The precedence order (flags > environment > config file >
      defaults) is stated in the docs and holds for every setting
- [ ] The config file's location and format are documented, and a
      malformed file produces an error naming the file and line — the
      tool never silently falls back to defaults
- [ ] There is a way to see the effective configuration and where each
      value came from
