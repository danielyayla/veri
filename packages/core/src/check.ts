import type { Advisory, Issue, VeriDocument } from './types.ts';
import type { LoadResult } from './load.ts';
import { CURRENT_FOCUS_FILE, OUTCOME_OF_REL, OUTCOME_RELS, PRODUCT_FILES, isOutcomeRel, isPending, isWithdrawn, requirementKind } from './pending.ts';
import { compareIds } from './ids.ts';
import type { DocType } from './ids.ts';
import { daysBetween, pathMatchesBinds } from './binds.ts';
import { commitsByWorkOrder } from './provenance.ts';
import type { GitFacts } from './provenance.ts';
import { checkSupersededLinks } from './drift.ts';
import { checkArchitecture } from './architecture.ts';
import { getTemplate } from './templates.ts';
import { FORMAT_FILE, formatStatement } from './format.ts';
import { sectionText, withoutSection } from './sections.ts';
import type { FormatClassification } from './format.ts';

export function checkDuplicateIds(documents: VeriDocument[]): Issue[] {
  const filesById = new Map<string, string[]>();
  for (const doc of documents) {
    const files = filesById.get(doc.id) ?? [];
    files.push(doc.file);
    filesById.set(doc.id, files);
  }
  const issues: Issue[] = [];
  for (const [id, files] of filesById) {
    if (files.length > 1) {
      // The team-merge case (REQ-026, DEC-070): name every claimant and the
      // mechanical fix, so the error is its own resolution guide.
      issues.push({
        kind: 'duplicate-id',
        id,
        files,
        message: `duplicate id ${id} — ${files.length} documents claim it; keep one and move the other with: veri renumber ${id} --file <path-to-move>`,
      });
    }
  }
  return issues;
}

export function checkBrokenLinks(documents: VeriDocument[]): Issue[] {
  const ids = new Set(documents.map((doc) => doc.id));
  const issues: Issue[] = [];
  for (const doc of documents) {
    for (const link of doc.links) {
      if (!ids.has(link.id)) {
        issues.push({
          kind: 'broken-link',
          file: doc.file,
          sourceId: doc.id,
          targetId: link.id,
          via: 'frontmatter',
          message: `${doc.id} links to ${link.id} (rel "${link.rel}") but no document has that id`,
        });
      }
    }
    if (doc.supersededBy !== undefined && !ids.has(doc.supersededBy)) {
      issues.push({
        kind: 'broken-link',
        file: doc.file,
        sourceId: doc.id,
        targetId: doc.supersededBy,
        via: 'superseded_by',
        message: `${doc.id} is superseded by ${doc.supersededBy} but no document has that id`,
      });
    }
    for (const ref of doc.inlineRefs) {
      if (!ids.has(ref)) {
        issues.push({
          kind: 'broken-link',
          file: doc.file,
          sourceId: doc.id,
          targetId: ref,
          via: 'inline',
          message: `${doc.id} references [[${ref}]] inline but no document has that id`,
        });
      }
    }
  }
  return issues;
}

export function checkWorkOrderRequirements(documents: VeriDocument[]): Issue[] {
  const issues: Issue[] = [];
  for (const doc of documents) {
    if (doc.type !== 'work-order') continue;
    // Backlog is planning, and the gate is on starting work, not planning
    // (REQ-008, REQ-009): a freshly created WO passes check until it starts.
    // Withdrawn is the other end of the same exemption (DEC-110): work that
    // was abandoned is not held to the standards of work that will happen.
    if (doc.status === 'backlog' || isWithdrawn(doc)) continue;
    if (!doc.links.some((link) => link.id.startsWith('REQ-'))) {
      issues.push({
        kind: 'wo-without-requirement',
        file: doc.file,
        id: doc.id,
        message: `work order ${doc.id} does not link to any requirement`,
      });
    }
  }
  return issues;
}

// The gate is on starting work, not on planning: backlog work orders may cite
// pending documents so a proposal and its work orders review as one package.
export function checkGatedWorkOrders(documents: VeriDocument[]): Issue[] {
  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  const issues: Issue[] = [];
  for (const doc of documents) {
    if (doc.type !== 'work-order' || doc.status === 'backlog' || isWithdrawn(doc)) continue;
    for (const link of doc.links) {
      const target = byId.get(link.id);
      if (target !== undefined && isPending(target)) {
        issues.push({
          kind: 'gated-wo',
          file: doc.file,
          id: doc.id,
          targetId: target.id,
          targetStatus: target.status,
          message: `work order ${doc.id} is ${doc.status} but depends on ${target.id}, which is still ${target.status} — approve it first (veri approve ${target.id})`,
        });
      }
    }
  }
  return issues;
}

