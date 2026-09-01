/** Screen 2 — Work order detail with the Context Package panel. */
import type { VeriDocument } from '@verikb/core';
import { h } from '../dom.ts';
import { TYPE_META, fmtTokens, statusColor, tint } from '../theme.ts';
import { plainText, sections } from '../markdown.ts';
import type { Block } from '../markdown.ts';
import { PACKAGE_RULES_TEXT, fileActivity, gatingDocs, receipts } from '../derive.ts';
import { activityFeed, dirtyStrip, displayTitle, idChip, imgDirFor, modeToggle, pinChip, renderBlocks, statusChip } from '../widgets.ts';
import { frontmatterCard } from './reader.ts';
import { roveIndex, roveKey } from '../a11y.ts';
import { segmentRefusal, writeStatus } from '../statuswrite.ts';
import type { Ctx } from '../app.ts';

/** The `ready` segment retired with the state (DEC-143, WO-143): the
    lifecycle is backlog → in-progress → done, and the door into in-progress
    is the user's dispatch gesture. The refusal table lives in
    segmentRefusal. */
const STATUS_SEGMENTS: Array<{ status: string; label: string }> = [
  { status: 'backlog', label: 'backlog' },
  { status: 'in-progress', label: 'in progress' },
  { status: 'done', label: 'done' },
];

