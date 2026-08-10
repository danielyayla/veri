---
id: SRC-004
type: source
title: Product direction notes — founder session 2026-08-10
status: imported
created: 2026-08-10
updated: 2026-08-10
links:
  - id: DEC-002
    rel: builds-on
---

Raw product direction captured from a founder working session on
2026-08-10, organized into themes. These are notes, not commitments —
each item needs its own requirement (and likely decisions) before any
work order is created.

## Vision framing

- Veri is a UI on top of markdown files; git is the collaboration
  mechanism. First-class git integration means multi-user collaboration
  from day one with no accounts, no sync server, no payment
  ([[DEC-002]] extended).
- Business model instinct: fully open source and free to use; if
  adoption grows, monetize a hosted/service layer later (non-git
  collaborators, org-wide views, hosted MCP/provenance). Never paywall
  the local core.

## 1. AI in the product — bring your own API key (BYOK)

- Users supply their own API key to enable AI features inside Veri.
  Keeps the tool free to run and avoids Veri operating inference
  infrastructure.
- Note: v1 currently has a "no network calls" convention — BYOK AI is
  the deliberate break point and needs a decision when it lands.

## 2. Drift detection (code ↔ docs source of truth)

- Sync/awareness with the project's GitHub repo / code base.
- The `veri/` documents are a source of truth; users should be told when
  requirements/decisions/work orders are drifting away from what the
  code actually does (and vice versa).
- Likely AI-assisted (pairs with BYOK): compare linked code regions or
  commits-since-last-receipt against document content.

## 3. Templates / skills for document authoring

- A template or "skill" system defining how requirements, decisions, and
  work orders are written (structure, required sections, tone).
- Editable via the UI — users can see and modify the schema/template
  ("the skill") rather than it being hardcoded.

## 4. Context package optimization

- Think hard about token efficiency of the MCP context package
  ([[DEC-006]] territory): what gets included, summarization, budgets,
  ranking — manage tokens deliberately rather than shipping whole
  documents unconditionally.

## 5. Permission / approval layer (human in the loop)

- Requirements and decisions should require human approval before a
  work order can be created from them.
- Approval likely per document (each requirement, each decision), i.e.
  a gate on status transitions (e.g. draft → accepted needs an
  approver), enforced by `veri check` and surfaced in the UI.

## 6. First-class markdown editor

- Every document (requirement, decision, work order) must be editable
  in the app: a first-class markdown/document editor, not a viewer with
  an "open in external editor" escape hatch.

## 7. Git-native UI

- The UI should reflect git state: changes made, history, what's
  committed vs dirty — tracked and visible, enabling the day-one
  multi-user collaboration story.

## 8. Plugin ecosystem

- Swappable engines behind stable extension points, plus a plugin
  library users browse to enhance Veri. E.g. exchange one drift
  detection engine for another.
- Candidate extension points: checkers (`veri check` rules — drift
  engines live here), templates/skills, context
  providers/transformers, UI panels, approval gates.
- Resolves the BYOK tension: core keeps zero network calls; AI features
  ship as plugins that bring their own API usage.
- Sequencing caution: build drift detection, templates, and a context
  optimizer as first-party features first, then extract the plugin
  interfaces from what they actually needed — avoids premature
  abstraction and launches the library non-empty.
- Risks to design for: API stability promises once third-party plugins
  exist; security/supply-chain surface (plugins near the BYOK key need
  a permission model); empty-library chicken-and-egg.
- Business angle: community plugins free; curated/verified registry,
  enterprise plugin sets, or hosted plugin execution are natural paid
  layers that never touch the free core.

## Suggested rough sequencing (for later triage)

1. Git-native UI + markdown editor (6, 7) — foundation for everything.
2. Approval/permission layer (5) — pure format + check logic, no AI.
3. Templates/skills with editable UI (3).
4. BYOK AI + drift detection (1, 2) — drift is the killer feature; BYOK
   is its prerequisite.
5. Context package optimization (4) — ongoing, informed by real usage.
