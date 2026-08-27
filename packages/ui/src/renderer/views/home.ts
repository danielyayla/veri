/** Home view (WO-015, SRC-005 layer 4): the default tab — Health, In flight,
    Agent activity, Recently changed. Every row opens its doc as a preview. */
import { h } from '../dom.ts';
import { TYPE_META, statusColor } from '../theme.ts';
import { currentBets, importBatches, importGroupLabel, inFlight, isPending, issueDocId, pendingDocs, projectActivity, recentlyChanged, recentlyLearned } from '../derive.ts';
import { archSummary } from '../archderive.ts';
import { isLiving } from '../sidebar.ts';
import type { Ctx } from '../app.ts';

function card(head: HTMLElement[], rows: Array<HTMLElement | null>, empty: string): HTMLElement {
  const filled = rows.filter((r) => r !== null);
  return h(
    'div',
    { class: 'hv-card' },
    h('div', { class: 'hv-card-head' }, ...head),
    ...(filled.length > 0 ? filled : [h('div', { class: 'hv-empty' }, empty)]),
  );
}

const label = (text: string): HTMLElement => h('span', { class: 'hv-label' }, text);
const dot = (color: string): HTMLElement => h('span', { class: 'hv-dot', style: `background:${color};` });

/** The path-of-work row's four mini-cards (WO-030, SRC-013). */
const PATH_OF_WORK: Array<[string, string, string]> = [
  ['sources', 'var(--t-src)', 'Evidence in: notes, specs, transcripts'],
  ['requirements', 'var(--t-req)', 'What must be true'],
  ['decisions', 'var(--t-dec)', 'What was chosen, and why'],
  ['work orders', 'var(--ember)', 'Work an agent can pick up'],
];

/**
 * START HERE (WO-030, SRC-013 surface 2): teaches the path of work in a
 * project with zero non-workflow documents. Derives from the snapshot on
 * every render — no dismiss control, no stored flag (DEC-002) — and shares
 * the NEEDS REVIEW slot (they cannot coexist: nothing is pending here).
 */
function startHereCard(ctx: Ctx): HTMLElement {
  const steps: HTMLElement[] = [];
  PATH_OF_WORK.forEach(([name, color, hint], i) => {
    if (i > 0) steps.push(h('span', { class: 'hv-sh-arrow' }, '→'));
    steps.push(
      h(
        'div',
        { class: 'hv-sh-step' },
        h('div', { class: 'hv-sh-step-name', style: `color:${color};` }, name),
        h('div', { class: 'hv-sh-step-hint' }, hint),
      ),
    );
  });
  return h(
    'div',
    { class: 'hv-card hv-card-review hv-sh' },
    h('div', { class: 'hv-sh-eyebrow' }, 'START HERE'),
    h('div', { class: 'hv-sh-heading' }, 'This project is empty — evidence comes first.'),
    h('div', { class: 'hv-sh-path' }, ...steps),
    h(
      'div',
      { class: 'hv-sh-actions' },
      h('button', { class: 'btn-reset hv-sh-btn-primary', fkey: 'sh-new', onClick: () => ctx.openNewDoc('requirement', null) }, 'New document'),
      h('button', { class: 'btn-reset hv-sh-btn-ghost', fkey: 'sh-agent', onClick: () => ctx.openSettings('agent') }, 'Connect an agent →'),
    ),
    h(
      'div',
      { class: 'hv-sh-caption' },
      'Or let your agent file documents for you — the MCP connection gives it ',
      h('span', { class: 'hv-sh-code' }, 'file_decision'),
      ' and ',
      h('span', { class: 'hv-sh-code' }, 'file_receipt'),
      '.',
    ),
  );
}

/**
 * START HERE, brownfield variant (WO-075, SRC-039 entry 1a): the folder has
 * code, the knowledge base is empty — import leads. "Start from scratch"
 * collapses to the greenfield card for this session only; nothing persisted.
 */
