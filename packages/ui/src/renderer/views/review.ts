/** Review banner + approve flow (WO-017, SRC-006): shown on every pending
    document — provenance, "what approving means", request-changes composer,
    and the approve popover with the exact frontmatter diff. */
import type { VeriDocument } from '@veri/core';
import { h } from '../dom.ts';
import { TYPE_META } from '../theme.ts';
import { connections, isPending } from '../derive.ts';
import type { Ctx } from '../app.ts';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Scroll the reader to a rendered `## <name>` heading (SRC-006: the review
    material is the document itself, not a generated summary). */
function jumpToHeading(name: string): void {
  for (const el of document.querySelectorAll('.rd-h2')) {
    if (el.textContent?.trim() === name) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
  }
}

function alternativesSection(doc: VeriDocument): string | null {
  for (const name of ['Rejected alternatives', 'Alternatives']) {
    if (new RegExp(`^##\\s+${name}\\s*$`, 'm').test(doc.body)) return name;
  }
  return null;
}

function disclosure(ctx: Ctx, doc: VeriDocument): HTMLElement {
  const groups = connections(ctx.snap, doc.id);
  const seen = new Set<string>();
  const bound = [...groups.inbound, ...groups.outbound].filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
  const altName = alternativesSection(doc);

  const bindRows =
    bound.length > 0
      ? bound.map((c) =>
          h(
            'button',
            {
              class: 'btn-reset btn-block rv-link-row',
              label: `${c.id} — ${c.title}`,
              fkey: `rv-link:${c.id}`,
              onClick: (e) => ctx.openDoc(c.id, { background: e.metaKey || e.ctrlKey }),
            },
            h('span', { class: 'rv-link-id', style: `color:${TYPE_META[c.type].color};` }, c.id),
            h('span', { class: 'rv-link-title' }, c.title),
          ),
        )
      : [h('div', { class: 'rv-link-none' }, 'nothing links here yet')];

  return h(
    'div',
    { class: 'rv-disc-body' },
    h('div', { class: 'rv-col' }, h('div', { class: 'rv-col-label' }, 'BECOMES BINDING FOR'), ...bindRows),
    altName !== null
      ? h(
          'div',
          { class: 'rv-col' },
          h('div', { class: 'rv-col-label' }, 'ALTERNATIVES REJECTED'),
          h(
            'button',
            { class: 'btn-reset btn-block rv-link-row', fkey: 'rv-jump', onClick: () => jumpToHeading(altName) },
            `↓ Jump to “${altName}” in this document`,
          ),
        )
      : null,
  );
}

function approvePopover(ctx: Ctx, doc: VeriDocument, to: string): HTMLElement {
  const date = today();
  const confirm = (): void => {
    ctx.update({ reviewPop: false });
    void ctx.api
      .approve(doc.id)
      .then((result) => {
        ctx.sessionLog(doc.id, { agent: false, text: `Approved — ${result.from} → ${result.to}`, time: 'today' });
        ctx.flashToast(`${doc.id} approved`);
        void ctx.refresh();
      })
      .catch((err: Error) => {
        // Core refused (e.g. a check issue landed since render) — surface why.
        ctx.flashToast(err.message.split('\n')[0].replace(/^.*Error: /, ''));
        void ctx.refresh();
      });
  };
  return h(
    'div',
    { class: 'rv-pop', role: 'dialog', modal: true, label: `Approve ${doc.id}`, onClick: (e) => e.stopPropagation() },
    h('div', { class: 'rv-pop-title' }, `Approve ${doc.id}?`),
    h(
      'div',
      { class: 'rv-pop-diff' },
      h('div', {}, 'status: ', h('span', { class: 'rv-diff-old' }, doc.status), ' → ', h('span', { class: 'rv-diff-new' }, to)),
      h('div', { class: 'rv-diff-new' }, `approved: ${date}`),
    ),
    h('div', { class: 'rv-pop-cap' }, 'Written to the markdown file. From the next context package on, agents treat this as binding.'),
    h(
      'div',
      { class: 'rv-pop-btns' },
      h('button', { class: 'btn-reset rv-ghost', fkey: 'rv-cancel', onClick: () => ctx.update({ reviewPop: false }) }, 'Cancel'),
      h('button', { class: 'btn-reset rv-approve', fkey: 'rv-stamp', onClick: confirm }, 'Approve & stamp'),
    ),
  );
}

