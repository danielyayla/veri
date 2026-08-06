# skiff

skiff is a local-first invoicing app for freelancers: create and edit
invoices offline, export print-ready PDFs from templates, keep every byte
of client data on the user's machine.

## How to work in this repo

1. Never start coding from a chat prompt alone. Find the relevant work
   order in `veri/work-orders/`; if none exists, propose one.
2. Read every document a work order links to before implementing it, and
   respect linked decisions — superseded decisions are settled ground.
3. Stay inside the work order's "In scope" section.
4. File non-trivial technical choices as new decisions in
   `veri/decisions/`.
5. Append a receipt to the work order when you finish a session: date,
   commit, files touched, one-line summary.

## Code conventions

- Rust core (Tauri), thin webview UI. Export and all business logic live
  in the core, never the webview (DEC-002).
- One SQLite file per project directory is the only store (DEC-001).
- No network calls anywhere: no telemetry, no sync, no CDN fonts
  (REQ-003, DEC-004).
- PDF rendering goes through Typst templates in `templates/` (DEC-005).
- Tests: `cargo test`; golden-file snapshots for every export template.
