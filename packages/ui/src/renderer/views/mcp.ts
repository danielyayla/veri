/** Agent connection screen (WO-007): five states over .mcp.json, per SRC-002. */
import type { McpStatus } from '../../lib/mcpconfig.ts';
import type { Ctx } from '../app.ts';
import { h } from '../dom.ts';

const TOOLS: Array<[string, string]> = [
  ['get_context', 'Pulls the assembled context package for a work order'],
  ['search', 'Finds requirements, decisions, and sources by id or text'],
  ['file_decision', 'Lets the agent file a decision doc mid-session'],
  ['file_receipt', 'Records commit, files, and summary when work completes'],
];

function tildify(path: string, home: string): string {
  return path === home || path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

/** Shell-safe display/copy form: ~ when clean, quoted absolute when spaced. */
function shellArg(path: string, home: string): string {
  return path.includes(' ') ? `"${path}"` : tildify(path, home);
}

/** Last segments of a long path for the health card's mono detail column. */
function shortPath(path: string): string {
  const parts = path.split('/').filter((p) => p !== '');
  return parts.length <= 3 ? path : `…/${parts.slice(-3).join('/')}`;
}

interface CheckRow {
  name: string;
  ok: boolean;
  detail: string;
  failMsg?: string;
  actionLabel?: string;
  onFix?: () => void;
}

export function mcpView(ctx: Ctx): HTMLElement {
  const status = ctx.state.mcpStatus;
  if (status === null) return h('div', { class: 'mcp-view' }, h('div', { class: 'mcp-col' }, ''));

  const notSetup = status.state === 'missing' || status.state === 'no-entry';
  const hasChecks = status.state === 'ok';
  const healthy = hasChecks && status.executableFound && status.rootMatches;

  const write = (action: Promise<void>): void => {
    void action
      .then(() => ctx.refreshMcp())
      .then(() => ctx.update({ mcpWrote: true, mcpExternal: false }))
      .catch((err: Error) => ctx.update({ projectError: err.message }));
  };
  const recheck = (): void => {
    void ctx.refreshMcp().then(() => ctx.update({ mcpExternal: false, mcpWrote: false, mcpBuildCopied: false }));
  };

  const crumb = h(
    'div',
    { class: 'mcp-crumb' },
    ctx.snap.projectName,
    h('span', { class: 'mcp-crumb-slash' }, ' / '),
    h('span', { class: 'mcp-crumb-here' }, 'Agent connection'),
  );

  const titleRow = h(
    'div',
    { class: 'mcp-title-row' },
    h('h1', { class: 'mcp-h1' }, 'Agent connection'),
    notSetup ? null : h('div', { class: 'mcp-ghost-btn', onClick: recheck }, h('span', {}, '↻'), h('span', {}, 'Re-run checks')),
  );

  const subhead = h(
    'p',
    { class: 'mcp-sub' },
    "Sets up this project's ",
    h('span', { class: 'mcp-sub-code' }, '.mcp.json'),
    " so agent apps like Claude Code can launch Veri's MCP server. Veri manages the file only — your agent reads it when a session starts.",
  );

  const externalBanner = ctx.state.mcpExternal
    ? h(
        'div',
        { class: 'mcp-banner mcp-banner-info' },
        h('span', { class: 'mcp-banner-glyph', style: 'color:#7EA6C4;' }, '↺'),
        h(
          'div',
          { class: 'mcp-banner-body' },
          h('span', { class: 'mcp-banner-lead', style: 'color:#7EA6C4;' }, '.mcp.json was changed outside Veri.'),
          ' The file is the source of truth — checks re-ran just now and reflect what’s on disk.',
        ),
      )
    : null;

  const restartBanner = ctx.state.mcpWrote
    ? h(
        'div',
        { class: 'mcp-banner mcp-banner-warn' },
        h('span', { class: 'mcp-banner-glyph', style: 'color:#D9A03F;' }, '⟳'),
        h(
          'div',
          { class: 'mcp-banner-body mcp-banner-body-warn' },
          h('span', { class: 'mcp-banner-lead', style: 'color:#D9A03F;' }, 'Restart your agent session to apply.'),
          ' Agent apps read .mcp.json on launch — quit and reopen Claude Code, or start a new session. This is the one step Veri can’t do for you.',
        ),
      )
    : null;

  return h(
    'div',
    { class: 'mcp-view' },
    h(
      'div',
      { class: 'mcp-col' },
      crumb,
      titleRow,
      subhead,
      externalBanner,
      restartBanner,
      notSetup ? notSetupCard(ctx, status, write) : null,
      status.state === 'conflict' || status.state === 'unparseable' ? conflictCard(ctx, status, write) : null,
      hasChecks ? healthCard(ctx, status, write) : null,
      hasChecks && healthy ? configCard(status) : null,
      userScopedSection(ctx, status),
      toolsSection(),
    ),
  );
}

function jsonPreview(status: McpStatus): HTMLElement {
  const t = (p: string): string => tildify(p, status.home);
  const val = (text: string): HTMLElement => h('span', { class: 'mcp-json-val' }, text);
  return h(
    'div',
    { class: 'mcp-json' },
    h('div', {}, '"mcpServers": {'),
    h('div', { class: 'mcp-ind1' }, h('span', { class: 'mcp-json-key' }, '"veri"'), ': {'),
    h('div', { class: 'mcp-ind2' }, '"command": ', val('"node"'), ','),
    h('div', { class: 'mcp-ind2' }, '"args": [', val(`"${t(status.desiredServerPath)}"`), ', ', val(`"${t(status.desiredRoot)}"`), ']'),
    h('div', { class: 'mcp-ind1' }, '}'),
    h('div', {}, '}'),
  );
}

function notSetupCard(ctx: Ctx, status: McpStatus, write: (a: Promise<void>) => void): HTMLElement {
  return h(
    'div',
    { class: 'mcp-card mcp-hero' },
    h('div', { class: 'mcp-eyebrow mcp-eyebrow-warn' }, 'NOT SET UP'),
    h('div', { class: 'mcp-card-h' }, 'Connect a coding agent to this project'),
    h(
      'p',
      { class: 'mcp-card-p' },
      'One click writes ',
      h('span', { class: 'mcp-inline-code' }, '.mcp.json'),
      ' next to the ',
      h('span', { class: 'mcp-inline-code' }, 'veri/'),
      ' directory — a plain file you can read, diff, and commit so teammates get the connection too. Nothing to type.',
    ),
    h('div', { class: 'mcp-btn-primary', onClick: () => write(ctx.api.mcpSetup()) }, 'Set up connection'),
    h('div', { class: 'mcp-eyebrow', style: 'margin-top:20px;' }, 'WHAT WILL BE WRITTEN'),
    jsonPreview(status),
    h('div', { class: 'mcp-caption' }, 'Any other servers already in the file are left untouched.'),
  );
}

function conflictCard(ctx: Ctx, status: McpStatus, write: (a: Promise<void>) => void): HTMLElement {
  const unparseable = status.state === 'unparseable';
  const heading = unparseable ? '.mcp.json couldn’t be parsed' : '.mcp.json has a "veri" server Veri didn’t write';
  const body = unparseable
    ? 'The file isn’t valid JSON, so Veri can’t rewrite one entry without risking the rest. Fix it by hand, then re-run checks.'
    : 'It may be from an older setup or a teammate’s machine. Veri won’t touch it without your say-so.';
  const block = unparseable
    ? h('div', { class: 'mcp-json' }, ...(status.conflictJson ?? '').split('\n').map((line) => h('div', {}, line)))
    : h(
        'div',
        { class: 'mcp-json' },
        ...(status.conflictJson ?? '')
          .split('\n')
          .map((line, i) =>
            i === 0
              ? h('div', {}, h('span', { class: 'mcp-json-key-warn' }, '"veri"'), ': {')
              : h('div', { style: `padding-left:${(line.length - line.trimStart().length) * 7}px;` }, line.trim()),
          ),
      );
  return h(
    'div',
    { class: 'mcp-card mcp-card-warn' },
    h('div', { class: 'mcp-eyebrow mcp-eyebrow-warn' }, unparseable ? 'INVALID FILE' : 'CONFLICTING ENTRY'),
    h('div', { class: 'mcp-card-h' }, heading),
    h('p', { class: 'mcp-card-p' }, body),
    block,
    unparseable
      ? null
      : h(
          'div',
          { class: 'mcp-conflict-actions' },
          h('div', { class: 'mcp-btn-primary mcp-btn-replace', onClick: () => write(ctx.api.mcpSetup()) }, 'Replace with Veri’s entry'),
          h('span', { class: 'mcp-caption', style: 'margin-top:0;' }, 'Rewrites only this entry — other servers stay as they are. Or leave it: Veri never overwrites it silently.'),
        ),
  );
}

function healthCard(ctx: Ctx, status: McpStatus, write: (a: Promise<void>) => void): HTMLElement {
  const t = (p: string): string => tildify(p, status.home);
  const checks: CheckRow[] = [
    { name: '.mcp.json exists', ok: true, detail: t(status.configPath) },
    { name: 'Veri server entry present', ok: true, detail: 'mcpServers.veri' },
    {
      name: 'Server executable found',
      ok: status.executableFound,
      detail: status.executableFound ? shortPath(status.serverPathResolved ?? '') : '',
      failMsg: `Nothing at ${t(status.serverPathResolved ?? '')} — the server hasn’t been built on this machine.`,
      actionLabel: ctx.state.mcpBuildCopied ? '✓ Copied — build, then re-run checks' : 'Copy build command',
      onFix: () => {
        void ctx.api.copyText('npm run build -w packages/mcp').then(() => ctx.update({ mcpBuildCopied: true }));
      },
    },
    {
      name: 'Project root matches this project',
      ok: status.rootMatches,
      detail: status.rootMatches ? t(status.rootPathResolved ?? '') : '',
      failMsg: `Points at ${status.rootPath ?? ''} — a path from another machine, likely a teammate’s commit.`,
      actionLabel: 'Fix path',
      onFix: () => write(ctx.api.mcpFixRoot()),
    },
  ];
  const failing = checks.filter((c) => !c.ok).length;
  const rows = checks.map((c) =>
    h(
      'div',
      { class: 'mcp-check-row' },
      h(
        'div',
        { class: 'mcp-check-line' },
        h('span', { class: c.ok ? 'mcp-badge mcp-badge-ok' : 'mcp-badge mcp-badge-fail' }, c.ok ? '✓' : '!'),
        h('span', { class: 'mcp-check-name' }, c.name),
        h('span', { class: 'mcp-check-detail' }, h('bdi', {}, c.detail)),
      ),
      c.ok
        ? null
        : h(
            'div',
            { class: 'mcp-fail' },
            h('span', { class: 'mcp-fail-msg' }, c.failMsg ?? ''),
            h('div', { class: 'mcp-fail-btn', onClick: c.onFix }, c.actionLabel ?? ''),
          ),
    ),
  );
  return h(
    'div',
    { class: 'mcp-health' },
    h(
      'div',
      { class: 'mcp-health-head' },
      h('span', { class: 'mcp-eyebrow' }, 'HEALTH'),
      h(
        'span',
        { class: 'mcp-health-count', style: `color:${failing === 0 ? '#7FAF8A' : '#D9A03F'};` },
        failing === 0 ? 'all 4 checks pass' : `${failing} check${failing === 1 ? '' : 's'} failing`,
      ),
    ),
    ...rows,
    h('div', { class: 'mcp-health-note' }, 'Checks read the file and disk only — they can’t tell whether an agent session is currently connected.'),
  );
}

function configCard(status: McpStatus): HTMLElement {
  const t = (p: string): string => tildify(p, status.home);
  const row = (key: string, value: string, last = false): HTMLElement =>
    h(
      'div',
      { class: last ? 'mcp-kv-row mcp-kv-row-last' : 'mcp-kv-row' },
      h('span', { class: 'mcp-kv-k' }, key),
      h('span', { class: 'mcp-kv-v' }, value),
    );
  const wrap = h(
    'div',
    {},
    h(
      'div',
      { class: 'mcp-kv' },
      row('config file', t(status.configPath)),
      row('command', status.command ?? ''),
      row('server', t(status.serverPathResolved ?? '')),
      row('project root', t(status.rootPathResolved ?? ''), true),
    ),
    h('div', { class: 'mcp-caption' }, 'Read-only here. Edit the file directly if you need to — external changes are picked up and re-checked automatically.'),
  );
  return wrap;
}

function userScopedSection(ctx: Ctx, status: McpStatus): HTMLElement {
  const cmd = `claude mcp add veri -- node ${shellArg(status.desiredServerPath, status.home)} ${shellArg(status.desiredRoot, status.home)}`;
  return h(
    'div',
    { class: 'mcp-section' },
    h('div', { class: 'mcp-eyebrow' }, 'PREFER USER-SCOPED SETUP?'),
    h(
      'p',
      { class: 'mcp-section-p' },
      'Instead of a file checked into the repo, add the server to your own Claude Code config. Copy the command and run it in a terminal — Veri only fills it in, it never runs it.',
    ),
    h(
      'div',
      { class: 'mcp-cmd' },
      h('span', { class: 'mcp-cmd-text' }, cmd),
      h(
        'div',
        { class: 'mcp-ghost-btn mcp-copy-btn', onClick: () => {
          void ctx.api.copyText(cmd).then(() => ctx.flashMcpCmdCopied());
        } },
        ctx.state.mcpCmdCopied ? '✓ Copied' : 'Copy',
      ),
    ),
  );
}

function toolsSection(): HTMLElement {
  return h(
    'div',
    { class: 'mcp-section' },
    h('div', { class: 'mcp-eyebrow' }, 'WHAT THE CONNECTION PROVIDES'),
    h(
      'div',
      { class: 'mcp-tools' },
      ...TOOLS.map(([name, desc]) =>
        h('div', { class: 'mcp-tool' }, h('div', { class: 'mcp-tool-name' }, name), h('div', { class: 'mcp-tool-desc' }, desc)),
      ),
    ),
  );
}