/**
 * The demotion hole (WO-111): a work order carrying an `approved:` stamp
 * while sitting in `backlog`. Ready exists only via the stamp (DEC-096,
 * REQ-008), so this state means a demotion discarded dispatch clearance
 * without discarding its record — no legitimate path produces it. Runs
 * unconditionally: the other work-order checks `continue` on backlog
 * (planning is ungated), which is exactly why this contradiction was
 * invisible until now. Withdrawn work orders are out of play (DEC-110) and
 * keep their history unflagged; they are not `backlog`, so the status test
 * already exempts them.
 */
export function checkStampedBacklog(documents: VeriDocument[]): Issue[] {
  const issues: Issue[] = [];
  for (const doc of documents) {
    if (doc.type !== 'work-order' || doc.status !== 'backlog' || doc.approved === undefined) continue;
    issues.push({
      kind: 'stamped-backlog',
      file: doc.file,
      id: doc.id,
      message: `work order ${doc.id} is backlog but carries an approved: ${doc.approved} stamp — it left ready without discarding the record; re-approve it (veri approve ${doc.id}), or remove the approved:/approved_by: lines in the commit that demotes it`,
    });
  }
  return issues;
}

/**
 * Claim semantics (WO-099): in-progress means a session holds the work, and
 * the claim fields say which one. A work order that reached in-progress
 * without them is unaccounted — the concurrent-session collision REQ-026's
 * multi-committer world makes routine. Done work orders are exempt: the
 * claim is an operational fact, not retrofitted history.
 */
export function checkUnclaimedWorkOrders(documents: VeriDocument[]): Issue[] {
  const issues: Issue[] = [];
  for (const doc of documents) {
    if (doc.type !== 'work-order' || doc.status !== 'in-progress') continue;
    if (doc.claimedBy !== undefined && doc.claimedAt !== undefined) continue;
    issues.push({
      kind: 'unclaimed-wo',
      file: doc.file,
      id: doc.id,
      message: `work order ${doc.id} is in-progress but records no claim — start it with veri start ${doc.id} --as <session>, or add claimed_by/claimed_at`,
    });
  }
  return issues;
}

/**
 * Requirement kinds (REQ-032, WO-114): a hypothesis is a bet tested by
 * shipping, and a bet with no declared outcome — no metric, no target — can
 * never be confirmed or refuted. An untestable claim is an issue, never a
 * silent no-op (the DEC-058 posture). Constraints (including every
 * requirement with no `kind:`, which defaults to constraint) are exempt:
 * they are verified by acceptance criteria, not outcomes. Withdrawn
 * requirements are out of play (DEC-110) and not held to it.
 */
export function checkHypothesisOutcomes(documents: VeriDocument[]): Issue[] {
  const issues: Issue[] = [];
  for (const doc of documents) {
    if (doc.type !== 'requirement' || isWithdrawn(doc)) continue;
    if (requirementKind(doc) !== 'hypothesis' || doc.outcome !== undefined) continue;
    issues.push({
      kind: 'hypothesis-without-outcome',
      file: doc.file,
      id: doc.id,
      message: `requirement ${doc.id} is a hypothesis but declares no outcome — add outcome: {metric: ..., target: ...} naming what would confirm or refute it`,
    });
  }
  return issues;
}

/**
 * Outcome link relations (REQ-033, WO-115): evidence points at the bet.
 * `tests`/`supports`/`refutes` are valid only from a source toward a
 * requirement, and `outcome-of` only from a source toward the work order
 * that shipped the change. A misdirected outcome rel would silently fail to
 * count as outcome evidence — the untested-bet advisory and context assembly
 * both read these edges — so it is an issue, never a no-op (DEC-058). A
 * target id that resolves to nothing is the broken-link check's finding, not
 * duplicated here; direction is still checked on the linking side.
 *
 * Rels stay free text everywhere else: on a non-source, the bare words
 * tests/supports/refutes keep their ordinary meaning (a WO "supports" a
 * requirement — the bundled demo does exactly that) and are never flagged.
 * What IS flagged from a non-source is the two unambiguous mistakes: an
 * outcome rel pointing *at a source* (the evidence edge written backwards)
 * and any use of `outcome-of`, a rel this feature coins.
 */
