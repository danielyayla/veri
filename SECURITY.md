# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately via GitHub:
**[Security → Report a vulnerability](https://github.com/danielyayla/veri/security/advisories/new)**.
Do not open a public issue for a security problem.

You can expect an acknowledgment within a week. Coordinated disclosure
is appreciated; you'll be credited in the advisory unless you prefer
otherwise.

## Scope

In scope: the Veri desktop app (macOS), the `veri` CLI, the MCP server,
and the Veri Check GitHub Action — in particular anything that lets a
crafted `veri/` directory or MCP request escape its project root, or
that compromises the app's update path.

Veri ships no telemetry and runs no server; there is no hosted service
to test. The app's auto-update feed and signed releases are part of the
attack surface and firmly in scope.

## Supported versions

Only the latest release receives security fixes. The app's built-in
updater keeps installs current.
