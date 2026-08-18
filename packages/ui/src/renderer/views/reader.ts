/** Screen 1 — Project home: reader column + Connections panel. */
import { h } from '../dom.ts';
import { TYPE_META } from '../theme.ts';
import { parseBlocks } from '../markdown.ts';
import { autocomplete, connections, fileActivity, insertAutocomplete } from '../derive.ts';
import { activityFeed, dirtyStrip, idChip, modeToggle, pinChip, renderBlocks, statusChip, typeChip } from '../widgets.ts';
import { reviewBanner } from './review.ts';
import type { Ctx } from '../app.ts';

function frontmatterCard(ctx: Ctx): HTMLElement {
  const doc = ctx.doc()!;
  const meta = TYPE_META[doc.type];
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
    row('links', h('span', { class: 'fm-mono' }, `${doc.links.length} outbound`)),
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
          ...items.map((it) =>
            h(
              'div',
              {
                class: 'ac-row',
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

export function connectionsPanel(ctx: Ctx): HTMLElement {
  const doc = ctx.doc()!;
  const groups = connections(ctx.snap, doc.id);
  const card = (c: { id: string; title: string; type: keyof typeof TYPE_META; why: string }): HTMLElement =>
    h(
      'div',
      { class: 'conn-card', onClick: (e) => ctx.openDoc(c.id, { background: e.metaKey || e.ctrlKey }) },
      h(
        'div',
        { class: 'conn-head' },
        h('span', { class: 'conn-id', style: `color:${TYPE_META[c.type].color};` }, c.id),
        h('span', { class: 'conn-type' }, TYPE_META[c.type].label),
      ),
      h('div', { class: 'conn-title' }, c.title),
      h('div', { class: 'conn-why' }, c.why),
    );
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
                'span',
                {
                  class: 'adv-tpl',
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
                'span',
                {
                  class: 'crumb-live',
                  title: `Browse ${meta.crumb.toLowerCase()}`,
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
        h('div', { class: 'doc-body' }, ...renderBlocks(parseBlocks(doc.body), ctx.byId, ctx)),
        activityFeed([...ctx.sessionRows(doc.id), ...fileActivity(doc, ctx.rel)]),
        noteEditor(ctx),
      ),
    ),
    connectionsPanel(ctx),
  );
}

export { idChip };
