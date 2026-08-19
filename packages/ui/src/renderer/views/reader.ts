/** Screen 1 — Project home: reader column + Connections panel. */
import { h, svgEl } from '../dom.ts';
import { TYPE_META } from '../theme.ts';
import { parseBlocks } from '../markdown.ts';
import { DEFAULT_REL, autocomplete, connections, fileActivity, insertAutocomplete, localGraph, relsInUse } from '../derive.ts';
import type { ConnectionGroups } from '../derive.ts';
import { ipcErrorMessage } from '../editlogic.ts';
import { activityFeed, attachPreview, dirtyStrip, idChip, imgDirFor, modeToggle, pinChip, renderBlocks, statusChip, typeChip } from '../widgets.ts';
import { reviewBanner } from './review.ts';
import type { Ctx, LinkAddState } from '../app.ts';

function frontmatterCard(ctx: Ctx): HTMLElement {
  const doc = ctx.doc()!;
  const meta = TYPE_META[doc.type];
  const open = ctx.state.linksOpen;
  const row = (k: string, v: HTMLElement): HTMLElement =>
    h('div', { class: 'fm-row' }, h('span', { class: 'fm-key' }, k), v);
  return h(
    'div',
    { class: 'fm-card' },
    row('id', h('span', { class: 'fm-mono', style: `color:${meta.color};` }, doc.id)),
    row('type', typeChip(doc.type)),
    row('status', statusChip(doc.status)),
    ...(doc.approved !== undefined ? [row('approved', h('span', { class: 'fm-mono' }, doc.approved))] : []),
    row('created', h('span', { class: 'fm-mono' }, doc.created)),
    row('updated', h('span', { class: 'fm-mono' }, ctx.rel(doc.updated))),
    // WO-056 (SRC-028): the links row is the links editor — the count
    // expands into the outbound list with remove and add controls.
    row(
      'links',
      h(
        'button',
        {
          class: 'btn-reset fm-links-btn',
          expanded: open,
          label: `links — ${doc.links.length} outbound`,
          fkey: 'fm-links',
          onClick: () => ctx.update({ linksOpen: !open, linkAdd: null }),
        },
        h('span', { class: 'lk-caret' }, open ? '▾' : '▸'),
        `${doc.links.length} outbound`,
      ),
    ),
    ...(open ? [linksEditor(ctx)] : []),
  );
}

/** Commit a full new outbound array; the write path is core's byte-preserving
    links-block rewrite behind the setLinks IPC (WO-056). */
function commitLinks(ctx: Ctx, links: { id: string; rel: string }[], logText: string, onError: (msg: string) => void): void {
  const docId = ctx.state.docId!;
  void ctx.api
    .setLinks(docId, links)
    .then(() => {
      ctx.sessionLog(docId, { agent: false, text: logText, time: 'today' });
      ctx.update({ linkAdd: null });
      void ctx.refresh();
    })
    .catch((err) => onError(ipcErrorMessage(err)));
}

/** The expanded links row: outbound entries in frontmatter (author) order —
    id chip, muted rel, an × on hover/focus — plus the add-link row. Inbound
    links stay in the Connections panel; they belong to other documents. */
function linksEditor(ctx: Ctx): HTMLElement {
  const doc = ctx.doc()!;
  const links = doc.links;
  const rows = links.map((l, i) =>
    h(
      'div',
      { class: 'lk-row' },
      idChip(ctx.byId, l.id, ctx),
      h('span', { class: 'lk-rel' }, l.rel),
      h(
        'button',
        {
          class: 'btn-reset lk-x',
          label: `Remove link ${l.id} (${l.rel})`,
          title: 'Remove link',
          fkey: `lk-x:${i}`,
          onClick: () => {
            const next = links.filter((_, j) => j !== i).map((k) => ({ id: k.id, rel: k.rel }));
            commitLinks(ctx, next, `Removed link → ${l.id} (${l.rel})`, (msg) => ctx.flashToast(msg));
          },
        },
        '×',
      ),
    ),
  );
  const add = ctx.state.linkAdd;
  const addUi =
    add === null
      ? h(
          'button',
          {
            class: 'btn-reset lk-add',
            fkey: 'lk-add',
            onClick: () => ctx.update({ linkAdd: { target: '', rel: DEFAULT_REL, error: null, focus: 'target' } }),
          },
          '+ add link',
        )
      : addLinkRow(ctx, add, links);
  return h('div', { class: 'lk-editor', role: 'group', label: 'Outbound links editor' }, ...rows, addUi);
}

