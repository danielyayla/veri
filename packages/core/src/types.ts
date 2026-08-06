import type { DocType } from './ids.ts';

export interface Link {
  id: string;
  rel: string;
}

export interface VeriDocument {
  id: string;
  type: DocType;
  title: string;
  status: string;
  created: string;
  updated: string;
  links: Link[];
  /** Only present on superseded decisions. */
  supersededBy?: string;
  /** Full validated frontmatter; unknown extra keys are preserved here. */
  frontmatter: Record<string, unknown>;
  body: string;
  /** Path relative to the veri/ directory, forward slashes. */
  file: string;
  /** [[ID]] references found in the body, deduplicated. */
  inlineRefs: string[];
}

export type Issue =
  | {
      kind: 'invalid-frontmatter';
      file: string;
      /** Dotted path of the offending field, or null when the file/YAML itself is broken. */
      field: string | null;
      message: string;
    }
  | { kind: 'duplicate-id'; id: string; files: string[]; message: string }
  | {
      kind: 'broken-link';
      file: string;
      sourceId: string;
      targetId: string;
      via: 'frontmatter' | 'inline' | 'superseded_by';
      message: string;
    }
  | { kind: 'wo-without-requirement'; file: string; id: string; message: string }
  | {
      kind: 'done-wo-violation';
      file: string;
      id: string;
      problem: 'unchecked-criteria' | 'no-receipt';
      message: string;
    };
