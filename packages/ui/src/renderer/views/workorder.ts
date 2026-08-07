/** Screen 2 — Work order detail with the Context Package panel. */
import type { VeriDocument } from '@veri/core';
import { h } from '../dom.ts';
import { TYPE_META, fmtTokens, statusColor, tint } from '../theme.ts';
import { plainText, sections } from '../markdown.ts';
import type { Block } from '../markdown.ts';
import { fileActivity, receipts } from '../derive.ts';
import { activityFeed, renderBlocks } from '../widgets.ts';
import type { Ctx } from '../app.ts';

const STATUS_SEGMENTS: Array<{ status: string; label: string }> = [
  { status: 'backlog', label: 'backlog' },
  { status: 'in-progress', label: 'in progress' },
  { status: 'done', label: 'done' },
];

function statusControl(ctx: Ctx, doc: VeriDocument): HTMLElement {
  return h(
    'div',
    { class: 'seg' },
    ...STATUS_SEGMENTS.map(({ status, label }) => {
      const active = doc.status === status;
      const color = statusColor(status);
      return h(
        'div',
        {
          class: 'seg-item',
          style: active ? `background:${tint(color, 0.14)};color:${color};` : '',
          onClick: () => {
            if (active) return;
            void ctx.api.setStatus(doc.id, status).then(() => ctx.refresh());
          },
        },
        label,
      );
    }),
  );
}

function receiptCards(ctx: Ctx, doc: VeriDocument): HTMLElement[] {
  if (doc.status !== 'done') return [];
  return receipts(doc)
    .slice()
    .reverse()
    .map((r) =>
      h(
        'div',
        { class: 'receipt' },
        h(
          'div',
          { class: 'receipt-head' },
          h('span', {}, '✓'),
          h('span', {}, 'Receipt'),
          h('span', { class: 'receipt-date' }, r.date),
        ),
        h(
          'div',
          { class: 'receipt-meta' },
          h('span', { class: 'receipt-key' }, 'commit'),
          h('span', { class: 'receipt-sha' }, r.commit),
          r.agent ? h('span', { class: 'receipt-key' }, 'session') : null,
          r.agent ? h('span', { class: 'receipt-session' }, 'agent session') : null,
        ),
        h('div', { class: 'receipt-files' }, ...r.files.map((f) => h('div', {}, f))),
        h('div', { class: 'receipt-summary' }, r.summary),
      ),
    );
}

function linkedCard(
  ctx: Ctx,
  woId: string,
  target: VeriDocument,
  detail: () => HTMLElement | null,
): HTMLElement {
  const key = `${woId}:${target.id}`;
  const open = ctx.state.expanded.has(key);
  const meta = TYPE_META[target.type];
  const border = target.type === 'requirement' ? '#1F2A33' : '#2A2418';
  const body = open ? detail() : null;
  return h(
    'div',
    { class: 'linked-card', style: `border-color:${border};` },
    h(
      'div',
      {
        class: 'linked-head',
        onClick: () => {
          const expanded = new Set(ctx.state.expanded);
          if (open) expanded.delete(key);
          else expanded.add(key);
          ctx.update({ expanded });
        },
      },
      h('span', { class: 'linked-chev' }, open ? '▾' : '▸'),
      h('span', { class: 'linked-id', style: `color:${meta.color};` }, target.id),
      h('span', { class: 'linked-title' }, target.title),
      h('span', { class: 'linked-status', style: `color:${statusColor(target.status)};` }, target.status),
    ),
    body,
  );
}

function requirementDetail(ctx: Ctx, target: VeriDocument): HTMLElement | null {
  const criteria = sections(target.body).get('Acceptance criteria') ?? [];
  if (criteria.length === 0) return null;
  return h(
    'div',
    { class: 'linked-body' },
    h('div', { class: 'micro-label', style: 'margin:10px 0 6px;' }, 'ACCEPTANCE CRITERIA'),
    h(
      'div',
      { class: 'linked-criteria' },
      ...criteria
        .filter((b): b is Block & { kind: 'check' } => b.kind === 'check')
        .map((b) =>
          h(
            'div',
            { class: 'linked-crit-row' },
            h('span', { style: `color:${b.done ? '#7FAF8A' : '#55525E'};` }, b.done ? '✓' : '○'),
            h('span', {}, plainText(b.segs)),
          ),
        ),
    ),
  );
}

function decisionDetail(ctx: Ctx, target: VeriDocument): HTMLElement | null {
  const secs = sections(target.body);
  const blocks = secs.get('Rationale') ?? secs.get('Choice') ?? [];
  if (blocks.length === 0) return null;
  return h('div', { class: 'linked-body linked-rationale' }, ...renderBlocks(blocks, ctx.byId, ctx));
}

