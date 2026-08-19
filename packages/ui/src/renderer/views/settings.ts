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
import type { AppInfo, ThemePref, UpdateStatus } from '../api.ts';
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

const APPLICATION_ITEMS: NavItem[] = [
  { key: 'updates', glyph: '↻', label: 'Updates' },
  { key: 'appearance', glyph: '◐', label: 'Appearance' },
];

/** Appearance picker order (SRC-032): System first — it is the default. */
export const THEME_PREFS: ThemePref[] = ['system', 'light', 'dark'];

/** Arrow-key rotation through the radiogroup (REQ-020); null = not handled. */
export function rotatePref(current: ThemePref, key: string): ThemePref | null {
  const i = THEME_PREFS.indexOf(current);
  if (key === 'ArrowRight' || key === 'ArrowDown') return THEME_PREFS[(i + 1) % 3]!;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return THEME_PREFS[(i + 2) % 3]!;
  return null;
}

/** The meta card's `rendering` line: what is on screen, and who decided. */
export function renderingLine(pref: ThemePref, dark: boolean): string {
  return (dark ? 'dark' : 'light') + (pref === 'system' ? ' · from macOS' : '');
}

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
      ['status', status.text, { color: status.ok ? 'var(--green)' : undefined }],
    ]),
  );
}

/** One theme tile: a real radio button; the thumb always paints its own
    theme (fixed --mini-* tokens), never the active one. */
function themeTile(ctx: Ctx, pref: ThemePref, name: string, sub: string, thumb: HTMLElement): HTMLElement {
  return h(
    'button',
    {
      class: 'ttile',
      role: 'radio',
      checked: ctx.themePref === pref,
      fkey: `theme:${pref}`,
      onClick: () => ctx.setTheme(pref),
    },
    thumb,
    h(
      'div',
      { class: 'tlabel' },
      h('span', { class: 'tname' }, name),
      // The selected state must read through text, not border color alone (REQ-020).
      h('span', { class: 'tactive' }, '✓ active'),
    ),
    h('div', { class: 'tsub' }, sub),
  );
}

/** A miniature shell drawn in fixed colors: tiny topbar, sidebar, text bars. */
function miniShell(theme: 'dark' | 'lite', mirrored = false): HTMLElement {
  return h(
    'div',
    { class: `mini mini-${theme}` },
    h('div', { class: 'mini-top' }),
    h(
      'div',
      { class: 'mini-row' },
      mirrored ? null : h('div', { class: 'mini-side' }),
      h(
        'div',
        { class: 'mini-main' },
        h('div', { class: 'mini-bar' }),
        h('div', { class: 'mini-bar mini-bar-2' }),
        h('div', { class: 'mini-bar mini-bar-accent' }),
      ),
      mirrored ? h('div', { class: 'mini-side' }) : null,
    ),
  );
}

function appearanceSection(ctx: Ctx): HTMLElement {
  // Only when System is active does the renderer know what the OS resolved to.
  const sysNow =
    ctx.themePref === 'system' ? `follows macOS · ${ctx.renderDark ? 'dark' : 'light'} now` : 'follows macOS';
  const picker = h(
    'div',
    {
      class: 'theme-row',
      role: 'radiogroup',
      label: 'Theme',
      onKeydown: (e) => {
        const next = rotatePref(ctx.themePref, e.key);
        if (next === null) return;
        e.preventDefault();
        ctx.setTheme(next);
        // Focus follows selection, per radiogroup convention.
        requestAnimationFrame(() => {
          document.querySelector<HTMLElement>(`[data-fkey="theme:${next}"]`)?.focus();
        });
      },
    },
    themeTile(
      ctx,
      'system',
      'System',
      sysNow,
      h('div', { class: 'thumb thumb-split' }, miniShell('lite'), miniShell('dark', true)),
    ),
    themeTile(ctx, 'light', 'Light', 'always light', h('div', { class: 'thumb' }, miniShell('lite'))),
    themeTile(ctx, 'dark', 'Dark', 'always dark', h('div', { class: 'thumb' }, miniShell('dark'))),
  );
  return section(
    'Appearance',
    'How Veri looks on this Mac. The choice is stored per machine, not in the project — teammates and agents never see it.',
    picker,
    kvCard([
      ['theme', ctx.themePref, { mono: true }],
      ['rendering', renderingLine(ctx.themePref, ctx.renderDark), { mono: true }],
    ]),
    h(
      'p',
      { class: 'set-foot' },
      'System tracks the macOS appearance live — including scheduled Auto light/dark switching. Light and Dark override it. Switching is instant; nothing reloads.',
    ),
  );
}

export function settingsView(ctx: Ctx): HTMLElement {
  const current = ctx.state.settingsSection;
  const item = (it: NavItem): HTMLElement =>
    h(
      'button',
      {
        class: current === it.key ? 'btn-reset btn-block set-item set-item-active' : 'btn-reset btn-block set-item',
        pressed: current === it.key,
        fkey: `set:${it.key}`,
        onClick: () => ctx.openSettings(it.key),
      },
      h('span', { class: 'set-glyph' }, it.glyph),
      h('span', {}, it.label),
    );
  let body: HTMLElement;
  if (current === 'templates') body = templatesView(ctx);
  else if (current === 'agent') body = mcpView(ctx);
  else if (current === 'project') body = projectSection(ctx);
  else if (current === 'appearance') body = appearanceSection(ctx);
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
    ),
    h('div', { class: 'set-body' }, body),
  );
}