export function checkOutcomeLinks(documents: VeriDocument[]): Issue[] {
  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  const issues: Issue[] = [];
  const flag = (doc: VeriDocument, link: { id: string; rel: string }, message: string): void => {
    issues.push({ kind: 'invalid-outcome-link', file: doc.file, id: doc.id, targetId: link.id, rel: link.rel, message });
  };
  for (const doc of documents) {
    for (const link of doc.links) {
      const outcome = isOutcomeRel(link.rel);
      if (!outcome && link.rel !== OUTCOME_OF_REL) continue;
      const target = byId.get(link.id);
      if (doc.type === 'source') {
        const expected = outcome ? 'requirement' : 'work-order';
        if (target !== undefined && target.type !== expected) {
          flag(doc, link, `${doc.id} links to ${link.id} (a ${target.type}) with rel "${link.rel}", which must target a ${expected}`);
        }
      } else if (outcome && target?.type === 'source') {
        flag(doc, link, `${doc.id} links to source ${link.id} with rel "${link.rel}" — an outcome link points the other way: the source links the requirement it ${link.rel} (REQ-033)`);
      } else if (!outcome) {
        flag(doc, link, `${doc.id} links to ${link.id} with rel "outcome-of", which belongs to sources — evidence enters as a SRC linked to the work order that shipped it (REQ-033)`);
      }
    }
  }
  return issues;
}

/**
 * The untested bet (REQ-033, WO-115): a hypothesis requirement whose linked
 * work orders have all shipped but on which no outcome source has reported.
 * Advisory — never an issue — because the open loop must inform, not block:
 * Veri makes the question unavoidable; a human judges the answer. It stays
 * silent for constraints (verified by acceptance criteria, not outcomes),
 * for hypotheses with open work orders (the bet is still shipping), for
 * hypotheses no work order has picked up (nothing has shipped to observe),
 * and once any source links the requirement with tests/supports/refutes.
 * Withdrawn and retired requirements are out of play, and withdrawn work
 * orders count as never started (DEC-110).
 */
export function checkUntestedBets(documents: VeriDocument[]): Advisory[] {
  const advisories: Advisory[] = [];
  const tested = new Set<string>();
  for (const doc of documents) {
    if (doc.type !== 'source' || isWithdrawn(doc)) continue;
    for (const link of doc.links) if (isOutcomeRel(link.rel)) tested.add(link.id);
  }
  const workOrders = documents.filter((doc) => doc.type === 'work-order' && !isWithdrawn(doc));
  for (const doc of documents) {
    if (doc.type !== 'requirement' || isWithdrawn(doc) || doc.status === 'retired') continue;
    if (requirementKind(doc) !== 'hypothesis' || tested.has(doc.id)) continue;
    const linked = workOrders
      .filter((wo) => wo.links.some((link) => link.id === doc.id) || doc.links.some((link) => link.id === wo.id))
      .sort((a, b) => compareIds(a.id, b.id));
    if (linked.length === 0 || !linked.every((wo) => wo.status === 'done')) continue;
    const ids = linked.map((wo) => wo.id);
    advisories.push({
      kind: 'untested-bet',
      file: doc.file,
      id: doc.id,
      workOrderIds: ids,
      message: `${doc.id} is a hypothesis and its work ${ids.length === 1 ? 'order' : 'orders'} (${ids.join(', ')}) ${ids.length === 1 ? 'is' : 'are all'} done, but no outcome source reports what reality said — an untested bet; file the evidence as a SRC linked ${OUTCOME_RELS.join('/')} to ${doc.id}`,
    });
  }
  return advisories;
}

/** Whether either work order declares the other — a frontmatter link or an
    inline [[ref]] in either direction. A declared chain under one identity
    is a session deep in a prerequisite it split out, not a collision. */
function chained(a: VeriDocument, b: VeriDocument): boolean {
  return (
    a.links.some((link) => link.id === b.id) ||
    b.links.some((link) => link.id === a.id) ||
    a.inlineRefs.includes(b.id) ||
    b.inlineRefs.includes(a.id)
  );
}

/**
 * One session, one work order (WO-099): the worktree-per-work-order
 * convention means an identity holding two unrelated in-progress claims is
 * either a forgotten claim or two sessions sharing a name. Work orders that
 * reference each other are exempt — starting a discovered prerequisite is
 * deliberate nesting. Advisory — a human maintainer legitimately juggling
 * two is informed, never blocked.
 */
