---
id: SRC-035
type: source
title: "Design brief — Website redesign: product-first homepage and the visible loop"
status: imported
created: 2026-08-19
updated: 2026-08-20
links:
  - id: WO-065
    rel: designs
  - id: REQ-012
    rel: builds-on
  - id: DEC-033
    rel: constrained-by
---

Reviewed by Daniel 2026-08-20.

Daniel's redesign brief (2026-08-19) for the public site, plus the
findings of the same-day design critique of the shipped site. Filed so
the design intent rides into the WO-065 context package instead of
living in one chat session.

## Objective

Make someone understand what Veri is, why it exists, and why they
would want it within a few seconds. Not a generic SaaS landing page,
and not "AI documentation software."

## Core positioning

Veri is a local-first knowledge base for coding agents. Requirements,
decisions, evidence, workflow rules, work orders, and implementation
history live as plain Markdown in the repo; agents retrieve the
context relevant to a task over MCP instead of relying on chat
history; humans control what becomes canonical. The core idea:
**prompts are temporary — project knowledge should accumulate.**

## The central story

The loop, communicated visually, as a cycle:
evidence → requirements & decisions → work order → agent context →
implementation → receipt → (future sessions start smarter).

## Homepage narrative (in order)

1. **Hero** — answers instantly: what is Veri, why use it, how it
   differs from just prompting an agent. Direction: "A knowledge base
   your coding agents read." Primary CTA: Download for macOS.
   Secondary: View on GitHub. Obvious route to Quickstart. The real
   app prominently displayed — no abstract illustration in its place.
2. **The problem** — every session can begin with incomplete
   institutional memory: re-explaining what the product does, why
   architecture was chosen, what was rejected, what's in scope, what
   evidence led where. Chat history is not a durable knowledge
   system. Familiar to Claude Code / Codex / Cursor users; no
   exaggerated AI language.
3. **The loop** — the six stages above, interactive or animated over
   paragraphs.
4. **Context, not prompt engineering** — a without-Veri vs with-Veri
   comparison that reads visually: chat re-explanation loop vs work
   order → retrieval → work → decisions and receipt return → next
   session inherits.
5. **Decisions that stay decided** — a decision records what was
   chosen, why, and what was rejected; active decisions travel into
   future packages so agents don't reopen settled questions. Show an
   actual decision document.
6. **Human approval** — agent requirements start as drafts, agent
   decisions as proposed; a review queue; only a human promotes.
   "Agents can propose. Humans decide what becomes canon." Show the
   real NEEDS REVIEW experience.
7. **Scoped context** — the Context Package interface: workflow,
   requirements, active decisions, source excerpts, token estimates.
   Assembled from the project's links, not a repo dump. Product UI,
   not marketing graphics.
8. **Plain files are the architecture** — a `veri/` directory of
   readable Markdown: open anywhere, edit directly, search, commit,
   diff, render on GitHub, feed agents. Deleting Veri deletes
   nothing. Demonstrate UI ↔ Markdown ↔ Git ↔ agent on the same
   knowledge; no "your data is yours" cliché.
9. **Auditability** — receipts record when, the commit, files
   changed, what was done; approvals and status changes are ordinary
   file diffs. Reviewing the project's reasoning is as inspectable as
   reviewing its code.
10. **Health** — `veri check` as a compiler/linter for project
    intent: broken links, work orders without requirements,
    unapproved dependencies, completed work without receipts.
11. **Agent-native, not agent-specific** — MCP; Claude Code as a
    concrete example, architecture not tied to one agent. Why the
    connection matters on the homepage; exact config in docs.
12. **Final CTA** — download.

## Visual direction

Modern, extremely clean, quiet, technical, confident, local-first,
developer-oriented, highly polished. Use strong typography, generous
whitespace, subtle borders, restrained color, thoughtful dark and
light modes, product screenshots, small diagrams, subtle interaction.
Avoid gradients-as-style, neon AI imagery, glowing brains, purple AI
branding, glassmorphism, stock illustrations, walls of copy,
gratuitous animation, claims like "10x your development."

## Information architecture

Marketing separated from docs. Primary nav: Product · Workflow ·
Docs · GitHub · [Download]. Docs handle quickstart, workflow,
connecting agents, reference, troubleshooting. A new visitor never
begins inside documentation.

## Writing standard

Extremely economical. No adjective-driven hype; make the mechanism
obvious. Short headlines, one or two sentences. The product provides
the evidence. Sixty seconds of scrolling should leave: "Veri keeps
the reasoning behind my software in my repo and gives the relevant
pieces to my coding agent when it works" — and ideally "I want my
agent to have that."

## Critique findings on the shipped site (2026-08-19)

Measured against this brief; the concrete defects WO-065 fixes:

- No responsive rules at all: at 375 px the six-link header forces a
  595 px-wide page; hero `h1` fixed at 52 px; `code` is nowrap.
- Product invisible until mid-page; hero is a text wordmark whose
  largest type carries no information.
- Loop rendered as three linear steps; stages 5–6 (knowledge returns,
  future sessions start smarter) compressed into a caption; nothing
  cyclic.
- The strongest concepts (scoped context, decisions stay decided,
  audit trail) demoted to two identical 3-card grids.
- Both screenshots are full-app captures rendered ~992 px wide —
  the context-package panel is illegible.
- Single CTA path: no GitHub button; Quickstart buried in 13 px mono
  fine print at ~3.6:1 contrast.
- `--faint` #6E6B76 on #0F0F11 ≈ 3.6:1 — fails WCAG AA at the 11 to
  13.5 px sizes it is used at (eyebrows, dl-sub, footer).
- Nav touch targets ~23 px tall; no skip link.
- Dark-only; no `prefers-color-scheme` support despite the app
  shipping light mode (WO-060).
- No favicon, no OpenGraph/Twitter metadata.
- No final CTA; page ends on cards and a footer.
- Type scale has ~9 ad-hoc sizes; `font-weight: 640/650` nonstandard;
  `.callout` declares `background` twice.
- Worth preserving: the voice ("agents stop re-opening what you
  settled in March", "git diff shows every word"), the app-ported
  palette, honest claims, the zero-dependency architecture (DEC-033),
  and the docs pages.
