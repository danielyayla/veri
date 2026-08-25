---
id: SRC-044
type: source
title: "Software Factory video transcript — artifacts and codebase indexing as agent context"
status: imported
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-088
    rel: relates-to
  - id: REQ-024
    rel: relates-to
---

Transcript excerpt from a Software Factory YouTube video (provided by Daniel, 2026-08-25), plus a delta analysis against Veri.

## Transcript

> The agents work from the context you give them. And there's two ways to give it. Artifacts and the codebase. In this video, I'll set up both. Artifacts first. An artifact is any file you bring in for context, whether it be a document, a transcript, an email thread, even an audio file. I'll add a couple here. And then every agent in every module can search and read them. You can upload them or drag them in. and organize them as the project grows. Now the codebase software factory connects through a GitHub app. I install it, authorize it, and I'll go and pick the Ledger Plus repo, which is the repo that I want to target for this project. If you have multiple repositories, we do support multi-reo indexing. Then the index automatically runs. It builds a searchable map of the code, the files, and how they all connect. Once it's indexed, any agent can search the code. That's how you give the agents context for the project. If you've got any questions, the docs are at [transcript ends]

## What Software Factory does

Two context channels, both retrieval-oriented:

1. **Artifacts** — any file dragged in (documents, transcripts, email threads, audio), organized in folders, searchable and readable by every agent in every module.
2. **Codebase** — a GitHub app indexes the repo (multi-repo supported) into "a searchable map of the code, the files, and how they all connect"; agents search it freely.

The underlying model is retrieval over everything: dump context in, index it, let agents search.

## Delta analysis against Veri

Where Veri differs deliberately (not gaps):

- **Curation over retrieval.** Veri's source documents are distilled into requirements and decisions; agents receive a deterministic context package per work order ([[DEC-006]], [[DEC-035]]) rather than searching an index. This gives provenance and lets `veri check` enforce that binding documents were approved ([[REQ-008]]) — properties RAG cannot provide.
- **No hosted platform.** Files in the repo are the source of truth ([[DEC-002]]); no GitHub app, no upload service.
- **Approval gates.** Software Factory shows no analog to Veri's draft/proposed-never-binds model.

Deltas worth closing:

1. **Artifact intake friction.** Their "drag in an email thread or audio file" is a far lower bar than authoring a SRC markdown file by hand. Veri could match the ergonomics without giving up curation: an import path that converts arbitrary files (PDF, transcript, email, audio) into SRC documents, original preserved, ready for distillation.
2. **Code-to-intent lookup.** Their index answers "how the files connect." Veri has the seed of a better, receipts-grounded answer: receipts record files touched per work order, [[WO-088]] added code bindings and drift detectors, and the module registry ([[DEC-059]]) ties paths to purpose. What is missing is a query surface: given a code path, return the work orders, decisions, and requirements that govern it.
3. **Multi-repo / workspace support** — noted, not urgent for a monorepo-first tool.

Explicitly declined: free-form search-over-everything as the primary context channel, and hosted indexing. Veri's differentiator is the complete, verified, approval-gated package.
