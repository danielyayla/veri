import type { Advisory, VeriDocument } from './types.ts';
import { receiptsSection } from './check.ts';

/**
 * One commit as plain data. Facts are collected by a host with process
 * access (the CLI, the Electron main process) and passed in — core never
 * runs git itself (DEC-040, keeping DEC-037's purity posture).
 */
export interface CommitFact {
  /** Full hex SHA. */
  sha: string;
  /** First line of the commit message. */
  subject: string;
  /** Repo-root-relative paths the commit touched. */
  files: string[];
}

/** Commits newest-first, as `git log` emits them. */
export interface GitFacts {
  commits: CommitFact[];
}

/**
 * One parsed receipt list item. Receipts follow DEC-003's convention —
 * date — SHA — files — summary — but the corpus writes it loosely
 * (middle dots, "commit " prefixes, dual SHAs, JSON arrays, wrapped
 * lines), so parsing is lenient: verification is advisory, and a receipt
 * that yields nothing here simply verifies as far as it can (WO-044).
 */
export interface ParsedReceipt {
  /** The receipt text, joined to one line. */
  raw: string;
  /** SHAs (abbreviated or full) the receipt cites. */
  shas: string[];
  /** Path-like tokens from the files segment, braces expanded. */
  paths: string[];
}

const SEGMENT_SEPARATOR_RE = /\s+[—·]\s+/;
const SHA_RE = /^[0-9a-f]{7,40}$/i;

/** Receipt items under "## Receipts": top-level list items with wrapped continuation lines joined. */
function receiptItems(section: string): string[] {
  const items: string[] = [];
  for (const line of section.split('\n')) {
    if (/^[-*]\s+\S/.test(line)) {
      items.push(line.replace(/^[-*]\s+/, ''));
    } else if (items.length > 0 && line.trim() !== '') {
      items[items.length - 1] += ' ' + line.trim();
    }
  }
  return items;
}

/** Expand one level of `prefix{a,b}suffix` into its alternatives. */
function expandBraces(token: string): string[] {
  const match = /^(.*)\{([^{}]+)\}(.*)$/.exec(token);
  if (match === null) return [token];
  return match[2].split(',').map((part) => match[1] + part.trim() + match[3]);
}

/** A token counts as a path when it has a directory separator or a file extension. */
function isPathLike(token: string): boolean {
  return token.includes('/') || /^\.?[\w@+-]+\.[A-Za-z][\w]*$/.test(token);
}