function statusControl(ctx: Ctx, doc: VeriDocument): HTMLElement {
  // SRC-019: a radiogroup — roving tabindex, ←/→ move focus, ↩/Space apply
  // (native button activation). Arrow moves are DOM-only; no state changes
  // until a segment is pressed.
  const segs: HTMLButtonElement[] = [];
  const group = h(
    'div',
    {
      class: 'seg',
      role: 'radiogroup',
      label: 'Status',
      onKeydown: (e) => {
        const move = roveKey(e.key);
        if (move === null) return;
        e.preventDefault();
        const cur = segs.findIndex((s) => s === document.activeElement);
        const next = roveIndex(segs.length, cur, move);
        if (next === -1) return;
        segs.forEach((s, i) => (s.tabIndex = i === next ? 0 : -1));
        segs[next].focus();
      },
    },
    ...STATUS_SEGMENTS.map(({ status, label }) => {
      const active = doc.status === status;
      const color = statusColor(status);
      // WO-111 (SRC-051): a refused target wears the one "shown, not
      // clickable" treatment — ready on the way in, everything on the way
      // out of ready — and its title carries the reason.
      const refusal = active ? null : segmentRefusal(doc.status, status);
      const gated = refusal !== null;
      const btn = h(
        'button',
        {
          class: gated ? 'btn-reset seg-item seg-item-gated' : 'btn-reset seg-item',
          role: 'radio',
          checked: active,
          tabindex: active ? 0 : -1,
          fkey: `status:${status}`,
          style: active ? `background:${tint(color, 0.14)};color:${color};` : '',
          title: refusal ?? undefined,
          onClick: () => {
            if (active) return;
            // Click and ↩/Space land here alike — the keyboard path is
            // native button activation on the same handler.
            if (refusal !== null) {
              ctx.announce(refusal);
              return;
            }
            // WO-061: the write is instant; recovery is too — the undo toast
            // reverts through the same write path. WO-111: a refused write
            // surfaces instead of vanishing into a void-ed promise.
            const prev = doc.status;
            void writeStatus(
              (id, next) => ctx.api.setStatus(id, next),
              doc.id,
              status,
              () => {
                ctx.flashUndo(doc.id, prev, status);
                return ctx.refresh();
              },
              (message) => ctx.announce(`status not written — ${message}`),
            );
          },
        },
        label,
      );
      segs.push(btn as HTMLButtonElement);
      return btn;
    }),
  );
  return group;
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
  const border = target.type === 'requirement' ? 'var(--info-border)' : 'var(--ember-border-2)';
  const body = open ? detail() : null;
  const toggle = (): void => {
    const expanded = new Set(ctx.state.expanded);
    if (open) expanded.delete(key);
    else expanded.add(key);
    ctx.update({ expanded });
  };
  // WO-061 (SRC-033): the id is a real chip that navigates, like every other
  // id in the app; chevron, title, and the row body keep the disclosure. A
  // button can't nest a button, so the row is a div and the title carries the
  // accessible toggle — the mouse-only row onClick is a convenience on top.
  return h(
    'div',
    { class: 'linked-card', style: `border-color:${border};` },
    h(
      'div',
      { class: 'linked-head', onClick: toggle },
      h('span', { class: 'linked-chev' }, open ? '▾' : '▸'),
      h('span', { class: 'linked-chipwrap', onClick: (e) => e.stopPropagation() }, idChip(ctx.byId, target.id, ctx)),
      h(
        'button',
        {
          class: 'btn-reset linked-title',
          expanded: open,
          fkey: `linked:${target.id}`,
          onClick: (e) => {
            e.stopPropagation();
            toggle();
          },
        },
        target.title,
      ),
      // WO-062 (SRC-033): the one tinted-chip status treatment everywhere —
      // no more bare 10px colored text.
      h('span', { class: 'linked-status' }, statusChip(target.status)),
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
            h('span', { style: `color:${b.done ? 'var(--green)' : 'var(--faint)'};` }, b.done ? '✓' : '○'),
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
  return h('div', { class: 'linked-body linked-rationale' }, ...renderBlocks(blocks, ctx.byId, ctx, { imgDir: imgDirFor(ctx.snap.root, target.file) }));
}

function tildify(path: string, home: string): string {
  return path === home || path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

/**
 * Start-agent-session picker (SRC-003). Rows come straight from the adapter
 * registry: detected+connected → Launch, detected without a veri entry →
 * Set up & launch, not installed → visible but inert (the roster doubles as
 * documentation), plus a copy-only row for web chat apps. A foreign veri
 * entry is surfaced and launched with as-is, never rewritten (DEC-011).
 */
function agentPicker(ctx: Ctx): HTMLElement {
  const agents = ctx.state.agents;
  const home = ctx.state.mcpStatus?.home ?? '';

  const rows: (HTMLElement | null)[] = [];
  if (agents === null) {
    rows.push(h('div', { class: 'ap-row' }, h('div', { class: 'ap-detail' }, 'detecting…')));
  } else {
    if (agents.every((a) => a.status === 'not-installed')) {
      rows.push(h('div', { class: 'ap-hint' }, 'No local agents detected — use Copy kickoff prompt with any agent.'));
    }
    for (const a of agents) {
      const launching = ctx.state.agentLaunching === a.id;
      const chip = (label: string, cls: string): HTMLElement =>
        launching
          ? h('span', { class: 'ap-launching' }, 'launching…')
          : h('button', { class: `btn-reset ap-chip ${cls}`, fkey: `ap:${a.id}`, onClick: () => ctx.launchAgent(a) }, label);
      if (a.status === 'not-installed') {
        rows.push(
          h(
            'div',
            { class: 'ap-row ap-row-dim' },
            h('div', { class: 'ap-main' }, h('div', { class: 'ap-name' }, a.name), h('div', { class: 'ap-detail' }, 'not detected on this machine')),
            h('span', { class: 'ap-dash' }, '—'),
          ),
        );
      } else if (a.status === 'not-connected') {
        rows.push(
          h(
            'div',
            { class: 'ap-row ap-row-act' },
            h('div', { class: 'ap-main' }, h('div', { class: 'ap-name' }, a.name), h('div', { class: 'ap-detail ap-warn' }, 'mcp config: veri entry missing')),
            chip('Set up & launch', 'ap-chip-setup'),
          ),
        );
      } else {
        const detail =
          a.status === 'conflict'
            ? h('div', { class: 'ap-detail ap-warn' }, 'veri entry not written by Veri — left untouched')
            : h('div', { class: 'ap-detail' }, tildify(a.binPath ?? '', home));
        rows.push(
          h(
            'div',
            { class: 'ap-row ap-row-act' },
            h('div', { class: 'ap-main' }, h('div', { class: 'ap-name' }, a.name), detail),
            chip('Launch', 'ap-chip-launch'),
          ),
        );
      }
    }
  }

  return h(
    'div',
    { class: 'ap-pop', role: 'menu', label: 'Start a session in', onClick: (e) => e.stopPropagation() },
    h('div', { class: 'ap-head micro-label' }, 'START A SESSION IN'),
    ...rows,
    h(
      'div',
      { class: 'ap-row ap-row-act' },
      h(
        'div',
        { class: 'ap-main' },
        h('div', { class: 'ap-name' }, 'Web chat (ChatGPT, Claude.ai, …)'),
        h('div', { class: 'ap-detail' }, "can't be launched with a local MCP server"),
      ),
      h('button', { class: 'btn-reset ap-chip ap-chip-copy', fkey: 'ap:web', onClick: () => ctx.copyKickoff() }, 'Copy prompt'),
    ),
    h(
      'div',
      { class: 'ap-foot' },
      `launches in ${tildify(ctx.snap.root, home)} · `,
      h('button', { class: 'btn-reset mcp-snippet-link', fkey: 'ap:settings', onClick: () => ctx.openSettings('agent') }, 'connection settings →'),
    ),
  );
}

/** SRC-006 gate chip: `gated · REQ-008`, one per pending direct link. */
function gateChip(ctx: Ctx, id: string): HTMLElement {
  return h(
    'button',
    {
      class: 'btn-reset gate-chip',
      title: 'Depends on a document awaiting review',
      label: `Gated — open ${id}, awaiting review`,
      fkey: `gate:${id}`,
      onClick: (e) => {
        e.stopPropagation();
        ctx.openDoc(id, { background: e.metaKey || e.ctrlKey });
      },
    },
    `gated · ${id}`,
  );
}

function contextPanel(ctx: Ctx, doc: VeriDocument): HTMLElement {
  const pkg = ctx.pkg.get(doc.id);
  if (pkg === undefined) ctx.loadPackage(doc.id);
  const git = ctx.snap.git;
  // Gated WOs (SRC-006): agent kickoff is disabled until the gates clear.
  const gates = gatingDocs(ctx.byId, doc);
  const gateTip = gates.length > 0 ? h('span', { class: 'rv-tip' }, `Gated — approve ${gates[0].id} first`) : null;

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

  // Layered packages (DEC-035): one aggregate row for the context map —
  // hollow swatch per SRC-010's rule (filled = body present, hollow =
  // named, not carried). The full annotated map ships in the package text.
  const map = pkg?.summary.map;
  const mapRows =
    map === undefined
      ? []
      : [
          h('div', { class: 'micro-label pkg-map-label' }, 'CONTEXT MAP'),
          h(
            'div',
            { class: 'pkg-row' },
            h('span', { class: 'pkg-swatch pkg-swatch-hollow' }),
            h('span', { class: 'pkg-title' }, `${map.count} adjacent docs — enumerated, not inlined`),
            h('span', { class: 'pkg-tokens' }, fmtTokens(map.tokens)),
          ),
        ];

  // Agent handoff (WO-011 / SRC-003): Start agent session picker, kickoff
  // prompt copy, and the full-package copy demoted to a ghost link.
  const start =
    gates.length > 0
      ? h('div', { class: 'btn-primary btn-gated' }, 'Start agent session ', h('span', { class: 'ap-caret' }, '▾'), gateTip)
      : h(
          'button',
          {
            class: 'btn-reset btn-block btn-primary',
            expanded: ctx.state.agentsOpen,
            fkey: 'pkg-start',
            onClick: (e) => {
              e.stopPropagation();
              ctx.toggleAgentPicker();
            },
          },
          'Start agent session ',
          h('span', { class: 'ap-caret' }, ctx.state.agentsOpen ? '▴' : '▾'),
        );

  const kickoff =
    gates.length > 0
      ? h('div', { class: 'btn-secondary btn-gated' }, 'Copy kickoff prompt', gateTip?.cloneNode(true) as HTMLElement)
      : h(
          'button',
          {
            class: 'btn-reset btn-block btn-secondary',
            style: ctx.state.kickoffCopied ? 'color:var(--green);border-color:var(--green-border-2);' : '',
            fkey: 'pkg-kickoff',
            onClick: () => ctx.copyKickoff(),
          },
          ctx.state.kickoffCopied ? '✓ Copied' : 'Copy kickoff prompt',
        );

  const fullCopy = h(
    'button',
    {
      class: 'btn-reset btn-block pkg-ghost',
      fkey: 'pkg-full',
      onClick: () => {
        if (pkg === undefined) return;
        void ctx.api.copyText(pkg.text).then(() => {
          ctx.sessionLog(doc.id, { agent: false, text: 'Copied the context package', time: 'today' });
          ctx.flashCopied();
        });
      },
    },
    ctx.state.copied ? '✓ copied full package' : 'copy full package',
  );

  const msg = ctx.state.agentLaunchMsg;
  const feedback = h(
    'div',
    { class: msg === null ? 'pkg-feedback' : msg.ok ? 'pkg-feedback pkg-feedback-ok' : 'pkg-feedback pkg-feedback-err' },
    msg?.text ?? '',
  );

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
      ...mapRows,
      h(
        'div',
        { class: 'pkg-note' },
        'assembled fresh from current doc versions',
        h('br', {}),
        git === null ? 'not a git repository' : `git ${git.branch} @ ${git.sha}`,
      ),
    ),
    h('div', { class: 'pkg-buttons-col' }, start, kickoff, fullCopy, feedback, ctx.state.agentsOpen ? agentPicker(ctx) : null),
    h('div', { class: 'micro-label', style: 'margin-top:22px;' }, 'PACKAGE RULES'),
    h('div', { class: 'pkg-rules' }, PACKAGE_RULES_TEXT),
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
      : [h('h2', { class: 'rd-h2 wo-h2' }, title), h('div', { class: 'wo-section' }, ...renderBlocks(blocks, byId, ctx, { muted, imgDir: imgDirFor(ctx.snap.root, doc.file) }))];
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
          { class: 'crumb crumb-row' },
          h(
            'button',
            { class: 'btn-reset crumb-live', title: 'Browse work orders', fkey: 'crumb-live', onClick: () => ctx.openPanel('work-order') },
            'Work Orders',
          ),
          h('span', { class: 'crumb-sep' }, '/'),
          h('span', { style: 'color:var(--ember);' }, doc.id),
          modeToggle(ctx, doc.id),
        ),
        h(
          'div',
          { class: 'wo-head' },
          h('h1', { class: 'doc-title wo-title' }, displayTitle(doc.title)),
          pinChip(ctx.state.pinned.includes(doc.id), () => ctx.togglePin(doc.id)),
          // WO-110 (SRC-052): a withdrawn work order sits outside the four
          // lifecycle segments — the chip names the terminal state while
          // every segment renders gated and explains itself.
          doc.status === 'withdrawn' ? statusChip(doc.status) : null,
          statusControl(ctx, doc),
        ),
        dirtyStrip(ctx, doc.id),
        // WO-062 (SRC-033): work orders get the reader's frontmatter card —
        // id, type, created, updated, and the WO-056 links editor. created/
        // updated move into the card rather than duplicating in the meta line;
        // status stays in the header radiogroup alone. `branch` (git state,
        // not frontmatter) keeps the meta line, off ember — the least
        // actionable fact no longer wears the most salient color.
        gatingDocs(ctx.byId, doc).length > 0 || ctx.snap.git !== null
          ? h(
              'div',
              { class: 'wo-meta' },
              ...gatingDocs(ctx.byId, doc).map((g) => gateChip(ctx, g.id)),
              ctx.snap.git !== null ? h('span', {}, `branch ${ctx.snap.git.branch}`) : null,
            )
          : null,
        frontmatterCard(ctx, { status: false }),
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
