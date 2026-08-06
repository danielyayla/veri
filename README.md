# Veri

Veri keeps a project's requirements, decisions, and work orders as linked
markdown files, and hands a coding agent a complete context package for any
task over MCP. This repo is self-hosted: Veri is built by executing Veri
work orders (see [veri/](veri/)).

## Packages

- `@veri/core` — parse, validate, and graph a `veri/` directory
- `@veri/cli` — the `veri` binary: `init`, `new`, `check`, `list`
- `@veri/mcp` — stdio MCP server: `get_context`, `search`, `file_decision`, `file_receipt`

## Development

```bash
npm install
npm test        # builds all packages, then runs every test suite
```

Development requires Node >= 22.18 (native TypeScript type stripping, see
DEC-004); published output targets Node >= 20.

## Configuring the MCP server in Claude Code

The server is stdio-based and serves one project: pass the project root
(the directory containing `veri/`) as its argument.

From a checkout of this repo, after `npm install && npm test`:

```bash
claude mcp add veri -- node /path/to/veri/packages/mcp/dist/server.js /path/to/your/project
```

Or add a project-scoped `.mcp.json` next to your `veri/` directory:

```json
{
  "mcpServers": {
    "veri": {
      "command": "node",
      "args": ["/path/to/veri/packages/mcp/dist/server.js", "."]
    }
  }
}
```

(This repository's own [.mcp.json](.mcp.json) does exactly that.)

The server exposes four tools:

- `get_context(id)` — context package for a work order: project
  conventions (CLAUDE.md), the work order, all transitively linked
  requirements and active decisions (2 hops), source excerpts; superseded
  decisions are named as already rejected, bodies omitted; per-document
  and total token estimates
- `search(query)` — case-insensitive substring match over id, title, body
- `file_decision(title, choice, …)` — record a decision with the next
  free DEC id, `status: active`
- `file_receipt(work_order_id, commit, files, summary)` — append a
  work-session receipt to a work order; receipts accumulate, never
  overwrite
