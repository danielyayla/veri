# Veri

A knowledge base your coding agents read — requirements, decisions, and
work orders as plain markdown files living in your repo. Veri hands an
agent a complete context package for any task over MCP, and everything
the agent writes back lands in files you review.

**[Download Veri for macOS](https://github.com/danielyayla/veri/releases/latest)**
— macOS 13+, Apple silicon & Intel. Agents launch Veri's MCP server with
your own Node (20+).

Start with the **[10-minute quickstart](https://danielyayla.github.io/veri/docs/quickstart.html)**:
install → open the sample project → connect your agent → file a work
order → watch the agent use it. The
[website](https://danielyayla.github.io/veri/) covers the
[workflow](https://danielyayla.github.io/veri/docs/workflow.html),
[agent connection](https://danielyayla.github.io/veri/docs/connect-claude-code.html),
[CI gate](https://danielyayla.github.io/veri/docs/ci.html),
[reference](https://danielyayla.github.io/veri/docs/reference.html), and
[troubleshooting](https://danielyayla.github.io/veri/docs/troubleshooting.html).

Veri is local-first and ships no telemetry: the knowledge base is a
`veri/` directory of markdown files in your repo, and the app's only
network access is checking GitHub Releases for updates.

This repo is self-hosted: Veri is built by executing Veri work orders
(see [veri/](veri/)).

## Development

Building from source (users: prefer the download above):

```bash
npm install
npm test        # builds all packages, then runs every test suite
```

Development requires Node >= 22.18 (native TypeScript type stripping, see
DEC-004); published output targets Node >= 20.

### Packages

- `@veri/core` — parse, validate, and graph a `veri/` directory
- `@veri/cli` — the `veri` binary: `init`, `new`, `check`, `approve`, `migrate`, `import`, `list`, `open`
- `@veri/mcp` — stdio MCP server: `get_context`, `search`, `file_decision`, `file_receipt`
- `@veri/action` — the Veri Check GitHub Action runner, bundled to `action/dist/` (the root `action.yml` is the published surface)
- `@veri/ui` — the Tauri 2 desktop app (Rust shell, Node sidecar)
- `site/` — the website, hand-authored static files deployed by CI

### Configuring the MCP server from a checkout

The installed app writes agent configs for you (see the
[connection page](https://danielyayla.github.io/veri/docs/connect-claude-code.html));
from a source checkout, wire it by hand. The server is stdio-based and
serves one project: pass the project root (the directory containing
`veri/`) as its argument.

After `npm install && npm test`:

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

The server exposes ten tools:

- `get_context(id)` — context package for a work order: the project
  workflow first, then the work order, its linked requirements and
  decisions (2 hops), pending proposals labeled non-binding, source
  excerpts, and the project's document templates, with per-document and
  total token estimates; superseded decisions are named as already
  rejected, bodies omitted; when the neighborhood is too large to
  inline, its outer ring arrives as a context map to retrieve from
  instead of full bodies (the same package `veri context <WO-id>`
  prints in a terminal)
- `search(query)` — case-insensitive substring match over id, title, body
- `get_document(id)` — one document in full, exactly as on disk
- `get_neighbors(id)` — a document's outbound links and backlinks, with
  relations
- `file_decision(title, choice, …)` — record a decision with the next
  free DEC id, `status: proposed` (awaiting the user's approval)
- `file_work_order(title, summary, …)` — propose a unit of work with the
  next free WO id, `status: backlog`
- `file_requirement(title, body, …)` — draft a requirement with the next
  free REQ id, `status: draft` (awaiting the user's acceptance)
- `file_source(title, body, …)` — file a source document: imported
  evidence with the paths, commit refs, and excerpts it rests on
- `file_receipt(work_order_id, commit, files, summary)` — append a
  work-session receipt to a work order — or to an import manifest as an
  import's completion signal; receipts accumulate, never overwrite
- `get_import_instructions()` — the brownfield import instruction
  package: what to mine from an existing repo, the filing rules, and a
  census of what the knowledge base already holds