export function checkSharedClaims(documents: VeriDocument[]): Advisory[] {
  const held = new Map<string, VeriDocument[]>();
  for (const doc of documents) {
    if (doc.type !== 'work-order' || doc.status !== 'in-progress' || doc.claimedBy === undefined) continue;
    const group = held.get(doc.claimedBy) ?? [];
    group.push(doc);
    held.set(doc.claimedBy, group);
  }
  const advisories: Advisory[] = [];
  for (const [claimedBy, group] of held) {
    if (group.length < 2) continue;
    const sorted = group.sort((a, b) => compareIds(a.id, b.id));
    for (const [at, doc] of sorted.entries()) {
      if (at === 0) continue;
      const earlier = sorted.slice(0, at);
      if (earlier.some((other) => chained(doc, other))) continue;
      const first = earlier[0]!;
      advisories.push({
        kind: 'shared-claim',
        file: doc.file,
        id: doc.id,
        otherId: first.id,
        claimedBy,
        message: `${doc.id} and ${first.id} are both in-progress under the claim "${claimedBy}" with no link between them — one session holds one work order; finish or release one`,
      });
    }
  }
  return advisories;
}

const RECEIPT_DATE_RE = /^\s*[-*]\s+(\d{4}-\d{2}-\d{2})/gm;

/**
 * Stale claims (WO-099): a claimed in-progress work order whose newest sign
 * of life — the claim date or any receipt date — is older than the project's
 * staleness window (the WO-088 `stale_after_days` knob; one knob, one
 * meaning of "silence"). Pure over documents plus a host-provided today
 * (DEC-076), so unlike binding staleness it needs no git and runs on every
 * surface, the subprocess-free MCP server included.
 */
export function checkStaleClaims(documents: VeriDocument[], today: string, windowDays: number): Advisory[] {
  const advisories: Advisory[] = [];
  for (const doc of documents) {
    if (doc.type !== 'work-order' || doc.status !== 'in-progress' || doc.claimedAt === undefined) continue;
    const section = receiptsSection(doc.body) ?? '';
    const dates = [doc.claimedAt, ...[...section.matchAll(RECEIPT_DATE_RE)].map((match) => match[1]!)];
    const newest = dates.sort().at(-1)!;
    if (daysBetween(newest, today) < windowDays) continue;
    const since = newest === doc.claimedAt ? `was claimed ${newest}` : `last filed a receipt ${newest}`;
    advisories.push({
      kind: 'stale-claim',
      file: doc.file,
      id: doc.id,
      message: `${doc.id} is in-progress under "${doc.claimedBy}" but ${since} with no receipt since — stale after ${windowDays} days`,
    });
  }
  return advisories;
}

/**
 * The product layer's placement rule (REQ-037, WO-121): veri/product/ holds
 * exactly the sanctioned gated singletons — gated or derived, never freeform.
 * A product document anywhere but its sanctioned path is unplaceable (there
 * is no fifth singleton to be), and any other type parked inside product/
 * smuggles ungated content into the layer. Frontmatter-less files there
 * already fail the load as invalid-frontmatter.
 */
export function checkProductFiles(documents: VeriDocument[]): Issue[] {
  const issues: Issue[] = [];
  const sanctioned = new Set<string>(PRODUCT_FILES);
  for (const doc of documents) {
    if (doc.type === 'product' && !sanctioned.has(doc.file)) {
      issues.push({
        kind: 'product-file',
        file: doc.file,
        id: doc.id,
        message: `${doc.id} is a product document but ${doc.file} is not a sanctioned singleton — the product layer is exactly ${PRODUCT_FILES.join(', ')} (REQ-037)`,
      });
    }
    if (doc.type !== 'product' && doc.file.startsWith('product/')) {
      issues.push({
        kind: 'product-file',
        file: doc.file,
        id: doc.id,
        message: `${doc.id} is a ${doc.type} filed under product/ — that directory holds only the gated product singletons (REQ-037)`,
      });
    }
  }
  return issues;
}

/**
 * The intuition-only bet (REQ-038, WO-122): an accepted requirement with no
 * `derived-from` link to any existing source and no inbound outcome
 * evidence. Advisory, never an issue: intuition is a legitimate origin, but
 * it should be visible until evidence lands or the requirement leaves play.
 * Drafts are exempt — a proposal is not yet a bet; the gate crossing into
 * accepted is where the origin question starts to matter. The front-side
 * mirror of checkUntestedBets.
 */
export function checkIntuitionOnly(documents: VeriDocument[]): Advisory[] {
  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  // Inbound outcome evidence (REQ-033): a source reporting tests/supports/
  // refutes on a requirement is evidence too — a tested bet is not an
  // intuition-only one, whatever its origin links say.
  const reportedOn = new Set<string>();
  for (const doc of documents) {
    if (doc.type !== 'source' || isWithdrawn(doc)) continue;
    for (const link of doc.links) {
      if (isOutcomeRel(link.rel)) reportedOn.add(link.id);
    }
  }
  const advisories: Advisory[] = [];
  for (const doc of documents) {
    if (doc.type !== 'requirement' || doc.status !== 'accepted') continue;
    if (reportedOn.has(doc.id)) continue;
    const hasEvidence = doc.links.some(
      (link) => link.rel === 'derived-from' && byId.get(link.id)?.type === 'source',
    );
    if (hasEvidence) continue;
    advisories.push({
      kind: 'intuition-only',
      file: doc.file,
      id: doc.id,
      message: `${doc.id} has no derived-from link to any source — an intuition-only bet; link the evidence it came from, or retire it if reality never asked for it (REQ-038)`,
    });
  }
  return advisories;
}