function contextPanel(ctx: Ctx, doc: VeriDocument): HTMLElement {
  const pkg = ctx.pkg.get(doc.id);
  if (pkg === undefined) ctx.loadPackage(doc.id);
  const git = ctx.snap.git;

  const rows =
    pkg?.summary.rows.map((row) => {
      const color = row.type === 'conventions' ? TYPE_META.source.color : TYPE_META[row.type].color;
      return h(
        'div',
        { class: 'pkg-row' },
        h('span', { class: 'pkg-swatch', style: `background:${color};` }),
        h('span', { class: 'pkg-id', style: `color:${color};` }, row.id),
        h('span', { class: 'pkg-title' }, row.title),
        h('span', { class: 'pkg-tokens' }, fmtTokens(row.tokens)),
      );
    }) ?? [h('div', { class: 'pkg-loading' }, 'assembling…')];

  const copy = h(
    'div',
    {
      class: 'btn-primary',
      style: ctx.state.copied ? 'background:rgba(127,175,138,0.15);color:#7FAF8A;' : '',
      onClick: () => {
        if (pkg === undefined) return;
        void ctx.api.copyText(pkg.text).then(() => {
          ctx.sessionLog(doc.id, { agent: false, text: 'Copied the context package', time: 'today' });
          ctx.flashCopied();
        });
      },
    },
    ctx.state.copied ? '✓ Copied' : 'Copy for agent',
  );

  const mcp = ctx.state.mcpShown
    ? h(
        'div',
        { class: 'mcp-snippet' },
        h('div', { class: 'mcp-dim' }, '# agent fetches with'),
        h('div', { class: 'mcp-code' }, 'veri.get_context(', h('span', { style: 'color:#E8703A;' }, `"${doc.id}"`), ')'),
        h('div', { class: 'mcp-dim', style: 'margin-top:4px;' }, 'veri-mcp · stdio · ', h('span', { style: 'color:#7FAF8A;' }, 'live')),
      )
    : null;

  return h(
    'div',
    { class: 'panel-right panel-context' },
    h(
      'div',
      { class: 'pkg-head' },
      h('span', { class: 'micro-label' }, 'CONTEXT PACKAGE'),
      h('span', { class: 'pkg-total' }, pkg === undefined ? '' : `~${fmtTokens(pkg.summary.totalTokens)} tokens`),
    ),
    h(
      'div',
      { class: 'pkg-card' },
      ...rows,
      h(
        'div',
        { class: 'pkg-note' },
        'assembled fresh from current doc versions',
        h('br', {}),
        git === null ? 'not a git repository' : `git ${git.branch} @ ${git.sha}`,
      ),
    ),
    h(
      'div',
      { class: 'pkg-buttons' },
      copy,
      h('div', { class: 'btn-secondary', onClick: () => ctx.update({ mcpShown: !ctx.state.mcpShown }) }, 'Serve via MCP'),
    ),
    mcp,
    h('div', { class: 'micro-label', style: 'margin-top:22px;' }, 'PACKAGE RULES'),
    h(
      'div',
      { class: 'pkg-rules' },
      'Linked requirements and decisions in full · cited sources as excerpts · project conventions always included · superseded decisions excluded.',
    ),
  );
}

const OWN_SECTIONS = new Set(['', 'Summary', 'In scope', 'Out of scope', 'Acceptance tests', 'Receipts']);

export function workOrderView(ctx: Ctx): HTMLElement {
  const doc = ctx.doc()!;
  const secs = sections(doc.body);
  const byId = ctx.byId;
  const linkedReqs = doc.links.map((l) => byId.get(l.id)).filter((d): d is VeriDocument => d?.type === 'requirement');
  const linkedDecs = doc.links.map((l) => byId.get(l.id)).filter((d): d is VeriDocument => d?.type === 'decision');

  const section = (title: string, blocks: Block[] | undefined, muted = false): Child[] =>
    blocks === undefined || blocks.length === 0
      ? []
      : [h('h2', { class: 'rd-h2 wo-h2' }, title), h('div', { class: 'wo-section' }, ...renderBlocks(blocks, byId, ctx, { muted }))];
  type Child = HTMLElement;

  const extraSections: Child[] = [];
  for (const [name, blocks] of secs) {
    if (OWN_SECTIONS.has(name)) continue;
    extraSections.push(...section(name, blocks));
  }

  return h(
    'div',
    { class: 'screen-wo' },
    h(
      'div',
      { class: 'reader' },
      h(
        'div',
        { class: 'reader-col reader-col-wo' },
        h(
          'div',
          { class: 'crumb' },
          h('span', {}, 'Work Orders'),
          h('span', { class: 'crumb-sep' }, '/'),
          h('span', { style: 'color:#E8703A;' }, doc.id),
        ),
        h('div', { class: 'wo-head' }, h('h1', { class: 'doc-title wo-title' }, doc.title), statusControl(ctx, doc)),
        h(
          'div',
          { class: 'wo-meta' },
          h('span', {}, `created ${doc.created}`),
          h('span', {}, `updated ${ctx.rel(doc.updated)}`),
          ctx.snap.git !== null ? h('span', { style: 'color:#E8703A;' }, `branch ${ctx.snap.git.branch}`) : null,
        ),
        ...receiptCards(ctx, doc),
        ...section('Summary', secs.get('Summary') ?? secs.get('')),
        ...section('In scope', secs.get('In scope')),
        ...section('Out of scope', secs.get('Out of scope'), true),
        ...extraSections,
        linkedReqs.length > 0 ? h('h2', { class: 'rd-h2 wo-h2' }, 'Linked requirements') : null,
        linkedReqs.length > 0
          ? h('div', { class: 'linked-list' }, ...linkedReqs.map((r) => linkedCard(ctx, doc.id, r, () => requirementDetail(ctx, r))))
          : null,
        linkedDecs.length > 0 ? h('h2', { class: 'rd-h2 wo-h2' }, 'Linked decisions') : null,
        linkedDecs.length > 0
          ? h('div', { class: 'linked-list' }, ...linkedDecs.map((d) => linkedCard(ctx, doc.id, d, () => decisionDetail(ctx, d))))
          : null,
        ...section('Acceptance tests', secs.get('Acceptance tests')),
        activityFeed([...ctx.sessionRows(doc.id), ...fileActivity(doc, ctx.rel)]),
      ),
    ),
    contextPanel(ctx, doc),
  );
}
