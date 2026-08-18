/**
 * The Settings view (WO-036, SRC-014): one view tab hosting a 190px sub-nav
 * beside the section body. Templates and Agent connection are the WO-024 and
 * WO-007 surfaces re-homed unchanged — they keep their own layout and scroll.
 * Project settings and Updates are read-only cards over facts the app
 * already knows (DEC-002: everything shown comes from files or the running
 * process, never a second store).
 */
import { h } from '../dom.ts';
import type { Ctx, SettingsSection } from '../app.ts';
import type { AppInfo, UpdateStatus } from '../api.ts';
import { relTime } from '../theme.ts';
import { mcpView, tildify } from './mcp.ts';
import { templatesView } from './templates.ts';

interface NavItem {
  key: SettingsSection;
  glyph: string;
  label: string;
}

const PROJECT_ITEMS: NavItem[] = [
  { key: 'templates', glyph: '⌧', label: 'Templates' },
  { key: 'agent', glyph: '⌁', label: 'Agent connection' },
  { key: 'project', glyph: '▣', label: 'Project settings' },
];

const APPLICATION_ITEMS: NavItem[] = [{ key: 'updates', glyph: '↻', label: 'Updates' }];

/** The Updates status row (pure, for tests). Failures never surface here —
    REQ-011: an unreachable feed behaves exactly like being up to date. */
export function updateStatusLine(info: AppInfo | null, upd: UpdateStatus | null): { text: string; ok: boolean } {
  if (info !== null && !info.packaged) {
    return { text: 'automatic in the packaged app — this is a dev build', ok: false };
  }
  if (upd?.downloadedVersion != null) {
    return { text: `Veri ${upd.downloadedVersion} downloaded — installs on restart or quit`, ok: true };
  }
  if (upd?.lastCheckAt != null) {
    return { text: `Up to date · checked ${relTime(new Date(upd.lastCheckAt).toISOString())}`, ok: true };
  }
  return { text: 'checks on launch and every 4 hours', ok: false };
}

function kvCard(rows: Array<[string, string, { mono?: boolean; color?: string }?]>): HTMLElement {
  return h(
    'div',
    { class: 'set-card' },
    ...rows.map(([k, v, opts]) =>
      h(
        'div',
        { class: 'set-kv' },
        h('span', { class: 'set-kv-k' }, k),
        h(
          'span',
          {
            class: opts?.mono === true ? 'set-kv-v set-kv-v-mono' : 'set-kv-v',
            style: opts?.color !== undefined ? `color:${opts.color};` : undefined,
          },
          v,
        ),
      ),
    ),
  );
}

function section(title: string, lede: string, ...children: Array<HTMLElement | null>): HTMLElement {
  return h(
    'div',
    { class: 'set-scroll' },
    h('div', { class: 'set-inner' }, h('h1', { class: 'set-h1' }, title), h('p', { class: 'set-lede' }, lede), ...children),
  );
}

function projectSection(ctx: Ctx): HTMLElement {
  const home = ctx.appInfo?.home ?? '';
  const wf = ctx.snap.documents.find((d) => d.type === 'workflow');
  return section(
    'Project settings',
    'Identity and format of this knowledge base. Everything here lives in files — this page only reads them.',
    kvCard([
      ['name', ctx.snap.projectName],
      ['path', tildify(`${ctx.snap.root}/veri`, home), { mono: true }],
      ['format', ctx.appInfo?.formatLabel ?? '', { mono: true }],
      ['workflow', wf !== undefined ? `veri/${wf.file} · ${wf.status}` : 'none', { mono: true }],
    ]),
  );
}

function updatesSection(ctx: Ctx): HTMLElement {
  const status = updateStatusLine(ctx.appInfo, ctx.updStatus);
  return section(
    'Updates',
    'The app updates itself from GitHub Releases of the public veri repo (DEC-029): checks and downloads happen in the background, and an update installs only on your say-so or on quit.',
    kvCard([
      ['version', ctx.appInfo?.version ?? '', { mono: true }],
      ['channel', 'latest', { mono: true }],
      ['status', status.text, { color: status.ok ? '#7FAF8A' : undefined }],
    ]),
  );
}

export function settingsView(ctx: Ctx): HTMLElement {
  const current = ctx.state.settingsSection;
  const item = (it: NavItem): HTMLElement =>
    h(
      'div',
      {
        class: current === it.key ? 'set-item set-item-active' : 'set-item',
        onClick: () => ctx.openSettings(it.key),
      },
      h('span', { class: 'set-glyph' }, it.glyph),
      h('span', {}, it.label),
    );
  let body: HTMLElement;
  if (current === 'templates') body = templatesView(ctx);
  else if (current === 'agent') body = mcpView(ctx);
  else if (current === 'project') body = projectSection(ctx);
  else body = updatesSection(ctx);
  return h(
    'div',
    { class: 'settings' },
    h(
      'div',
      { class: 'set-nav' },
      h('div', { class: 'set-label' }, 'Project'),
      ...PROJECT_ITEMS.map(item),
      h('div', { class: 'set-gap' }),
      h('div', { class: 'set-label' }, 'Application'),
      ...APPLICATION_ITEMS.map(item),
      // Placeholder only (WO-036 out of scope): inert row, "soon" tag.
      h('div', { class: 'set-item set-item-soon' }, h('span', { class: 'set-glyph' }, '◐'), h('span', {}, 'Appearance'), h('span', { class: 'set-soon' }, 'soon')),
    ),
    h('div', { class: 'set-body' }, body),
  );
}