function brownfieldStartCard(ctx: Ctx): HTMLElement {
  const steps: HTMLElement[] = [];
  PATH_OF_WORK.forEach(([name, color, hint], i) => {
    if (i > 0) steps.push(h('span', { class: 'hv-sh-arrow' }, '→'));
    steps.push(
      h(
        'div',
        { class: 'hv-sh-step' },
        h('div', { class: 'hv-sh-step-name', style: `color:${color};` }, name),
        h('div', { class: 'hv-sh-step-hint' }, hint),
      ),
    );
  });
  return h(
    'div',
    { class: 'hv-card hv-card-review hv-sh' },
    h('div', { class: 'hv-sh-eyebrow' }, 'START HERE'),
    h('div', { class: 'hv-sh-heading' }, 'This repo has a history. Veri can read it.'),
    h('div', { class: 'hv-sh-path' }, ...steps),
    h(
      'div',
      { class: 'hv-sh-actions' },
      h('button', { class: 'btn-reset hv-sh-btn-primary', fkey: 'sh-import', onClick: () => ctx.openImport() }, 'Import project knowledge'),
      h(
        'button',
        { class: 'btn-reset hv-sh-btn-ghost', fkey: 'sh-scratch', onClick: () => ctx.update({ importOfferDismissed: true }) },
        'Start from scratch',
      ),
    ),
    h(
      'div',
      { class: 'hv-sh-caption' },
      'Your connected agent reads this repo and files proposals — nothing becomes binding until you approve it.',
    ),
  );
}

