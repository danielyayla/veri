---
id: DEC-134
type: decision
title: "The trigger corpus is a repo-level YAML data file with its schema in core"
status: active
approved: 2026-08-28
created: 2026-08-27
updated: 2026-08-28
links:
  - id: DEC-129
    rel: implements
  - id: DEC-125
    rel: constrained-by
  - id: SRC-060
    rel: derived-from
  - id: WO-130
    rel: decided-during
---

## Choice

The skill library's trigger corpus ([[DEC-129]]) ships as **one YAML data
file at `skills/trigger-corpus.yaml`**, with its **schema, parse and
invariants as a pure module in core** (`packages/core/src/skill-corpus.ts`)
and its validation as an ordinary core test.

Three sub-choices, each of which could have gone another way:

**Format — YAML, not JSON and not TypeScript.** The corpus is prose-heavy:
every case carries an utterance, and every near-miss case carries a rationale
line that a reviewer reads. YAML's folded scalars keep those readable at a
diff's width, it is the format every Veri document's frontmatter already uses,
and core already depends on `yaml` — no new dependency for the runner a later
work order adds.

**Location — a repo-root `skills/` directory.** The corpus is a repo-level
artifact of Veri's own skill library: it states what each of [[SRC-060]]'s
fourteen gates is for, and a later runner, the shell emitter, and a reviewer
all read the same file. It is not a document in the graph and not code, so it
sits beside `design/` rather than inside `veri/` or inside a package.

**Schema — in core, not in a new package.** `parseTriggerCorpus`,
`checkTriggerCorpus` and the types are pure over text: no filesystem, no
paths, no runner. Only the test knows where the file lives, reading it from
the repo root exactly as `self.test.ts` already reads `veri/`.

Two schema details are load-bearing and are decided here rather than left to
the file:

- **Cases carry stable ids (`TC-nnn`).** [[DEC-129]]'s floor is no regression
  against the corpus, which needs case identity that survives rewording an
  utterance. Keying regressions on the utterance string would silently reset
  a case's history every time its wording was sharpened.
- **A near-miss case names its pair, and the pair declares the boundary.**
  The rationale sits on the case; the boundary statement sits once on the
  pair. Schema enforces that a paired case expects one of that pair's two
  skills and carries a rationale, so a boundary cannot be asserted without a
  case that discriminates it, and a discriminating case cannot land without
  saying why.

## Rejected alternatives

- **The corpus as a TypeScript module inside core.** Compile-time typing for
  free, and it would ship in the published package. Rejected because the
  corpus is data a non-TypeScript runner may well execute — [[DEC-129]]
  explicitly refused to bind the gate to one vendor's eval runner, and
  encoding the artifact as one language's source re-creates that coupling one
  level down. It would also make every corpus edit read as a code change in
  review, which is the opposite of what an artifact defended on coverage
  needs.
- **JSON instead of YAML.** Universally parseable with no dependency at all.
  Rejected on reviewability: the rationale lines are the part of this artifact
  a human checks, and JSON gives them no multi-line form and no comments for
  the routing principle the file leans on. YAML parsers are no less universal
  in practice.
- **The corpus inside `veri/` as a document.** Tempting because [[DEC-125]]
  puts the coaching *method* in `veri/`, and the corpus is adjacent to it.
  Rejected because the corpus is machine-consumed data with a schema, not a
  document with an id, a status and links; it would either sit inert in the
  graph or force the loader to learn a non-document shape, and it would be
  amended by ordinary work orders rather than promoted by a human — the
  opposite of what everything in `veri/` means.
- **The corpus inside `packages/core/src/`.** Adjacent to its schema.
  Rejected mechanically as much as conceptually: `tsc` emits only TypeScript
  from `rootDir: src`, so a data file there would never reach `dist` and
  would be a permanent exception to how that directory works.
- **A separate `packages/skills` workspace holding corpus, schema and later
  the runner.** A clean boundary if the skill library grows. Rejected as more
  machinery than the content warrants — the same argument [[DEC-125]] used
  against a standalone `@verikb/skills` package — and it would add a
  version-skew surface between the corpus and the core it validates against.
- **Requiring a rationale on every case, not only paired ones.** Would read
  as more rigorous. Rejected because it manufactures ceremony where the
  boundary is not in doubt: "run the test suite" needs no defence, and a
  schema that demands one trains authors to write filler. The rule binds
  exactly where [[DEC-129]] says the reviewing happens.

## Rationale

[[DEC-129]] makes the corpus's coverage, not its score, the artifact worth
defending. Every choice above follows from taking that literally: the file is
optimised for being read and argued with, and the machinery around it does
nothing but keep it well-formed and complete.

Splitting data from schema is what lets the later runner exist without
touching either. The runner needs emitted shells, which need the method-document
type question [[DEC-125]] deliberately deferred; by keeping the corpus parse
pure and the file location known only to a test, whatever executes the corpus
later — a harness eval, a script, a check rule — reads it through one typed
parse rather than re-implementing the shape.

The location is the choice most likely to be revisited, and it is cheap to
revisit: `skills/` currently holds exactly one file, and moving it costs one
path in one test. Naming the directory for the subject rather than for this
one artifact is a bet that the runner and any emitter fixtures will want to
live beside it. Note that `skills/` here is Veri's own skill-library material;
the harness-native shells [[DEC-125]] describes are generated into a project's
own harness directory and are not what this directory holds.
