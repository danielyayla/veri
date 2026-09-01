import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DocType } from './ids.ts';

/**
 * Per-project document body templates (REQ-010, DEC-023): plain markdown
 * files at `veri/templates/<type>.md`, body only, no frontmatter, out of
 * the document graph. The built-ins below are the fallback when a project
 * has no file for a type — and the content the scaffold writes out so
 * every project starts with visible, editable templates.
 */

export const TEMPLATES_SUBDIR = 'templates';

const REQUIREMENT_BODY = `
(Describe the requirement.)

## Acceptance criteria

- [ ] First criterion
`;

const DECISION_BODY = `
## Choice

(What was chosen.)

## Rejected alternatives

- **Alternative** — why it lost

## Rationale

(Why this beats the alternatives.)
`;

// The six-section work-order skeleton (see WO-002).
const WORK_ORDER_BODY = `
## Summary

(What this delivers.)

## In scope

- (First item)

## Out of scope

- (First exclusion)

## Requirements

(Link the requirements this delivers, e.g. [[REQ-001]].)

## Acceptance tests

- [ ] First test

## Receipts

(one line per work session: date — commit or PR ref — one sentence)

(none yet)
`;

const SOURCE_BODY = `
(Imported source. Paste or link the original material.)
`;

// Projects normally get their workflow from the scaffold (DEC-018); this
// template exists so a hand-created replacement starts with the right shape.
const WORKFLOW_BODY = `
(How work moves through this project: sources → requirements and
decisions → work orders → implementation with receipts.)

## The path of work

1. (First stage)

## Rules for implementers

1. (First rule)
`;

// Product singletons (REQ-037) are free-form prose — no `##` skeleton, so
// the structure check expects no sections of them. The user's product model
// should read like their thinking, not like a form.
const PRODUCT_BODY = `
(The product model, in your own words. This is one of the gated
singletons under veri/product/ — vision, users, principles, or
current-focus.)
`;

// The method skeleton (DEC-130): six sections, in the order a gate is
// actually run. Purpose says which gate this is; What it reads says where the
// agent looks before asking anything; The interview is the coaching itself;
// What it files names the documents that may be created, always draft or
// proposed (REQ-008); Guardrails names what the gate must refuse; Handoff
// names the next gate, which is how the library composes. Advisory like every
// template — a project may edit it (DEC-023, DEC-025).
const METHOD_BODY = `
## Purpose

(Which gate this staffs, and what a user gets from standing at it.)

## What it reads

(The documents and tools consulted before the first question.)

## The interview

(The questions, in order, and what each one is for.)

## What it files

(The documents this may create — draft or proposed only, never approved.)

## Guardrails

(What this must refuse to do, and what it says when it refuses.)

## Handoff

(Which documents now await which act, and which gate picks them up.)
`;

export const BODY_TEMPLATES: Record<DocType, string> = {
  requirement: REQUIREMENT_BODY,
  decision: DECISION_BODY,
  'work-order': WORK_ORDER_BODY,
  source: SOURCE_BODY,
  workflow: WORKFLOW_BODY,
  product: PRODUCT_BODY,
  method: METHOD_BODY,
};

/** Path of a type's template file, relative to the veri/ directory. */
export function templateFile(type: DocType): string {
  return join(TEMPLATES_SUBDIR, `${type}.md`);
}

export interface EffectiveTemplate {
  body: string;
  /** Where the body came from: the project's file, or the built-in default. */
  source: 'project' | 'builtin';
}

function toPath(veriDir: string | URL): string {
  return typeof veriDir === 'string' ? veriDir : fileURLToPath(veriDir);
}

/**
 * The template a new document of `type` starts from. Read fresh from disk on
 * every call — never cached (DEC-002), so an edit applies to the very next
 * creation with no restart.
 */
export function getTemplate(veriDir: string | URL, type: DocType): EffectiveTemplate {
  const path = join(toPath(veriDir), templateFile(type));
  try {
    return { body: readFileSync(path, 'utf8'), source: 'project' };
  } catch {
    return { body: BODY_TEMPLATES[type], source: 'builtin' };
  }
}

/** True when the project has its own file for `type` and its content differs
    from the built-in default (whitespace-insensitive at the ends). */
export function isCustomized(veriDir: string | URL, type: DocType): boolean {
  const effective = getTemplate(veriDir, type);
  return effective.source === 'project' && effective.body.trim() !== BODY_TEMPLATES[type].trim();
}

/**
 * Write the built-in defaults to `veri/templates/`, one file per type,
 * never overwriting an existing file. Used by the scaffold; also safe to
 * run on a pre-templates project to materialize the directory.
 */
export function writeDefaultTemplates(veriDir: string | URL): void {
  const root = toPath(veriDir);
  mkdirSync(join(root, TEMPLATES_SUBDIR), { recursive: true });
  for (const [type, body] of Object.entries(BODY_TEMPLATES)) {
    const path = join(root, templateFile(type as DocType));
    if (!existsSync(path)) writeFileSync(path, body);
  }
}
