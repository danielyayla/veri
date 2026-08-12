import type { DocType } from '@veri/core';

/** Initial status for a freshly created document of each type. */
// Every freshly created document starts unapproved — promotion is the user's
// act via veri approve (REQ-008).
export const INITIAL_STATUS: Record<DocType, string> = {
  requirement: 'draft',
  decision: 'proposed',
  'work-order': 'backlog',
  source: 'imported',
  workflow: 'draft',
};

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

export const BODY_TEMPLATES: Record<DocType, string> = {
  requirement: REQUIREMENT_BODY,
  decision: DECISION_BODY,
  'work-order': WORK_ORDER_BODY,
  source: SOURCE_BODY,
  workflow: WORKFLOW_BODY,
};