/** The two-field inline row (SRC-028): target backed by the pure
    autocomplete() in the note composer's .ac-pop register, rel as free text
    over a datalist of the project's rels. Enter commits, Escape cancels;
    empty rel and unknown target are refused inline. */
function addLinkRow(ctx: Ctx, add: LinkAddState, links: readonly { id: string; rel: string }[]): HTMLElement {
  // The pure helper keys on a trailing "[[" (its one grammar); the target
  // field is all query, so the marker is prefixed. A fully resolved id needs
  // no more offers — the popover yields to the picked value.
  const items = ctx.byId.has(add.target.trim()) ? null : autocomplete(ctx.snap, `[[${add.target}`);
  const popover =
    items !== null && items.length > 0
      ? h(
          'div',
          { class: 'ac-pop' },
          h('div', { class: 'ac-label' }, 'LINK TO DOC'),
          ...items.map((it, i) =>
            h(
              'button',
              {
                class: 'btn-reset btn-block ac-row',
                fkey: `lk-ac:${i}`,
                onClick: () => ctx.update({ linkAdd: { ...add, target: it.id, error: null, focus: 'rel' } }),
              },
              h('span', { class: 'ac-id', style: `color:${TYPE_META[it.type].color};` }, it.id),
              h('span', { class: 'ac-title' }, it.title),
            ),
          ),
        )
      : null;

  const commit = (): void => {
    const target = add.target.trim();
    const rel = add.rel.trim();
    if (!ctx.byId.has(target)) {
      // The autocomplete only offers real ids; a hand-typed miss is caught here.
      ctx.update({
        linkAdd: { ...add, error: target === '' ? 'a link target is required' : `unknown link target ${target}`, focus: 'target' },
      });
      return;
    }
    if (rel === '') {
      ctx.update({ linkAdd: { ...add, error: 'rel must not be empty', focus: 'rel' } });
      return;
    }
    commitLinks(ctx, [...links.map((l) => ({ id: l.id, rel: l.rel })), { id: target, rel }], `Added link → ${target} (${rel})`, (msg) =>
      ctx.update({ linkAdd: { ...add, error: msg, focus: 'target' } }),
    );
  };
  const onKeys = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      commit();
    } else if (e.key === 'Escape') {
      e.stopPropagation(); // closes only this row, not the layer stack
      ctx.update({ linkAdd: null });
    }
  };
  const field = (cls: string, fkey: string, label: string, placeholder: string, value: string, patch: (v: string) => Partial<LinkAddState>): HTMLInputElement =>
    h('input', {
      class: `lk-input ${cls}`,
      fkey,
      label,
      placeholder,
      value,
      onInput: (e) => ctx.update({ linkAdd: { ...add, ...patch((e.target as HTMLInputElement).value), error: null, focus: null } }),
      onKeydown: onKeys,
    }) as HTMLInputElement;
  const targetInput = field('lk-target', 'lk-target', 'Link target id', 'target id — e.g. REQ-001', add.target, (v) => ({ target: v }));
  const relInput = field('lk-relinput', 'lk-rel', 'Link rel', 'rel', add.rel, (v) => ({ rel: v }));
  // The rel vocabulary is the author's: a datalist of the rels in use, not an
  // enum (SRC-016). `list` rides setAttribute — the DOM property is readonly.
  relInput.setAttribute('list', 'lk-rels');
  const datalist = h('datalist', { id: 'lk-rels' }, ...relsInUse(ctx.snap).map((r) => h('option', { value: r })));
  if (add.focus !== null) {
    const el = add.focus === 'target' ? targetInput : relInput;
    queueMicrotask(() => {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      add.focus = null; // one-shot, consumed by this render
    });
  }
  return h(
    'div',
    { class: 'lk-addwrap' },
    h('div', { class: 'lk-addrow' }, popover, targetInput, relInput, datalist),
    add.error !== null ? h('div', { class: 'lk-err', role: 'alert' }, h('span', { class: 'lk-err-dot' }), add.error) : null,
  );
}