function composer(ctx: Ctx, doc: VeriDocument): HTMLElement {
  const submit = (): void => {
    const text = (ctx.state.reviewText ?? '').trim();
    if (text === '') return;
    void ctx.api.reviewNote(doc.id, text).then(() => {
      ctx.sessionLog(doc.id, { agent: false, text: 'Returned with a review note', time: 'today' });
      ctx.update({ reviewText: null });
      ctx.flashToast(`Note added to ${doc.id} — stays in your review queue`);
      void ctx.refresh();
    });
  };
  const input = h('textarea', {
    class: 'rv-composer-input',
    label: 'Review note',
    fkey: 'rv-composer',
    placeholder: 'What should change before you’d approve this?',
    value: ctx.state.reviewText ?? '',
    onInput: (e) => ctx.update({ reviewText: (e.target as HTMLTextAreaElement).value }),
  }) as HTMLTextAreaElement;
  queueMicrotask(() => {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });
  return h(
    'div',
    { class: 'rv-composer' },
    input,
    h(
      'div',
      { class: 'rv-composer-btns' },
      h('button', { class: 'btn-reset rv-ghost', fkey: 'rv-comp-cancel', onClick: () => ctx.update({ reviewText: null }) }, 'Cancel'),
      h('button', { class: 'btn-reset rv-return', fkey: 'rv-comp-send', onClick: submit }, 'Return with note'),
    ),
  );
}

export function reviewBanner(ctx: Ctx, doc: VeriDocument): HTMLElement | null {
  if (!isPending(doc)) return null;
  const isReq = doc.type === 'requirement';
  const to = isReq ? 'accepted' : 'active';
  const issueCount = (ctx.issues.get(doc.id) ?? []).length;
  const discKey = `review:${doc.id}`;
  const discOpen = ctx.state.expanded.has(discKey);

  const provenance = isReq
    ? `Drafted by an agent session on ${doc.created}. Work orders can cite it but cannot start until you accept it.`
    : `Filed as a proposal by an agent session on ${doc.created}. It is not yet binding — context packages label it ` +
      `“pending” and work orders that depend on it stay gated until you approve.`;

  const approveBtn =
    issueCount > 0
      ? h(
          'button',
          { class: 'btn-reset rv-approve rv-approve-disabled', disabled: true, fkey: 'rv-open' },
          'Approve…',
          h('span', { class: 'rv-tip' }, `Fix check issues first — ${issueCount} on this document`),
        )
      : h('button', { class: 'btn-reset rv-approve', fkey: 'rv-open', onClick: () => ctx.update({ reviewPop: true }) }, 'Approve…');

  const actions =
    ctx.state.reviewText !== null
      ? composer(ctx, doc)
      : h(
          'div',
          { class: 'rv-actions' },
          h('button', { class: 'btn-reset rv-request', fkey: 'rv-request', onClick: () => ctx.update({ reviewText: '' }) }, 'Request changes'),
          approveBtn,
          ctx.state.reviewPop ? approvePopover(ctx, doc, to) : null,
        );

  return h(
    'div',
    { class: 'rv-banner' },
    h('div', { class: 'rv-title' }, '◌ Awaiting your review'),
    h('div', { class: 'rv-prov' }, provenance),
    h(
      'button',
      {
        class: 'btn-reset rv-disc',
        expanded: discOpen,
        fkey: 'rv-disc',
        onClick: () => {
          const expanded = new Set(ctx.state.expanded);
          if (discOpen) expanded.delete(discKey);
          else expanded.add(discKey);
          ctx.update({ expanded });
        },
      },
      h('span', { class: 'rv-disc-chev' }, discOpen ? '▾' : '▸'),
      h('span', {}, ' What approving means'),
    ),
    discOpen ? disclosure(ctx, doc) : null,
    actions,
  );
}
