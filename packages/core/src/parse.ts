import { parse as parseYaml } from 'yaml';
import { frontmatterSchema } from './schema.ts';
import { extractInlineRefs } from './ids.ts';
import type { Issue, Link, VeriDocument } from './types.ts';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

export interface ParseOutcome {
  document?: VeriDocument;
  issues: Issue[];
}

/** Parse one markdown document. Never throws: problems come back as structured issues. */
export function parseDocument(file: string, content: string): ParseOutcome {
  const match = FRONTMATTER_RE.exec(content);
  if (!match) {
    return { issues: [invalidFrontmatter(file, null, 'missing YAML frontmatter block (--- ... ---)')] };
  }

  let raw: unknown;
  try {
    raw = parseYaml(match[1]);
  } catch (err) {
    return { issues: [invalidFrontmatter(file, null, `YAML parse error: ${(err as Error).message}`)] };
  }

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { issues: [invalidFrontmatter(file, null, 'frontmatter must be a YAML mapping')] };
  }

  const result = frontmatterSchema.safeParse(raw);
  if (!result.success) {
    return {
      issues: result.error.issues.map((zi) =>
        invalidFrontmatter(file, zi.path.length > 0 ? zi.path.join('.') : null, zi.message),
      ),
    };
  }

  const fm = result.data;
  const body = content.slice(match[0].length);
  const document: VeriDocument = {
    id: fm.id,
    type: fm.type,
    title: fm.title,
    status: fm.status,
    created: fm.created,
    updated: fm.updated,
    links: fm.links.map(({ id, rel }): Link => ({ id, rel })),
    ...(fm.type === 'decision' && fm.superseded_by !== undefined ? { supersededBy: fm.superseded_by } : {}),
    frontmatter: fm as Record<string, unknown>,
    body,
    file,
    inlineRefs: extractInlineRefs(body),
  };
  return { document, issues: [] };
}

function invalidFrontmatter(file: string, field: string | null, message: string): Issue {
  return {
    kind: 'invalid-frontmatter',
    file,
    field,
    message: field === null ? `${file}: ${message}` : `${file}: frontmatter field "${field}": ${message}`,
  };
}