function noteEditor(ctx: Ctx): HTMLElement {
  const items = autocomplete(ctx.snap, ctx.state.editorText);
  const popover =
    items !== null && items.length > 0
      ? h(
          'div',
          { class: 'ac-pop' },
          h('div', { class: 'ac-label' }, 'LINK TO DOC'),
          ...items.map((it, i) =>
            h(
              'button',
              {
                class: 'btn-reset btn-block ac-row',
                fkey: `ac:${i}`,
                onClick: () => {
                  ctx.update({ editorText: insertAutocomplete(ctx.state.editorText, it.id), editorFocused: true });
                },
              },
              h('span', { class: 'ac-id', style: `color:${TYPE_META[it.type].color};` }, it.id),
              h('span', { class: 'ac-title' }, it.title),
            ),
          ),
        )
      : null;

  const input = h('input', {
    class: 'note-input',
    label: 'Append a note',
    fkey: 'note-input',
    placeholder: 'Append a note — type [[ to link a doc',
    value: ctx.state.editorText,
    onInput: (e) => ctx.update({ editorText: (e.target as HTMLInputElement).value, editorFocused: true }),
    onKeydown: (e) => {
      if (e.key === 'Enter' && ctx.state.editorText.trim() !== '') {
        const docId = ctx.state.docId!;
        void ctx.api.appendNote(docId, ctx.state.editorText).then(() => {
          ctx.sessionLog(docId, { agent: false, text: 'Appended a note', time: 'today' });
          ctx.update({ editorText: '' });
          void ctx.refresh();
        });
      }
    },
  }) as HTMLInputElement;
  if (ctx.state.editorFocused) {
    queueMicrotask(() => {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });
  }
  return h('div', { class: 'note-wrap' }, popover, input);
}

/**
 * The local graph (WO-052, SRC-024): a 1-hop neighborhood map above the
 * Connections cards — center node the current doc, inbound fanned left,
 * outbound right, straight SVG edges, no simulation. Neighbors are the
 * panel's own deduped set; beyond 8 per side a `+K more` marker points at
 * the cards below. Hidden entirely when the doc has no connections.
 */
function localGraphEl(ctx: Ctx, doc: { id: string; type: keyof typeof TYPE_META }, groups: ConnectionGroups): HTMLElement | null {
  const layout = localGraph(groups);
  if (layout === null) return null;
  const svg = svgEl('svg', {
    viewBox: `0 0 ${layout.width} ${layout.height}`,
    style: 'position:absolute;inset:0;width:100%;height:100%;',
    'aria-hidden': 'true',
  });
  for (const n of [...layout.inbound.nodes, ...layout.outbound.nodes]) {
    svg.append(
      svgEl('line', {
        x1: String(layout.cx),
        y1: String(layout.cy),
        x2: String(n.x),
        y2: String(n.y),
        style: 'stroke:var(--hair);stroke-width:1;',
      }),
    );
  }
  const node = (n: { id: string; x: number; y: number }): HTMLElement => {
    const target = ctx.byId.get(n.id);
    const dim = target?.status === 'superseded';
    const btn = h(
      'button',
      {
        class: dim ? 'btn-reset lg-node lg-dim' : 'btn-reset lg-node',
        style: `left:${n.x}px;top:${n.y}px;`,
        label: `${n.id} — ${target?.title ?? n.id}`,
        fkey: `lg:${n.id}`,
        // SRC-024: click opens the doc as a preview tab; ⌘-click backgrounds
        // — openDoc semantics unchanged.
        onClick: (e) => ctx.openDoc(n.id, { preview: true, background: e.metaKey || e.ctrlKey }),
      },
      h('span', {
        class: 'lg-dot',
        style: `background:${target !== undefined ? TYPE_META[target.type].color : 'var(--faint)'};`,
      }),
      h('span', { class: 'lg-label' }, n.id),
    );
    // SRC-021 hover/focus preview via the one shared popover (WO-047).
    attachPreview(btn, ctx.byId, n.id, ctx);
    return btn;
  };
  const marker = (side: { more: number; moreAt: { x: number; y: number } | null }): HTMLElement | null =>
    side.moreAt === null
      ? null
      : h('span', { class: 'lg-more', style: `left:${side.moreAt.x}px;top:${side.moreAt.y}px;` }, `+${side.more} more`);
  return h(
    'div',
    { class: 'lg-wrap', style: `height:${layout.height}px;`, label: `Local graph — ${doc.id} and its connections` },
    svg,
    ...layout.inbound.nodes.map(node),
    ...layout.outbound.nodes.map(node),
    marker(layout.inbound),
    marker(layout.outbound),
    h(
      'span',
      { class: 'lg-center', style: `left:${layout.cx}px;top:${layout.cy}px;color:${TYPE_META[doc.type].color};` },
      doc.id,
    ),
  );
}