function pathTokens(text: string): string[] {
  const tokens = text
    // Whitespace first — commas may sit inside braces ({check,types}.ts)
    // and must survive until expansion.
    .split(/\s+/)
    .map((raw) =>
      raw
        .replace(/\(.*?\)/g, '') // parenthetical notes: mcpconfig.ts(+test), "(root)"
        // Edge noise in any stacking order: JSON-array quoting and
        // brackets ("path", ]), sentence punctuation (path.md",)
        .replace(/^["'[\](),.;:]+|["'[\](),.;:]+$/g, ''),
    )
    .flatMap(expandBraces)
    .flatMap((token) => token.split(','))
    .map((token) => token.replace(/\/+$/, ''))
    .filter((token) => token !== '' && isPathLike(token));
  return [...new Set(tokens)];
}

/** Parse every receipt under a work order's "## Receipts" section. */
export function parseReceipts(body: string): ParsedReceipt[] {
  const section = receiptsSection(body);
  if (section === null) return [];
  return receiptItems(section).map((item) => {
    const segments = item.split(SEGMENT_SEPARATOR_RE);
    // Convention: date — SHA(s) — files — summary. Anything shorter has
    // nothing verifiable in it.
    const shaSegment = segments[1] ?? '';
    const shas = shaSegment
      .split(/[\s+,]+/)
      .filter((token) => token !== 'commit' && SHA_RE.test(token))
      .map((token) => token.toLowerCase());
    // Paths come from the files segment alone — a summary mentioning a
    // runtime-written path must not count against the commit.
    const paths = shas.length > 0 ? pathTokens(segments[2] ?? '') : [];
    return { raw: item, shas, paths };
  });
}

function findCommit(facts: GitFacts, sha: string): CommitFact | undefined {
  return facts.commits.find((commit) => commit.sha.toLowerCase().startsWith(sha));
}

/** Does any receipt path token name this commit file — exactly, as a directory, or as a basename? */
function touches(file: string, token: string): boolean {
  return file === token || file.startsWith(token + '/') || file.endsWith('/' + token);
}

/**
 * Receipt verification (WO-044, REQ-021): every git claim a receipt makes
 * is checked against the collected facts. Findings are advisories — they
 * inform and never block (DEC-025). Callers without facts (no git, shallow
 * clone) simply don't call this; there is no partial mode.
 */
export function checkProvenance(documents: VeriDocument[], facts: GitFacts): Advisory[] {
  const advisories: Advisory[] = [];
  for (const doc of documents) {
    if (doc.type !== 'work-order') continue;
    const receipts = parseReceipts(doc.body);
    let anyResolved = false;
    for (const receipt of receipts) {
      const resolved: CommitFact[] = [];
      for (const sha of receipt.shas) {
        const commit = findCommit(facts, sha);
        if (commit === undefined) {
          advisories.push({
            kind: 'receipt-commit-missing',
            file: doc.file,
            id: doc.id,
            sha,
            message: `${doc.id} has a receipt citing commit ${sha}, which is not in this repository's history`,
          });
          continue;
        }
        resolved.push(commit);
        anyResolved = true;
        if (!subjectWorkOrders(commit.subject).includes(doc.id)) {
          advisories.push({
            kind: 'receipt-prefix',
            file: doc.file,
            id: doc.id,
            sha,
            subject: commit.subject,
            message: `${doc.id} has a receipt citing commit ${sha}, whose message "${commit.subject}" lacks the ${doc.id}: prefix`,
          });
        }
      }
      if (resolved.length > 0 && receipt.paths.length > 0) {
        const committed = resolved.flatMap((commit) => commit.files);
        const overlap = receipt.paths.some((token) => committed.some((file) => touches(file, token)));
        if (!overlap) {
          advisories.push({
            kind: 'receipt-files',
            file: doc.file,
            id: doc.id,
            sha: receipt.shas[0],
            message: `${doc.id} has a receipt citing commit ${receipt.shas[0]} but none of the files the receipt names appear in that commit`,
          });
        }
      }
    }
    if (doc.status === 'done' && !anyResolved) {
      advisories.push({
        kind: 'receipt-unverified',
        file: doc.file,
        id: doc.id,
        message: `${doc.id} is done but no receipt cites a commit found in this repository's history`,
      });
    }
  }
  return advisories;
}

/**
 * The work orders a commit subject claims, per the WO-nnn: convention.
 * The subject must open with a WO id and carry a colon; everything before
 * the colon may name several ids ("WO-044, WO-045: …") or a variant
 * ("WO-016 migration: …") — all of it is the claim. A subject merely
 * mentioning a WO id later ("Remove in-progress WO-030 work…") claims
 * nothing.
 */
export function subjectWorkOrders(subject: string): string[] {
  if (!/^WO-\d+/.test(subject)) return [];
  const colon = subject.indexOf(':');
  if (colon < 0) return [];
  return subject.slice(0, colon).match(/WO-\d+/g) ?? [];
}

/**
 * The derived "implemented in" index, read straight off the WO-nnn: commit
 * convention — computed on demand, never stored (REQ-021). Map order is
 * facts order (newest commit first).
 */
export function commitsByWorkOrder(facts: GitFacts): Map<string, CommitFact[]> {
  const byWorkOrder = new Map<string, CommitFact[]>();
  for (const commit of facts.commits) {
    for (const id of subjectWorkOrders(commit.subject)) {
      const commits = byWorkOrder.get(id) ?? [];
      commits.push(commit);
      byWorkOrder.set(id, commits);
    }
  }
  return byWorkOrder;
}

export interface WorkOrderCommits {
  id: string;
  commits: CommitFact[];
}

/**
 * Which work orders' commits touched this path (a file, or a directory
 * prefix)? The reverse question of a receipt: "why does this file exist?"
 */
export function workOrdersTouching(facts: GitFacts, path: string): WorkOrderCommits[] {
  const target = path.replace(/^\.\//, '').replace(/\/+$/, '');
  const hits: WorkOrderCommits[] = [];
  for (const [id, commits] of commitsByWorkOrder(facts)) {
    const touching = commits.filter((commit) =>
      commit.files.some((file) => file === target || file.startsWith(target + '/')),
    );
    if (touching.length > 0) hits.push({ id, commits: touching });
  }
  return hits;
}
