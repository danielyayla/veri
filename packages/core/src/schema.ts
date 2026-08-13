import { z } from 'zod';
import { ID_RE, typeOfId } from './ids.ts';
import type { DocType } from './ids.ts';

const idField = z.string().regex(ID_RE, 'must be REQ-, DEC-, WO-, SRC- or WF- plus a zero-padded 3-digit number (e.g. REQ-001)');
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

// Unknown extra keys are preserved (passthrough), never rejected — see REQ-001.
const requirementSchema = z
  .object({
    ...baseFields,
    type: z.literal('requirement'),
    status: z.enum(['draft', 'accepted', 'retired']),
    approved: dateField.optional(),
  })
  .passthrough();

const decisionSchema = z
  .object({
    ...baseFields,
    type: z.literal('decision'),
    status: z.enum(['proposed', 'active', 'superseded']),
    approved: dateField.optional(),
    superseded_by: idField.optional(),
  })
  .passthrough();

const workOrderSchema = z
  .object({ ...baseFields, type: z.literal('work-order'), status: z.enum(['backlog', 'in-progress', 'done']) })
  .passthrough();

const sourceSchema = z
  .object({ ...baseFields, type: z.literal('source'), status: z.literal('imported') })
  .passthrough();

// The project workflow document (DEC-018): same lifecycle as a requirement.
const workflowSchema = z
  .object({
    ...baseFields,
    type: z.literal('workflow'),
    status: z.enum(['draft', 'accepted', 'retired']),
    approved: dateField.optional(),
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
