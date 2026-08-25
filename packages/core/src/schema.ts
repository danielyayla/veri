import { z } from 'zod';
import { ID_RE, typeOfId } from './ids.ts';
import type { DocType } from './ids.ts';

const idField = z.string().regex(ID_RE, 'must be REQ-, DEC-, WO-, SRC- or WF- plus a number of three or more digits (e.g. REQ-001)');
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a YYYY-MM-DD date');

const linkSchema = z
  .object({
    id: idField,
    rel: z.string().min(1),
  })
  .passthrough();

const baseFields = {
  id: idField,
  title: z.string().min(1),
  created: dateField,
  updated: dateField,
  links: z.array(linkSchema).default([]),
};

// DEC-071: who stamped the approval — a maintainer's display name. Optional
// everywhere; validated against the workflow's maintainers list by check,
// never by the schema, so a solo project is untouched.
const approvedByField = z.string().min(1).optional();

// Unknown extra keys are preserved (passthrough), never rejected — see REQ-001.
const requirementSchema = z
  .object({
    ...baseFields,
    type: z.literal('requirement'),
    status: z.enum(['draft', 'accepted', 'retired']),
    approved: dateField.optional(),
    approved_by: approvedByField,
  })
  .passthrough();

// DEC-058: a decision may carry machine-readable architecture constraints.
// The block gets a real schema — a malformed constraint is a check failure,
// never a silently preserved no-op — while other unknown keys stay
// passthrough per REQ-001. `from`/`to` accept one module name or a list.
const moduleRef = z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]);

// DEC-062: a constraint may declare its enforcement severity. `advisory`
// (the default when absent — WO-067's shipped behavior) keeps violations in
// the grey tier; `error` promotes a violation of this constraint to a check
// issue. A malformed value is an invalid-frontmatter issue like any other
// field — never a silently ignored no-op.
const severityField = z.enum(['advisory', 'error']).optional();

const architectureConstraintSchema = z
  .object({
    from: moduleRef,
    to: moduleRef,
    allowed: z.boolean(),
    severity: severityField,
  })
  .passthrough();

const architectureSchema = z
  .object({ constraints: z.array(architectureConstraintSchema).default([]) })
  .passthrough();

export type ArchitectureConstraint = z.infer<typeof architectureConstraintSchema>;
export type ArchitectureBlock = z.infer<typeof architectureSchema>;

// DEC-059: one registry entry — a module name constraints may reference,
// where it lives, and why it exists. `responsibilities` (WO-068, DEC-089,
// proposed) is an optional declared list feeding the desktop app's module
// detail panel; absent, surfaces fall back to `purpose`. Validated so a
// malformed list is an invalid-frontmatter issue, never a silent no-op.
const moduleEntrySchema = z
  .object({
    name: z.string().min(1),
    path: z.string().min(1),
    purpose: z.string().min(1),
    responsibilities: z.array(z.string().min(1)).optional(),
  })
  .passthrough();

export type ModuleEntry = z.infer<typeof moduleEntrySchema>;

const decisionSchema = z
  .object({
    ...baseFields,
    type: z.literal('decision'),
    status: z.enum(['proposed', 'active', 'superseded']),
    approved: dateField.optional(),
    approved_by: approvedByField,
    superseded_by: idField.optional(),
    architecture: architectureSchema.optional(),
  })
  .passthrough();

// WO-088: a work order may claim the code it changes — repo-root-relative
// path globs and test identifiers (a file path, optionally `::name`). The
// binding drift detectors run off this block; absence is legal and leaves
// every existing check untouched. Malformed bindings fail the schema — a
// binding that silently cannot fire would be a no-op check (the DEC-058
// posture).
const bindsSchema = z
  .object({
    paths: z.array(z.string().min(1)).default([]),
    tests: z.array(z.string().min(1)).default([]),
  })
  .passthrough();

export type BindsBlock = z.infer<typeof bindsSchema>;

// WO-098: `ready` sits between backlog and in-progress — the user's dispatch
// clearance, entered only via the approve stamp, so `approved`/`approved_by`
// ride work orders exactly as they ride the other promotable types.
const workOrderSchema = z
  .object({
    ...baseFields,
    type: z.literal('work-order'),
    status: z.enum(['backlog', 'ready', 'in-progress', 'done']),
    approved: dateField.optional(),
    approved_by: approvedByField,
    binds: bindsSchema.optional(),
  })
  .passthrough();