export function connectionsPanel(ctx: Ctx): HTMLElement {
  const doc = ctx.doc()!;
  const groups = connections(ctx.snap, doc.id);
  const card = (c: { id: string; title: string; type: keyof typeof TYPE_META; why: string }): HTMLElement => {
    const idEl = h('span', { class: 'conn-id', style: `color:${TYPE_META[c.type].color};` }, c.id);
    const btn = h(
      'button',
      {
        class: 'btn-reset btn-block conn-card',
        label: `${c.id} — ${c.title}`,
        fkey: `conn:${c.id}`,
        onClick: (e) => ctx.openDoc(c.id, { background: e.metaKey || e.ctrlKey }),
      },
      h('span', { class: 'conn-head' }, idEl, h('span', { class: 'conn-type' }, TYPE_META[c.type].label)),
      h('span', { class: 'conn-title' }, c.title),
      h('span', { class: 'conn-why' }, c.why),
    );
    // WO-047 / SRC-021: the card gains the preview on its id only, not the
    // whole card; keyboard parity rides on the card, the focusable unit.
    attachPreview(idEl, ctx.byId, c.id, ctx, { focus: false });
    attachPreview(btn, ctx.byId, c.id, ctx, { hover: false });
    return btn;
  };
  const group = (label: string, items: typeof groups.outbound): HTMLElement | null =>
    items.length === 0
      ? null
      : h(
          'div',
          { class: 'conn-group' },
          h('div', { class: 'conn-group-label' }, `${label} `, h('span', { class: 'conn-count' }, String(items.length))),
          h('div', { class: 'conn-list' }, ...items.map(card)),
        );
  return h(
    'div',
    { class: 'panel-right panel-connections' },
    h('div', { class: 'micro-label' }, 'CONNECTIONS'),
    localGraphEl(ctx, doc, groups),
    group('Outbound · links to', groups.outbound),
    group('Inbound · linked from', groups.inbound),
  );
}

export function readerView(ctx: Ctx): HTMLElement {
  const doc = ctx.doc();
  if (doc === null) return h('div', { class: 'screen-home' }, h('div', { class: 'reader' }, h('div', { class: 'reader-col' }, 'No documents.')));
  const meta = TYPE_META[doc.type];
  const docIssues = ctx.issues.get(doc.id) ?? [];
  const banner =
    docIssues.length > 0
      ? h(
          'div',
          { class: 'warn-banner' },
          h('span', { class: 'warn-tag' }, '⚠ veri check'),
          h('span', {}, docIssues[0].message),
        )
      : null;
  // Advisory strip (WO-026, SRC-010): boxless grey lines between frontmatter
  // and body — a whisper, not a banner. `template ↗` jumps to the Templates
  // view at this type, since the fix is the section or the template.
  const docAdvisories = ctx.advisories.get(doc.id) ?? [];
  const advisoryStrip =
    docAdvisories.length === 0
      ? null
      : h(
          'div',
          { class: 'adv-strip' },
          ...docAdvisories.map((a) =>
            h(
              'div',
              { class: 'adv-line' },
              h('span', { class: 'adv-ring' }),
              h('span', { class: 'adv-line-msg' }, a.message),
              h(
                'button',
                {
                  class: 'btn-reset adv-tpl',
                  label: `Open the ${doc.type} template`,
                  fkey: 'adv-tpl',
                  onClick: () => {
                    ctx.update({ tplType: doc.type, tplResetConfirm: false });
                    ctx.openSettings('templates');
                  },
                },
                'template ↗',
              ),
            ),
          ),
        );

  return h(
    'div',
    { class: 'screen-home' },
    h(
      'div',
      { class: 'reader' },
      h(
        'div',
        { class: 'reader-col' },
        h(
          'div',
          { class: 'crumb crumb-row' },
          doc.type !== 'workflow'
            ? h(
                'button',
                {
                  class: 'btn-reset crumb-live',
                  title: `Browse ${meta.crumb.toLowerCase()}`,
                  fkey: 'crumb-live',
                  onClick: () => ctx.openPanel(doc.type),
                },
                meta.crumb,
              )
            : h('span', {}, meta.crumb),
          h('span', { class: 'crumb-sep' }, '/'),
          h('span', { style: `color:${meta.color};` }, doc.id),
          modeToggle(ctx, doc.id),
        ),
        h(
          'div',
          { class: 'doc-head' },
          h('h1', { class: 'doc-title' }, doc.title),
          pinChip(ctx.state.pinned.includes(doc.id), () => ctx.togglePin(doc.id)),
        ),
        dirtyStrip(ctx, doc.id),
        banner,
        reviewBanner(ctx, doc),
        frontmatterCard(ctx),
        advisoryStrip,
        h('div', { class: 'doc-body' }, ...renderBlocks(parseBlocks(doc.body), ctx.byId, ctx, { imgDir: imgDirFor(ctx.snap.root, doc.file) })),
        activityFeed([...ctx.sessionRows(doc.id), ...fileActivity(doc, ctx.rel)]),
        noteEditor(ctx),
      ),
    ),
    connectionsPanel(ctx),
  );
}

export { idChip };