/** Days of silence before an accepted current-focus counts as stale
    (REQ-037). Project-tunable as `focus_stale_after_days` on the workflow
    document; a deliberately separate knob from the binding detectors'
    `stale_after_days`, whose silence is about code, not intent. */
export const DEFAULT_FOCUS_STALE_AFTER_DAYS = 14;

export function focusStaleAfterDays(documents: VeriDocument[]): number {
  for (const doc of documents) {
    if (doc.type !== 'workflow' || doc.status === 'retired') continue;
    const days = doc.frontmatter['focus_stale_after_days'];
    if (typeof days === 'number' && Number.isInteger(days) && days > 0) return days;
  }
  return DEFAULT_FOCUS_STALE_AFTER_DAYS;
}

/**
 * The current-focus staleness advisory (REQ-037, WO-121): an accepted focus
 * that was last touched outside the window, or whose referenced work orders
 * have all finished, has stopped describing the present — it cannot quietly
 * lie. Pure over documents plus the host's today (DEC-076), like
 * checkStaleClaims. Drafts are exempt: a pending focus already sits in the
 * approval queue.
 */
export function checkStaleFocus(documents: VeriDocument[], today: string, windowDays: number): Advisory[] {
  const focus = documents.find((doc) => doc.type === 'product' && doc.file === CURRENT_FOCUS_FILE);
  if (focus === undefined || focus.status !== 'accepted') return [];

  if (daysBetween(focus.updated, today) >= windowDays) {
    return [
      {
        kind: 'stale-focus',
        file: focus.file,
        id: focus.id,
        message: `${focus.id} (current focus) was last updated ${focus.updated}, over ${windowDays} days ago — restate or reaffirm what the project is steering toward (edit it, then re-approve)`,
      },
    ];
  }

  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  const referenced = focus.inlineRefs
    .map((id) => byId.get(id))
    .filter((doc): doc is VeriDocument => doc !== undefined && doc.type === 'work-order');
  if (referenced.length > 0 && referenced.every((doc) => doc.status === 'done' || isWithdrawn(doc))) {
    return [
      {
        kind: 'stale-focus',
        file: focus.file,
        id: focus.id,
        message: `${focus.id} (current focus) references only finished work orders (${referenced.map((doc) => doc.id).join(', ')}) — the focus it describes has shipped; restate what comes next`,
      },
    ];
  }
  return [];
}

/** The design gate's trigger paths, declared as `design_gate_paths` on the
    workflow document (DEC-039) — core carries nothing specific to any repo's
    layout; with none declared every gate tier is inert. */
export function designGatePaths(documents: VeriDocument[]): string[] {
  return documents
    .filter((doc) => doc.type === 'workflow' && doc.status !== 'retired')
    .flatMap((doc) => (doc.frontmatter['design_gate_paths'] as string[] | undefined) ?? []);
}

/** The design gate applies once a work order leaves backlog and is not
    withdrawn — unchanged since WO-010: promotion is when the claim starts
    to matter. */
function designGateApplies(doc: VeriDocument): boolean {
  return doc.type === 'work-order' && doc.status !== 'backlog' && !isWithdrawn(doc);
}

/** What satisfies every tier of the gate: at least one designed-by link whose
    target exists (DEC-012, DEC-026). A designed-by link to a missing id does
    not satisfy it; the broken-link check reports that link separately. */
function hasDesign(doc: VeriDocument, ids: Set<string>): boolean {
  return doc.links.some((link) => link.rel === 'designed-by' && ids.has(link.id));
}

/** Does a `binds: paths:` declaration claim a design-gated path? True when a
    pattern's text names the gated path or its glob matches the gated
    directory — `packages/ui`, `packages/ui/src/**`, and `packages/**` all
    claim gated `packages/ui`. */
export function bindsClaimGatedPath(patterns: string[], gatePath: string): boolean {
  const gate = gatePath.replace(/\/+$/, '');
  if (gate === '') return false;
  return patterns.some((pattern) => pattern.includes(gate) || pathMatchesBinds(gate, [pattern]));
}

/** Is a committed file under a gated path, read as a repo-root directory
    prefix (DEC-114)? */
