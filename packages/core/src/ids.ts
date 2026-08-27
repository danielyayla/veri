export const DOC_TYPES = ['requirement', 'decision', 'work-order', 'source', 'workflow', 'product'] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const ID_RE = /^(REQ|DEC|WO|SRC|WF|PRD)-\d{3,}$/;

const PREFIX_TO_TYPE: Record<string, DocType> = {
  REQ: 'requirement',
  DEC: 'decision',
  WO: 'work-order',
  SRC: 'source',
  WF: 'workflow',
  PRD: 'product',
};

/** The document type an id's prefix implies, or undefined for a malformed id. */
export function typeOfId(id: string): DocType | undefined {
  const prefix = /^([A-Z]+)-/.exec(id)?.[1];
  return prefix ? PREFIX_TO_TYPE[prefix] : undefined;
}

const INLINE_REF_RE = /\[\[((?:REQ|DEC|WO|SRC|WF|PRD)-\d{3,})\]\]/g;

/**
 * Numeric-aware id order: WO-999 sorts before WO-1000. At uniform 3-digit
 * width this agrees exactly with plain lexicographic order, so existing
 * all-3-digit projects sort — and pack — byte-identically. The one id
 * comparator (WO-050); every id sort in every package goes through it.
 */
export function compareIds(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

/** All [[ID]] references in a body, deduplicated, in order of first appearance. */
export function extractInlineRefs(body: string): string[] {
  const seen = new Set<string>();
  for (const match of body.matchAll(INLINE_REF_RE)) {
    seen.add(match[1]);
  }
  return [...seen];
}
