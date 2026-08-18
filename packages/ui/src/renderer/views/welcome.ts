/**
 * Welcome screen (WO-030, SRC-013 surface 1): shown only when launch
 * resolution finds no known project — a cold-start surface, never a tour.
 * It writes nothing on its own; every card leads into the existing create /
 * open flows, which show the write before it happens (SRC-007).
 */
import { h } from '../dom.ts';

export interface WelcomeNotice {
  text: string;
}

export interface WelcomeHost {
  notice: WelcomeNotice | null;
  /** The SRC-007 picker → sheet flow; `demo` pre-enables the sample toggle. */
  createNew(demo: boolean): void;
  /** One OS picker; a bad pick reports back as the inline notice. */
  openExisting(): void;
}

function actionCard(glyph: string, glyphColor: string, title: string, body: HTMLElement, onClick: () => void): HTMLElement {
  return h(
    'button',
    { class: 'btn-reset btn-block wl-card', fkey: `wl:${title}`, onClick },
    h(
      'span',
      { class: 'wl-card-title' },
      h('span', { class: 'wl-card-glyph', style: `color:${glyphColor};` }, glyph),
      h('span', {}, title),
      h('span', { class: 'wl-card-arrow' }, '→'),
    ),
    body,
  );
}

export function welcomeView(host: WelcomeHost): HTMLElement {
  const code = (text: string): HTMLElement => h('span', { class: 'wl-code' }, text);
  return h(
    'div',
    { class: 'wl-screen' },
    h(
      'div',
      { class: 'wl-col' },
      h('div', { class: 'wl-wordmark' }, 'Veri'),
      h(
        'p',
        { class: 'wl-oneliner' },
        'A knowledge base your coding agents read — requirements, decisions, and work orders as plain markdown files living in your repo.',
      ),
      h(
        'div',
        { class: 'wl-cards' },
        actionCard(
          '+',
          '#E8703A',
          'Create a new project',
          h('span', { class: 'wl-card-body' }, 'Pick a folder — Veri scaffolds a ', code('veri/'), ' directory inside it. Works in an existing repo.'),
          () => host.createNew(false),
        ),
        actionCard(
          '◈',
          '#908BA8',
          'Explore the sample project',
          h('span', { class: 'wl-card-body' }, 'A working invoicing-app knowledge base — 16 documents you can read, edit, and connect an agent to.'),
          () => host.createNew(true),
        ),
        actionCard(
          '→',
          '#7EA6C4',
          'Open an existing folder',
          h('span', { class: 'wl-card-body' }, 'A repo that already has a ', code('veri/'), ' directory.'),
          () => host.openExisting(),
        ),
      ),
      host.notice !== null
        ? h('div', { class: 'wl-notice' }, h('span', { class: 'wl-notice-dot' }), h('span', {}, host.notice.text))
        : null,
      h(
        'div',
        { class: 'wl-footer' },
        'Nothing is written until you choose — projects are plain files on disk, and this screen never creates anything on its own.',
      ),
    ),
  );
}
