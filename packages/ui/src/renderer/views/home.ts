/** Home view (WO-015, SRC-005 layer 4): the default tab — Health, In flight,
    Agent activity, Recently changed. Every row opens its doc as a preview. */
import { h } from '../dom.ts';
import { TYPE_META, statusColor } from '../theme.ts';
import { inFlight, issueDocId, pendingDocs, projectActivity, recentlyChanged } from '../derive.ts';
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

export function homeView(ctx: Ctx): HTMLElement {
  const open = (id: string | null) => (e: MouseEvent) => {
    if (id !== null) ctx.openDoc(id, { preview: true, background: e.metaKey || e.ctrlKey });
  };
  const idColor = (id: string): string => {
    const doc = ctx.byId.get(id);
    return doc !== undefined ? TYPE_META[doc.type].color : '#A09DA6';
  };

  // NEEDS REVIEW (SRC-006): full-width above the grid, hidden when empty.
  const pending = pendingDocs(ctx.snap);
  const reviewCard =
    pending.length === 0
      ? null
      : h(
          'div',
          { class: 'hv-card hv-card-review' },
          h(
            'div',
            { class: 'hv-card-head' },
            dot('#D9A03F'),
            h('span', { class: 'hv-label', style: 'color:#D9A03F;' }, 'NEEDS REVIEW'),
            h('span', { class: 'hv-meta' }, `${pending.length} pending`),
          ),
          ...pending.map((d) =>
            h(
              'div',
              { class: 'hv-row', onClick: open(d.id) },
              h('span', { class: 'hv-id', style: `color:${TYPE_META[d.type].color};` }, d.id),
              h('span', { class: 'hv-flight-title' }, d.title),
              h('span', { class: 'gate-chip gate-chip-static' }, d.status),
              h('span', { class: 'hv-time' }, `filed ${ctx.rel(d.created)}`),
            ),
          ),
        );

  const issues = ctx.snap.issues;
  const advisories = ctx.snap.advisories;
  // The green/amber word and its color follow issues alone (DEC-025); the
  // advisory count is a visually parenthetical grey span (SRC-010).
  const healthMeta = h(
    'span',
    { class: 'hv-meta' },
    h(
      'span',
      { style: issues.length > 0 ? 'color:#D9A03F;' : 'color:#7FAF8A;' },
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
            h(
              'div',
              { class: 'adv-row', onClick: open(ctx.byId.has(a.id) ? a.id : null) },
              h('span', { class: 'adv-ring' }),
              h('span', { class: 'adv-kind' }, a.kind),
              h('span', { class: 'hv-id', style: `color:${idColor(a.id)};` }, a.id),
              h('span', { class: 'adv-msg' }, a.message),
            ),
          ),
        ];
  const health = card(
    [dot('#D9A03F'), label('HEALTH'), healthMeta],
    [
      ...issues.map((issue) => {
        const docId = issueDocId(ctx.snap, issue);
        return h(
          'div',
          { class: 'hv-row hv-row-top', onClick: open(docId) },
          h('span', { class: 'hv-kind' }, issue.kind),
          h(
            'div',
            { class: 'hv-issue' },
            h('div', { class: 'hv-issue-id' }, docId ?? issue.kind),
            h('div', { class: 'hv-issue-msg' }, issue.message),
          ),
        );
      }),
      ...advisoryTier,
    ],
    'No issues — veri check is clean',
  );

  const flight = inFlight(ctx.snap);
  const inFlightCard = card(
    [
      dot('#E8703A'),
      label('IN FLIGHT'),
      h('span', { class: 'hv-meta' }, `${flight.length} work order${flight.length === 1 ? '' : 's'}`),
    ],
    flight.map((wo) =>
      h(
        'div',
        { class: 'hv-row', onClick: open(wo.id) },
        h('span', { class: 'hv-id hv-id-wo' }, wo.id),
        h('span', { class: 'hv-flight-title' }, wo.title),
        wo.gates.length > 0
          ? h('span', { class: 'gate-chip gate-chip-static', title: `Approve ${wo.gates.join(', ')} first` }, 'gated')
          : null,
        wo.agent ? h('span', { class: 'hv-agent', title: 'Agent execution attached' }, '⌁') : null,
        h(
          'span',
          { class: 'hv-reqs', style: wo.reqCount === 0 ? 'color:#D9A03F;' : '' },
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
  const activityCard = card(
    [h('span', { class: 'hv-agent-glyph' }, '⌁'), label('AGENT ACTIVITY')],
    [...session.slice(0, 4), ...filed].slice(0, 8).map((row) =>
      h(
        'div',
        { class: 'hv-row hv-row-feed', onClick: open(ctx.byId.has(row.id) ? row.id : null) },
        h('span', { class: 'hv-id', style: `color:${idColor(row.id)};` }, row.id),
        h('span', { class: 'hv-feed-text' }, row.text),
        h('span', { class: 'hv-time' }, row.time),
      ),
    ),
    'No activity yet',
  );

  const changedCard = card(
    [label('RECENTLY CHANGED')],
    recentlyChanged(ctx.snap, ctx.rel).map((row) =>
      h(
        'div',
        { class: 'hv-row hv-row-feed', onClick: open(row.id) },
        h('span', { class: 'hv-id', style: `color:${idColor(row.id)};` }, row.id),
        h('span', { class: 'hv-changed-title' }, row.title),
        h('span', { class: 'hv-time' }, row.time),
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
      h('div', { class: 'hv-grid' }, health, inFlightCard, activityCard, changedCard),
    ),
  );
}
