export const DOC_TYPES = ['requirement', 'decision', 'work-order', 'source'] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const ID_RE = /^(REQ|DEC|WO|SRC)-\d{3}$/;

const PREFIX_TO_TYPE: Record<string, DocType> = {
  REQ: 'requirement',
  DEC: 'decision',
  WO: 'work-order',
  SRC: 'source',
};

/** The document type an id's prefix implies, or undefined for a malformed id. */
export function typeOfId(id: string): DocType | undefined {
  const prefix = /^([A-Z]+)-/.exec(id)?.[1];
  return prefix ? PREFIX_TO_TYPE[prefix] : undefined;
}

const INLINE_REF_RE = /\[\[((?:REQ|DEC|WO|SRC)-\d{3})\]\]/g;

/** All [[ID]] references in a body, deduplicated, in order of first appearance. */
export function extractInlineRefs(body: string): string[] {
  const seen = new Set<string>();
  for (const match of body.matchAll(INLINE_REF_RE)) {
    seen.add(match[1]);
  }
  return [...seen];
}
