import { z } from 'zod';
import { ID_RE, typeOfId } from './ids.ts';

const idField = z.string().regex(ID_RE, 'must be REQ-, DEC-, WO- or SRC- plus a zero-padded 3-digit number (e.g. REQ-001)');
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
  .object({ ...baseFields, type: z.literal('requirement'), status: z.enum(['draft', 'accepted', 'retired']) })
  .passthrough();

const decisionSchema = z
  .object({
    ...baseFields,
    type: z.literal('decision'),
    status: z.enum(['active', 'superseded']),
    superseded_by: idField.optional(),
  })
  .passthrough();

const workOrderSchema = z
  .object({ ...baseFields, type: z.literal('work-order'), status: z.enum(['backlog', 'in-progress', 'done']) })
  .passthrough();

const sourceSchema = z
  .object({ ...baseFields, type: z.literal('source'), status: z.literal('imported') })
  .passthrough();

export const frontmatterSchema = z
  .discriminatedUnion('type', [requirementSchema, decisionSchema, workOrderSchema, sourceSchema])
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