function fileUnderGatePath(file: string, gatePath: string): boolean {
  const gate = gatePath.replace(/\/+$/, '');
  return gate !== '' && (file === gate || file.startsWith(`${gate}/`));
}

/**
 * The design gate, machine-checked (WO-010): a work order out of backlog
 * that claims a design-gated path must link at least one existing
 * document with rel "designed-by" (DEC-012). The trigger paths are
 * project-defined (`design_gate_paths` on the workflow document, DEC-039);
 * with none declared the gate is inert.
 *
 * The issue tier's evidence is the work order's own `binds: paths:`
 * declaration (WO-113, DEC-114) — pure and available pre-flight, so every
 * surface (veri check, run_check over MCP, the app) reaches the same verdict.
 * Body-text mention is no longer issue evidence: it survives only as the
 * `design-mention` advisory (checkDesignGateMentions), and what the commits
 * actually touched is the git-backed `design-undeclared-touch` advisory
 * (checkDesignGateDiff).
 */
export function checkDesignGate(documents: VeriDocument[]): Issue[] {
  const paths = designGatePaths(documents);
  if (paths.length === 0) return [];
  const ids = new Set(documents.map((doc) => doc.id));
  const issues: Issue[] = [];
  for (const doc of documents) {
    if (!designGateApplies(doc)) continue;
    const claimed = paths.find((path) => bindsClaimGatedPath(doc.binds?.paths ?? [], path));
    if (claimed === undefined) continue;
    if (!hasDesign(doc, ids)) {
      issues.push({
        kind: 'ui-wo-without-design',
        file: doc.file,
        id: doc.id,
        message: `work order ${doc.id} declares design-gated ${claimed} in binds.paths but links no designed-by design document — this project's workflow requires the design first`,
      });
    }
  }
  return issues;
}

/**
 * The v1 mention heuristic, demoted to an advisory (WO-113, DEC-114): a
 * started work order that declares no binds paths, links no design, and whose
 * prose names a gated path gets a nudge to declare or design — the honest
 * pre-commit case the declaration tier cannot see. `## Out of scope` stays
 * excluded (WO-112: an exclusion is a promise, not a claim), and `## Receipts`
 * joins it — receipts record history, which the diff tier reads directly. A
 * work order that declares binds has spoken; its prose is no longer evidence.
 */
export function checkDesignGateMentions(documents: VeriDocument[]): Advisory[] {
  const paths = designGatePaths(documents);
  if (paths.length === 0) return [];
  const ids = new Set(documents.map((doc) => doc.id));
  const advisories: Advisory[] = [];
  for (const doc of documents) {
    if (!designGateApplies(doc)) continue;
    if ((doc.binds?.paths.length ?? 0) > 0 || hasDesign(doc, ids)) continue;
    const prose = withoutSection(withoutSection(doc.body, 'Out of scope'), 'Receipts');
    const mentioned = paths.find((path) => prose.includes(path));
    if (mentioned === undefined) continue;
    advisories.push({
      kind: 'design-mention',
      file: doc.file,
      id: doc.id,
      path: mentioned,
      message: `${doc.id}'s prose names design-gated ${mentioned} but it declares no binds.paths and links no designed-by document — if the work touches it, declare the path in binds.paths or link the design (evidence: body text only)`,
    });
  }
  return advisories;
}

/**
 * The diff tier of the design gate (WO-113, DEC-114): an in-progress work
 * order whose claimed commits (the WO-nnn: subject convention) touched a file
 * under a gated path, without a covering binds declaration and without a
 * designed-by link, did gated work while declaring nothing — the false
 * negative the declaration tier cannot see. Pure over documents plus
 * host-collected GitFacts (DEC-040); advisory-tier because the git tier is
 * unavailable over MCP (DEC-081) and an issue only some surfaces could
 * compute would fork the gate's verdict. In-progress only: auditing closed
 * work orders retroactively is out of WO-113's scope.
 */