export function homeView(ctx: Ctx): HTMLElement {
  const open = (id: string | null) => (e: MouseEvent) => {
    if (id !== null) ctx.openDoc(id, { preview: true, background: e.metaKey || e.ctrlKey });
  };
  // Rows with a target become real buttons (SRC-019 rule 1); targetless
  // feed rows stay inert divs rather than lying to the keyboard.
  let rowSeq = 0;
  const row = (id: string | null, cls: string, ...children: Array<HTMLElement | null>): HTMLElement =>
    id !== null
      ? h('button', { class: `btn-reset btn-block ${cls}`, fkey: `hv:${id}:${rowSeq++}`, onClick: open(id) }, ...children)
      : h('div', { class: cls }, ...children);
  const idColor = (id: string): string => {
    const doc = ctx.byId.get(id);
    return doc !== undefined ? TYPE_META[doc.type].color : 'var(--secondary)';
  };

  // "Empty" = zero non-workflow documents (SRC-013) — the state every new
  // non-demo project starts in (a fresh project holds exactly WF-001).
  const empty = ctx.snap.documents.every((d) => d.type === 'workflow');

  // NEEDS REVIEW (SRC-006): full-width above the grid, hidden when empty.
  // Imported documents group under their manifest (WO-075, SRC-039 surface
  // 3): evidence sources lead as uncounted context, pending claims follow.
  const pending = pendingDocs(ctx.snap);
  const pendingRow = (d: (typeof pending)[number]): HTMLElement =>
    row(
      d.id,
      'hv-row',
      h('span', { class: 'hv-id', style: `color:${TYPE_META[d.type].color};` }, d.id),
      h('span', { class: 'hv-flight-title' }, d.title),
      h('span', { class: 'gate-chip gate-chip-static' }, d.status),
      h('span', { class: 'hv-time' }, `filed ${ctx.rel(d.created)}`),
    );
  const batches = importBatches(ctx.snap).filter((b) => b.claims.some(isPending));
  const grouped = new Set(batches.flatMap((b) => b.claims.map((c) => c.id)));
  const groupSections = batches.flatMap((b) => [
    h(
      'div',
      { class: 'hv-imp-head' },
      h('span', { class: 'hv-imp-swatch' }),
      h('span', { class: 'hv-imp-label' }, `IMPORTED · ${importGroupLabel(b.manifest).toUpperCase()}`),
      h('span', { class: 'hv-imp-prog' }, `${b.reviewed} of ${b.claims.length} reviewed`),
    ),
    // Evidence is context, not queue: src-tinted chip, no pending status,
    // excluded from every count (SRC-039 — sources are never approvable).
    ...b.evidence.map((d) =>
      row(
        d.id,
        'hv-row',
        h('span', { class: 'hv-id', style: `color:${TYPE_META[d.type].color};` }, d.id),
        h('span', { class: 'hv-flight-title' }, d.title),
        h('span', { class: 'hv-imp-evidence' }, 'evidence'),
        h('span', { class: 'hv-time' }, `filed ${ctx.rel(d.created)}`),
      ),
    ),
    ...b.claims
      .filter(isPending)
      .sort((a, c) => (a.type === c.type ? a.created.localeCompare(c.created) : a.type === 'requirement' ? -1 : 1))
      .map(pendingRow),
  ]);
  const ungrouped = pending.filter((d) => !grouped.has(d.id));
  const reviewCard = empty
    ? ctx.snap.brownfield && !ctx.state.importOfferDismissed
      ? brownfieldStartCard(ctx)
      : startHereCard(ctx)
    : pending.length === 0
      ? null
      : h(
          'div',
          { class: 'hv-card hv-card-review' },
          h(
            'div',
            { class: 'hv-card-head' },
            dot('var(--amber)'),
            h('span', { class: 'hv-label', style: 'color:var(--amber);' }, 'AWAITING JUDGMENT'),
            h('span', { class: 'hv-meta' }, `${pending.length} gate crossing${pending.length === 1 ? '' : 's'}`),
          ),
          ...groupSections,
          ...ungrouped.map(pendingRow),
        );

  // CURRENT BETS (WO-117, SRC-053): accepted hypothesis requirements with
  // their outcome target, shipping state, and epistemic state. Full-width
  // under the judgment queue; renders its teaching empty state even at zero
  // so the section teaches the vocabulary (the SRC-013 posture).
  const bets = currentBets(ctx.snap);
  const betState = (bet: (typeof bets)[number]): HTMLElement | null =>
    bet.untested
      ? h('span', { class: 'hv-bet-untested', title: 'All linked work orders are done, but no outcome source reports what reality said' }, '● untested bet')
      : bet.evidence.length > 0
        ? h('span', { class: 'hv-bet-evidence' }, `evidence: ${bet.evidence.map((e) => `${e.id} ${e.rel}`).join(', ')}`)
        : null;
  const betsCard = h(
    'div',
    { class: 'hv-card hv-card-bets' },
    h(
      'div',
      { class: 'hv-card-head' },
      dot('var(--t-req)'),
      label('CURRENT BETS'),
      h('span', { class: 'hv-meta' }, `${bets.length} ${bets.length === 1 ? 'hypothesis' : 'hypotheses'}`),
    ),
    ...(bets.length > 0
      ? bets.map((bet) =>
          row(
            bet.id,
            'hv-row',
            h('span', { class: 'hv-id', style: 'color:var(--t-req);' }, bet.id),
            h('span', { class: 'hv-flight-title' }, bet.title),
            bet.outcome !== null
              ? h('span', { class: 'hv-bet-outcome', title: 'The outcome that would confirm or refute this bet' }, `→ ${bet.outcome}`)
              : h('span', { class: 'hv-bet-outcome hv-bet-outcome-missing' }, 'no outcome declared'),
            betState(bet),
            h(
              'span',
              {
                class: 'hv-bet-wos',
                // Shipped ≠ proven: while the bet is untested, a finished WO
                // count must not read as success (SRC-055).
                style:
                  bet.woTotal === 0
                    ? 'color:var(--faint);'
                    : bet.woDone === bet.woTotal
                      ? bet.untested
                        ? 'color:var(--faint);'
                        : 'color:var(--green);'
                      : 'color:var(--ember);',
              },
              bet.woTotal === 0 ? 'no WOs yet' : `${bet.woDone}/${bet.woTotal} WOs done`,
            ),
          ),
        )
      : [h('div', { class: 'hv-empty' }, 'No bets yet — a requirement with kind: hypothesis and an outcome target becomes a bet')]),
  );

  const issues = ctx.snap.issues;
  // CURRENT BETS owns bet state (SRC-055): an untested-bet advisory whose
  // hypothesis is a bets row above would state the same fact twice.
  const betIds = new Set(bets.map((b) => b.id));
  const advisories = ctx.snap.advisories.filter((a) => !(a.kind === 'untested-bet' && betIds.has(a.id)));
  // The green/amber word and its color follow issues alone (DEC-025); the
  // advisory count is a visually parenthetical grey span (SRC-010).
  const healthMeta = h(
    'span',
    { class: 'hv-meta' },
    h(
      'span',
      { style: issues.length > 0 ? 'color:var(--amber);' : 'color:var(--green);' },
      issues.length > 0 ? `${issues.length} issue${issues.length === 1 ? '' : 's'}` : 'clean',
    ),
    advisories.length > 0 ? h('span', { class: 'hv-adv-count' }, ` · ${advisories.length} advisories`) : null,
  );
  // ADVISORIES sub-tier: grey and hollow, after the issue rows (SRC-010).
  const advisoryTier: HTMLElement[] =
    advisories.length === 0
      ? []
      : [
          ...(issues.length > 0 ? [h('div', { class: 'adv-divider' })] : []),
          h('div', { class: 'adv-label' }, `ADVISORIES · ${advisories.length}`),
          ...advisories.map((a) =>
            row(
              ctx.byId.has(a.id) ? a.id : null,
              'adv-row',
              h('span', { class: 'adv-ring' }),
              h('span', { class: 'adv-kind' }, a.kind),
              h('span', { class: 'hv-id', style: `color:${idColor(a.id)};` }, a.id),
              h('span', { class: 'adv-msg' }, a.message),
            ),
          ),
        ];
  const health = card(
    [dot(issues.length > 0 ? 'var(--amber)' : 'var(--green)'), label('HEALTH'), healthMeta],
    [
      ...issues.map((issue) => {
        const docId = issueDocId(ctx.snap, issue);
        return row(
          docId,
          'hv-row hv-row-top',
          h('span', { class: 'hv-kind' }, issue.kind),
          h(
            'span',
            { class: 'hv-issue' },
            h('span', { class: 'hv-issue-id' }, docId ?? issue.kind),
            h('span', { class: 'hv-issue-msg' }, issue.message),
          ),
        );
      }),
      ...advisoryTier,
    ],
    'No issues — veri check is clean',
  );

  // ARCHITECTURE (WO-068, SRC-036): between HEALTH and IN FLIGHT, only when
  // the module registry is non-empty — the provisional entry point to the
  // Map. One highest-tier line: an issue, else the advisory aggregate, else
  // the explicit checked-and-clean statement. The whole card opens the Map.
  const arch = archSummary(ctx.snap);
  const archCard =
    arch.modules === 0
      ? null
      : h(
          'button',
          {
            class: 'btn-reset btn-block hv-card hv-card-arch',
            label: 'Architecture — open the map',
            fkey: 'hv-arch',
            onClick: () => ctx.openArchitecture('map'),
          },
          h(
            'div',
            { class: 'hv-card-head' },
            dot(arch.top.kind === 'issue' ? 'var(--amber)' : 'var(--faint)'),
            label('ARCHITECTURE'),
            h(
              'span',
              { class: 'hv-meta' },
              `${arch.modules} modules · ${arch.constraints} constraints`,
              arch.advisoryViolations > 0 ? h('span', { class: 'hv-adv-count' }, ` · ${arch.advisoryViolations} violations`) : null,
            ),
          ),
          arch.top.kind === 'issue'
            ? h(
                'div',
                { class: 'hv-row hv-row-top' },
                h('span', { class: 'hv-kind' }, arch.top.issueKind),
                h('span', { class: 'hv-issue' }, h('span', { class: 'hv-issue-msg' }, arch.top.text)),
              )
            : arch.top.kind === 'advisory'
              ? h('div', { class: 'adv-row hv-arch-line' }, h('span', { class: 'adv-ring' }), h('span', { class: 'adv-msg' }, arch.top.text))
              : h('div', { class: 'hv-empty' }, h('span', { style: 'color:var(--green);' }, '✓'), ' observed imports respect every active constraint'),
        );

  const flight = inFlight(ctx.snap);
  const inFlightCard = card(
    [
      dot('var(--ember)'),
      label('IN FLIGHT'),
      h('span', { class: 'hv-meta' }, `${flight.length} work order${flight.length === 1 ? '' : 's'}`),
    ],
    flight.map((wo) =>
      row(
        wo.id,
        'hv-row',
        h('span', { class: 'hv-id hv-id-wo' }, wo.id),
        h('span', { class: 'hv-flight-title' }, wo.title),
        wo.gates.length > 0
          ? h('span', { class: 'gate-chip gate-chip-static', title: `Approve ${wo.gates.join(', ')} first` }, 'gated')
          : null,
        wo.agent ? h('span', { class: 'hv-agent', title: 'Agent execution attached' }, '⌁') : null,
        h(
          'span',
          { class: 'hv-reqs', style: wo.reqCount === 0 ? 'color:var(--amber);' : '' },
          `${wo.reqCount} REQ`,
        ),
        h('span', { class: 'hv-status', style: `color:${statusColor(wo.status)};` }, wo.status),
      ),
    ),
    'Nothing in flight',
  );

  // Session rows (undated, this app run) lead; file-derived rows follow.
  const session = ctx
    .sessionAll()
    .map(({ id, row }) => ({ id, text: row.text, time: row.time }));
  const filed = projectActivity(ctx.snap, ctx.rel, 8 - Math.min(session.length, 4));
  const activityRows = [...session.slice(0, 4), ...filed].slice(0, 8);
  const activityCard = card(
    [h('span', { class: 'hv-agent-glyph' }, '⌁'), label('AGENT ACTIVITY')],
    activityRows.map((r) =>
      row(
        ctx.byId.has(r.id) ? r.id : null,
        'hv-row hv-row-feed',
        h('span', { class: 'hv-id', style: `color:${idColor(r.id)};` }, r.id),
        h('span', { class: 'hv-feed-text' }, r.text),
        h('span', { class: 'hv-time' }, r.time),
      ),
    ),
    'No activity yet',
  );

  // RECENTLY LEARNED (WO-117, SRC-053): newest sources — what most recently
  // entered the evidence door. An outcome source is a split row: the verdict
  // chip is its own button opening the hypothesis it answers; the rest of
  // the row opens the source (one row, two honest targets — never nested
  // buttons).
  const learnedRows = recentlyLearned(ctx.snap, ctx.rel);
  const learnedCard = card(
    [dot('var(--t-src)'), label('RECENTLY LEARNED')],
    learnedRows.map((r) =>
      r.outcome === null
        ? row(
            r.id,
            'hv-row hv-row-feed',
            h('span', { class: 'hv-id', style: 'color:var(--t-src);' }, r.id),
            h('span', { class: 'hv-changed-title' }, r.title),
            h('span', { class: 'hv-time' }, r.time),
          )
        : h(
            'div',
            { class: 'hv-row hv-row-feed hv-row-split' },
            h(
              'button',
              { class: 'btn-reset hv-split-main', fkey: `hv:${r.id}:${rowSeq++}`, onClick: open(r.id) },
              h('span', { class: 'hv-id', style: 'color:var(--t-src);' }, r.id),
              h('span', { class: 'hv-changed-title' }, r.title),
            ),
            h(
              'button',
              {
                class: `btn-reset hv-verdict hv-verdict-${r.outcome.rel}`,
                fkey: `hv:${r.id}:${rowSeq++}`,
                title: `Outcome evidence — open ${r.outcome.reqId}`,
                label: `${r.outcome.rel} ${r.outcome.reqId} — open the hypothesis`,
                onClick: open(r.outcome.reqId),
              },
              `${r.outcome.rel} ${r.outcome.reqId}`,
            ),
            h('span', { class: 'hv-time' }, r.time),
          ),
    ),
    'No sources yet — evidence comes first',
  );

  // Ids the cards above already rendered (SRC-055): RECENTLY CHANGED shows
  // only the edits no other feed explains.
  const shown = new Set<string>([
    ...pending.map((d) => d.id),
    ...batches.flatMap((b) => b.evidence.map((d) => d.id)),
    ...betIds,
    ...flight.map((wo) => wo.id),
    ...activityRows.map((r) => r.id),
    ...learnedRows.map((r) => r.id),
  ]);
  const changedCard = card(
    [label('RECENTLY CHANGED')],
    recentlyChanged(ctx.snap, ctx.rel, 8, shown).map((r) =>
      row(
        r.id,
        'hv-row hv-row-feed',
        h('span', { class: 'hv-id', style: `color:${idColor(r.id)};` }, r.id),
        h('span', { class: 'hv-changed-title' }, r.title),
        h('span', { class: 'hv-time' }, r.time),
      ),
    ),
    'No documents yet',
  );

  const docs = ctx.snap.documents;
  const living = docs.filter(isLiving).length;
  return h(
    'div',
    { class: 'screen-homeview' },
    h(
      'div',
      { class: 'hv-wrap' },
      h(
        'div',
        { class: 'hv-head' },
        h('h1', { class: 'hv-title' }, ctx.snap.projectName),
        h('span', { class: 'hv-count' }, `${docs.length} docs · ${living} living`),
      ),
      reviewCard,
      betsCard,
      h('div', { class: 'hv-grid' }, health, ...(archCard !== null ? [archCard] : []), inFlightCard, activityCard, learnedCard, changedCard),
    ),
  );
}