// WO-094: an imported source may reference its preserved original — the
// veri/-relative path under originals/ (DEC-094). Optional: hand-authored
// sources have no original. Validated so a malformed reference is an
// invalid-frontmatter issue, never a silently dead pointer.
const sourceSchema = z
  .object({
    ...baseFields,
    type: z.literal('source'),
    status: z.literal('imported'),
    original: z.string().min(1).optional(),
  })
  .passthrough();

// The project workflow document (DEC-018): same lifecycle as a requirement.
const workflowSchema = z
  .object({
    ...baseFields,
    type: z.literal('workflow'),
    status: z.enum(['draft', 'accepted', 'retired']),
    approved: dateField.optional(),
    approved_by: approvedByField,
    // DEC-071: who may stamp approvals — free-form display names. The list's
    // presence is what activates team semantics; absent → solo, no new checks.
    maintainers: z.array(z.string().min(1)).optional(),
    // DEC-039: the design gate's trigger paths are project-defined here, not
    // hardcoded in core. A started work order whose body mentions any of
    // these must link a designed-by design document. Absent → gate inert.
    design_gate_paths: z.array(z.string().min(1)).optional(),
    // DEC-059: the module registry architecture constraints resolve against
    // (DEC-058). Absent → no modules defined, and any constraint fails check.
    modules: z.array(moduleEntrySchema).optional(),
    // WO-088: days of bound-path silence before an in-progress work order
    // counts as stale. Absent → the core default (DEFAULT_STALE_AFTER_DAYS).
    stale_after_days: z.number().int().positive().optional(),
  })
  .passthrough();

export const frontmatterSchema = z
  .discriminatedUnion('type', [requirementSchema, decisionSchema, workOrderSchema, sourceSchema, workflowSchema])
  .superRefine((fm, ctx) => {
    const implied = typeOfId(fm.id);
    if (implied && implied !== fm.type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['id'],
        message: `id prefix implies type "${implied}" but document type is "${fm.type}"`,
      });
    }
    if (fm.type === 'decision' && fm.status === 'superseded' && !fm.superseded_by) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['superseded_by'],
        message: 'a superseded decision must name its successor in superseded_by',
      });
    }
  });

export type Frontmatter = z.infer<typeof frontmatterSchema>;

/**
 * Assembly policy (REQ-006, DEC-025): how each type's body ships in a
 * context package. This is Veri's contract about token spend — core-owned
 * data, not a per-project style choice. Body *structure* is not defined
 * here: it derives from the effective template (see check.ts).
 */
export type Packing = { mode: 'full' } | { mode: 'name-only' } | { mode: 'excerpt'; chars: number };

export interface AssemblyPolicy {
  /** 'always': in every package regardless of traversal (the workflow,
      DEC-018). 'linked': reached via the 2-hop traversal. */
  include: 'always' | 'linked';
  packing: Packing;
  /** Status-specific overrides, e.g. superseded decisions ship name-only. */
  byStatus?: Record<string, Packing>;
}

export const ASSEMBLY_POLICY: Record<DocType, AssemblyPolicy> = {
  workflow: { include: 'always', packing: { mode: 'full' } },
  requirement: { include: 'linked', packing: { mode: 'full' } },
  decision: {
    include: 'linked',
    packing: { mode: 'full' },
    byStatus: { superseded: { mode: 'name-only' } },
  },
  'work-order': { include: 'linked', packing: { mode: 'full' } },
  source: { include: 'linked', packing: { mode: 'excerpt', chars: 600 } },
};

/** The packing a document of `type` in `status` gets in a context package. */
export function packingFor(type: DocType, status: string): Packing {
  const policy = ASSEMBLY_POLICY[type];
  return policy.byStatus?.[status] ?? policy.packing;
}

/**
 * DEC-035's escalation rule: when the fully-inlined 2-hop package fits under
 * this many estimated tokens, everything inlines (the pre-layering behavior).
 * Past it, hop-1 stays full text and the hop-2 ring becomes the context map.
 * Part of the assembly contract — an enforced lever, not a style choice.
 */
export const INLINE_THRESHOLD_TOKENS = 15_000;

// PACKAGE_RULES moved to prompts.ts (DEC-092): the renderer needs it from a
// browser-bundleable subpath, and this module carries zod.