export function checkDesignGateDiff(documents: VeriDocument[], facts: GitFacts): Advisory[] {
  const paths = designGatePaths(documents);
  if (paths.length === 0) return [];
  const ids = new Set(documents.map((doc) => doc.id));
  const byWorkOrder = commitsByWorkOrder(facts);
  const advisories: Advisory[] = [];
  for (const doc of documents) {
    if (doc.type !== 'work-order' || doc.status !== 'in-progress' || isWithdrawn(doc)) continue;
    if (hasDesign(doc, ids)) continue;
    const commits = byWorkOrder.get(doc.id) ?? [];
    for (const path of paths) {
      if (bindsClaimGatedPath(doc.binds?.paths ?? [], path)) continue;
      const commit = commits.find((entry) => entry.files.some((file) => fileUnderGatePath(file, path)));
      if (commit === undefined) continue;
      const file = commit.files.find((entry) => fileUnderGatePath(entry, path))!;
      advisories.push({
        kind: 'design-undeclared-touch',
        file: doc.file,
        id: doc.id,
        sha: commit.sha,
        path,
        message: `${doc.id}'s commit ${commit.sha.slice(0, 7)} touched design-gated ${file} but the work order neither declares ${path} in binds.paths nor links a designed-by document (evidence: the commit diff)`,
      });
    }
  }
  return advisories;
}

/**
 * A document whose status carries approval weight (REQ-008). A ready work
 * order is promoted — the status only exists via the stamp (WO-098) — but a
 * started one is not: execution spends the clearance, and historical work
 * orders that never passed through ready stay valid without a stamp.
 */
function isPromoted(doc: VeriDocument): boolean {
  return (
    (doc.type === 'requirement' && doc.status === 'accepted') ||
    (doc.type === 'decision' && doc.status === 'active') ||
    (doc.type === 'workflow' && doc.status === 'accepted') ||
    (doc.type === 'work-order' && doc.status === 'ready')
  );
}

/**
 * The maintainer roster (DEC-071): free-form display names declared on the
 * workflow document's frontmatter, the established home for project config
 * (design_gate_paths, the DEC-059 module registry). Empty means solo — team
 * semantics stay inert.
 */
export function maintainerRegistry(documents: VeriDocument[]): string[] {
  return documents
    .filter((doc) => doc.type === 'workflow' && doc.status !== 'retired')
    .flatMap((doc) => (doc.frontmatter['maintainers'] as string[] | undefined) ?? []);
}

/**
 * DEC-071's hard tier: in a project that declares maintainers, a stamp
 * attributed to someone not on the list is an issue — misattribution fails
 * where mere absence only warns (see checkMissingApprovers).
 */
export function checkApprovers(documents: VeriDocument[]): Issue[] {
  const maintainers = maintainerRegistry(documents);
  if (maintainers.length === 0) return [];
  const issues: Issue[] = [];
  for (const doc of documents) {
    if (doc.approvedBy !== undefined && !maintainers.includes(doc.approvedBy)) {
      issues.push({
        kind: 'unknown-approver',
        file: doc.file,
        id: doc.id,
        approver: doc.approvedBy,
        message: `${doc.id} is approved by "${doc.approvedBy}", who is not in the workflow's maintainers list (${maintainers.join(', ')})`,
      });
    }
  }
  return issues;
}

/**
 * DEC-071's soft tier: a promoted document with no approved_by in a
 * maintainers project. Advisory by design — every stamp made before the
 * team formed is grandfathered as a warning, never a failure (DEC-025).
 */
export function checkMissingApprovers(documents: VeriDocument[]): Advisory[] {
  const maintainers = maintainerRegistry(documents);
  if (maintainers.length === 0) return [];
  const advisories: Advisory[] = [];
  for (const doc of documents) {
    if (isPromoted(doc) && doc.approved !== undefined && doc.approvedBy === undefined) {
      advisories.push({
        kind: 'missing-approver',
        file: doc.file,
        id: doc.id,
        message: `${doc.id} is ${doc.status} but its stamp names no approver — this project declares maintainers; re-approve with veri approve ${doc.id} --as <name> to attribute it`,
      });
    }
  }
  return advisories;
}

export function checkApprovalStamps(documents: VeriDocument[]): Issue[] {
  const issues: Issue[] = [];
  for (const doc of documents) {
    if (isPromoted(doc) && doc.approved === undefined) {
      issues.push({
        kind: 'missing-approval',
        file: doc.file,
        id: doc.id,
        message: `${doc.id} is ${doc.status} but has no approved: date — promotion requires the user's stamp`,
      });
    }
  }
  return issues;
}

const UNCHECKED_BOX_RE = /^\s*[-*]\s+\[ \]/m;
const LIST_ITEM_RE = /^\s*[-*]\s+\S/m;

export function receiptsSection(body: string): string | null {
  return sectionText(body, 'Receipts');
}

/** A receipt is any list item under the "## Receipts" heading. */
export function hasReceipt(body: string): boolean {
  const section = receiptsSection(body);
  return section !== null && LIST_ITEM_RE.test(section);
}

export function checkDoneWorkOrders(documents: VeriDocument[]): Issue[] {
  const issues: Issue[] = [];
  for (const doc of documents) {
    if (doc.type !== 'work-order' || doc.status !== 'done') continue;
    if (UNCHECKED_BOX_RE.test(doc.body)) {
      issues.push({
        kind: 'done-wo-violation',
        file: doc.file,
        id: doc.id,
        problem: 'unchecked-criteria',
        message: `work order ${doc.id} is done but has unchecked acceptance criteria`,
      });
    }
    if (!hasReceipt(doc.body)) {
      issues.push({
        kind: 'done-wo-violation',
        file: doc.file,
        id: doc.id,
        problem: 'no-receipt',
        message: `work order ${doc.id} is done but has no receipt`,
      });
    }
  }
  return issues;
}

const SECTION_HEADING_RE = /^##\s+(.+?)\s*$/;

function sectionHeadings(body: string): string[] {
  return body
    .split('\n')
    .map((line) => SECTION_HEADING_RE.exec(line)?.[1])
    .filter((heading): heading is string => heading !== undefined);
}

/**
 * The `##` headings of a type's effective template, in order (DEC-025):
 * the single structure source per project. Read fresh from disk on every
 * call (DEC-002). A template with no `##` headings expects nothing.
 */
export function expectedSections(veriDir: string | URL, type: DocType): string[] {
  return sectionHeadings(getTemplate(veriDir, type).body);
}

/** Expected sections a document's body does not have, in template order. */
export function missingSections(veriDir: string | URL, doc: Pick<VeriDocument, 'type' | 'body'>): string[] {
  const present = new Set(sectionHeadings(doc.body));
  return expectedSections(veriDir, doc.type).filter((section) => !present.has(section));
}

/**
 * Structure findings (REQ-006 at DEC-025's advisory severity): one advisory
 * per expected-but-missing section. Never issues — template divergence must
 * not fail a document (DEC-023).
 */
export function checkStructure(veriDir: string | URL, documents: VeriDocument[]): Advisory[] {
  const advisories: Advisory[] = [];
  for (const doc of documents) {
    for (const section of missingSections(veriDir, doc)) {
      advisories.push({
        kind: 'missing-section',
        file: doc.file,
        id: doc.id,
        section,
        message: `${doc.id} has no "## ${section}" section — the ${doc.type} template expects one`,
      });
    }
  }
  return advisories;
}

/**
 * REQ-015: a newer or unreadable format is an issue — operating on it risks
 * misparse. Older and pre-marker are NOT issues: those projects always
 * worked and must keep opening; the check report names them and the
 * available migration, nothing more.
 */
export function checkFormat(format: FormatClassification): Issue[] {
  if (format.kind !== 'newer' && format.kind !== 'invalid') return [];
  return [
    {
      kind: 'format-mismatch',
      file: FORMAT_FILE,
      problem: format.kind,
      message: formatStatement(format) ?? 'format mismatch',
    },
  ];
}

export interface CheckResult {
  issues: Issue[];
  advisories: Advisory[];
}

/**
 * Everything check knows about the project: load-time issues plus all pure
 * checks, and the advisory tier (DEC-025) — reported separately so
 * advisories can never affect the issue count, exit codes, or gates.
 */
export function checkProject(load: LoadResult): CheckResult {
  return {
    issues: [
      ...load.issues,
      ...checkFormat(load.format),
      ...checkDuplicateIds(load.documents),
      ...checkBrokenLinks(load.documents),
      ...checkWorkOrderRequirements(load.documents),
      ...checkStampedBacklog(load.documents),
      ...checkHypothesisOutcomes(load.documents),
      ...checkOutcomeLinks(load.documents),
      ...checkUnclaimedWorkOrders(load.documents),
      ...checkDoneWorkOrders(load.documents),
      ...checkGatedWorkOrders(load.documents),
      ...checkDesignGate(load.documents),
      ...checkProductFiles(load.documents),
      ...checkApprovalStamps(load.documents),
      ...checkApprovers(load.documents),
      ...checkArchitecture(load.documents),
    ],
    // The pure advisory tier. Git-backed advisories (receipt verification,
    // WO-044; git drift, WO-045) are pushed by hosts that collect facts
    // (DEC-040) — never here, so pure callers stay subprocess-free.
    advisories: [
      ...checkStructure(load.dir, load.documents),
      ...checkSupersededLinks(load.documents),
      ...checkMissingApprovers(load.documents),
      ...checkSharedClaims(load.documents),
      ...checkUntestedBets(load.documents),
      ...checkIntuitionOnly(load.documents),
      ...checkDesignGateMentions(load.documents),
      // Stale claims need a clock (host territory, DEC-076) — deriveFindings
      // adds checkStaleClaims with the host's today.
    ],
  };
}
