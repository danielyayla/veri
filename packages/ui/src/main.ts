import { watch } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow, Menu, app, clipboard, dialog, ipcMain, shell } from 'electron';
import {
  BODY_TEMPLATES,
  ProjectExistsError,
  classifyFormat,
  createDocument,
  formatStatement,
  getTemplate,
  isCustomized,
  isOperableFormat,
  saveDocumentFile,
  scaffoldProject,
  templateFile,
} from '@veri/core';
import type { DocType } from '@veri/core';
import { DEMO_ROOT } from '@veri/cli';
import { assembleContext, paletteSearch } from '@veri/mcp';
import { findProjectRoot, isVeriProject, launchArg } from './lib/root.ts';
import { fixRootArg, mcpStatus, writeVeriEntry } from './lib/mcpconfig.ts';
import { probeNodeRuntime } from './lib/noderuntime.ts';
import { verifyConnection } from './lib/verify.ts';
import type { VerifyResult } from './lib/verify.ts';
import { cleanupLaunchScripts, connectAgent, detectAgents, launchAgent } from './lib/agents.ts';
import type { AgentId } from './lib/agents.ts';
import { SnapshotBuilder, countProjectDocs } from './lib/snapshot.ts';
import { loadWorkspaceState, saveWorkspaceState } from './lib/workspace.ts';
import type { WorkspaceState } from './lib/workspace.ts';
import { appendNote, appendReviewNote, approveDoc, setStatus } from './lib/write.ts';
import { startUpdater, updateStatus } from './lib/updater.ts';
import { createLogger } from './lib/log.ts';
import { buildIssueUrl } from './lib/report.ts';
import type { ProjectInfo } from './renderer/api.ts';

const here = dirname(fileURLToPath(import.meta.url));
let projectRoot = findProjectRoot(launchArg(process.argv, app.isPackaged), process.cwd());

// WO-031/DEC-034: the app's only record of itself — ~/Library/Logs/Veri, the
// path the troubleshooting page documents. Pinned explicitly: the default
// derives from package.json's name (@veri/ui), which would nest the log under
// Logs/@veri/ui/. Paths and outcomes only; never knowledge-base content.
app.setAppLogsPath(join(app.getPath('home'), 'Library', 'Logs', 'Veri'));
const log = createLogger(app.getPath('logs'));

// The MCP server executable setup writes into .mcp.json: server.js next to
// @veri/mcp's resolved entry point (dist/index.js).
const mcpServerJs = join(dirname(fileURLToPath(import.meta.resolve('@veri/mcp'))), 'server.js');

// Writes the panel makes trip the same file watcher as external edits; the
// timestamp lets the watcher tell the two apart (see watchProject).
let mcpSelfWriteAt = 0;

async function mcpWrite(action: () => Promise<void>): Promise<void> {
  mcpSelfWriteAt = Date.now();
  await action();
}

/** A read may only touch markdown inside veri/ (REQ-009 out-of-scope line). */
function isDocPath(file: string): boolean {
  return !file.startsWith('/') && !file.split(/[\\/]/).includes('..') && file.endsWith('.md');
}

// Config management for MRU projects.
const PROJECT_COLORS = ['#E8703A', '#7EA6C4', '#CFA83D', '#7FAF8A', '#E7A5D9', '#F0A87E', '#A5D4E8'];

function getConfigDir(): string {
  return join(app.getPath('userData'), 'config');
}

async function getRecentProjects(): Promise<ProjectInfo[]> {
  try {
    const configFile = join(getConfigDir(), 'recent-projects.json');
    const content = await readFile(configFile, 'utf-8');
    return JSON.parse(content) as ProjectInfo[];
  } catch {
    return [];
  }
}

async function saveRecentProjects(projects: ProjectInfo[]): Promise<void> {
  const configDir = getConfigDir();
  await mkdir(configDir, { recursive: true });
  const configFile = join(configDir, 'recent-projects.json');
  await writeFile(configFile, JSON.stringify(projects, null, 2));
}

async function addProjectToMru(dir: string): Promise<void> {
  const projects = await getRecentProjects();
  const existing = projects.find((p) => p.dir === dir);
  const baseName = dir.split('/').pop() || dir;
  const accentColor = existing?.accentColor ?? PROJECT_COLORS[projects.length % PROJECT_COLORS.length]!;
  const filtered = projects.filter((p) => p.dir !== dir);
  filtered.unshift({ dir, name: baseName, accentColor, docCount: 0, issueCount: 0 });
  await saveRecentProjects(filtered.slice(0, 20));
}

// One builder for the app's lifetime (WO-051): the veri:snapshot path is
// incremental — unchanged documents and an unmoved HEAD cost nothing to
// rebuild. Caches are in-memory only (DEC-002) and reset on project switch.
const snapshotBuilder = new SnapshotBuilder();

/**
 * Switcher-row stats (WO-051): a light readdir count — no parse, no git —
 * except the current project, whose builder snapshot is already paid for
 * and still carries a live issue count. Other rows show no issue dot: an
 * issue count needs a parse, which is exactly the cost the light stat
 * removes (see the WO-051 decision filed for this trade).
 */
async function getProjectStats(dir: string): Promise<{ docCount: number; issueCount: number }> {
  const current = snapshotBuilder.current;
  if (current !== null && current.root === dir) {
    return { docCount: current.documents.length, issueCount: current.issues.length };
  }
  return { docCount: await countProjectDocs(dir), issueCount: 0 };
}

// Screenshot mode for automated visual verification: render one view headlessly,
// write a PNG, quit. VERI_UI_SHOT=/path.png [VERI_UI_VIEW=homeview] [VERI_UI_DOC=WO-005]
const shotPath = process.env['VERI_UI_SHOT'];

let mainWin: BrowserWindow | null = null;

function registerIpc(): void {
  ipcMain.handle('veri:snapshot', () => snapshotBuilder.build(projectRoot));
  ipcMain.handle('veri:context', (_e, id: string) => assembleContext(projectRoot, id));
  ipcMain.handle('veri:palette-search', (_e, query: string, recents: string[]) =>
    paletteSearch(projectRoot, query, recents),
  );
  // Pins/recents (WO-014): per-project workspace state in userData, never veri/.
  ipcMain.handle('veri:workspace-load', () => loadWorkspaceState(getConfigDir(), projectRoot));
  ipcMain.handle('veri:workspace-save', (_e, state: WorkspaceState) =>
    saveWorkspaceState(getConfigDir(), projectRoot, state),
  );
  ipcMain.handle('veri:copy', (_e, text: string) => clipboard.writeText(text));
  ipcMain.handle('veri:set-status', (_e, id: string, status: string) => setStatus(projectRoot, id, status));
  // Direct editing (WO-022): raw file in, guarded verbatim write out. The
  // guards and the updated: bump live in core so CLI/MCP/UI can't drift.
  ipcMain.handle('veri:read-doc', async (_e, file: string) => {
    if (!isDocPath(file)) throw new Error(`not a veri/ document path: ${file}`);
    try {
      return await readFile(join(projectRoot, 'veri', file), 'utf8');
    } catch {
      return null; // deleted while open — the renderer shows the restore banner
    }
  });
  ipcMain.handle('veri:save-doc', (_e, file: string, text: string) =>
    saveDocumentFile(join(projectRoot, 'veri'), file, text),
  );
  ipcMain.handle('veri:create-doc', (_e, type: DocType, title: string) =>
    createDocument(join(projectRoot, 'veri'), type, title),
  );
  // Template settings (WO-024): the effective body plus provenance, straight
  // from core (WO-023) — never cached, so chips always match the files.
  ipcMain.handle('veri:template-read', (_e, type: DocType) => {
    const veriDir = join(projectRoot, 'veri');
    const { body, source } = getTemplate(veriDir, type);
    return { body, source, customized: isCustomized(veriDir, type) };
  });
  ipcMain.handle('veri:template-write', async (_e, type: DocType, body: string) => {
    const veriDir = join(projectRoot, 'veri');
    // First save in a pre-templates project materializes the directory (SRC-009).
    await mkdir(join(veriDir, 'templates'), { recursive: true });
    await writeFile(join(veriDir, templateFile(type)), body);
  });
  ipcMain.handle('veri:template-reset', async (_e, type: DocType) => {
    const veriDir = join(projectRoot, 'veri');
    await mkdir(join(veriDir, 'templates'), { recursive: true });
    await writeFile(join(veriDir, templateFile(type)), BODY_TEMPLATES[type]);
  });
  ipcMain.handle('veri:append-note', (_e, id: string, note: string) => appendNote(projectRoot, id, note));
  ipcMain.handle('veri:approve', (_e, id: string) => approveDoc(projectRoot, id));
  ipcMain.handle('veri:review-note', (_e, id: string, note: string) => appendReviewNote(projectRoot, id, note));
  ipcMain.handle('veri:mcp-status', () => mcpStatus(projectRoot, mcpServerJs));
  ipcMain.handle('veri:mcp-setup', async () => {
    await mcpWrite(() => writeVeriEntry(projectRoot, mcpServerJs));
    log.info(`mcp-config: wrote veri entry in ${join(projectRoot, '.mcp.json')}`);
  });
  ipcMain.handle('veri:mcp-fix-root', async () => {
    await mcpWrite(() => fixRootArg(projectRoot));
    log.info(`mcp-config: fixed root arg in ${join(projectRoot, '.mcp.json')}`);
  });
  // Runtime pre-check (DEC-031): the agent's login shell, never the app's
  // own PATH — a GUI launch inherits launchd's bare PATH and would lie.
  ipcMain.handle('veri:runtime-probe', () => probeNodeRuntime());
  // LIVE CHECK (WO-030): launch the configured server once and speak MCP to
  // it. The search id comes from the snapshot so a success proves the server
  // is serving this project's files; a documentless project skips it.
  ipcMain.handle('veri:verify-connection', async (): Promise<VerifyResult> => {
    const status = await mcpStatus(projectRoot, mcpServerJs);
    if (status.state !== 'ok' || status.serverPathResolved === null || status.rootPathResolved === null) {
      return { kind: 'no-answer', stderr: 'no recognized veri entry to verify — run setup first' };
    }
    const probe = await probeNodeRuntime();
    // WO-051: the builder's current snapshot is enough — verification only
    // needs one sample id, not a fresh (formerly throwaway) full build.
    const snap = snapshotBuilder.current ?? (await snapshotBuilder.build(projectRoot).catch(() => null));
    const searchId = snap?.documents.find((d) => d.type !== 'workflow')?.id ?? null;
    return verifyConnection({
      probe,
      serverPath: status.serverPathResolved,
      rootPath: status.rootPathResolved,
      projectRoot,
      searchId,
    });
  });
  // Settings view (WO-036): identity facts for the Project settings and
  // Updates sections. The format label comes from core's classification of
  // the file on disk (REQ-015) — computed per call, so a project switch or
  // an external `veri migrate` is reflected on the next render.
  ipcMain.handle('veri:app-info', () => {
    const format = classifyFormat(join(projectRoot, 'veri'));
    return {
      version: app.getVersion(),
      packaged: app.isPackaged,
      home: app.getPath('home'),
      formatLabel: format.kind === 'current' ? `veri/format v${format.version}` : (formatStatement(format) ?? ''),
    };
  });
  ipcMain.handle('veri:update-status', () => updateStatus());
  ipcMain.handle('veri:agents', () => detectAgents(projectRoot));
  // Start agent session (WO-011): optional config write (DEC-011-gated),
  // then spawn the agent in a terminal. Resolves to an error message or null
  // so the picker can stay open and explain a failure.
  ipcMain.handle('veri:agent-launch', async (_e, id: AgentId, binPath: string, prompt: string, setup: boolean) => {
    try {
      if (setup) {
        await mcpWrite(() => connectAgent(projectRoot, mcpServerJs, id));
        log.info(`mcp-config: wrote ${id} agent config for ${projectRoot}`);
      }
      await launchAgent(projectRoot, id, binPath, prompt);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  });
  ipcMain.handle('veri:list-recent-projects', async () => {
    const projects = await getRecentProjects();
    // Prune rows that are not (or no longer) Veri projects — deleted dirs and
    // the false positives the old name-only check let in (e.g. ~/Projects).
    const valid = projects.filter((p) => isVeriProject(p.dir));
    if (valid.length !== projects.length) await saveRecentProjects(valid);
    const updated = await Promise.all(
      valid.map(async (p) => {
        const stats = await getProjectStats(p.dir);
        return { ...p, docCount: stats.docCount, issueCount: stats.issueCount };
      }),
    );
    return updated;
  });
  ipcMain.handle('veri:switch-project', (_e, dir: string, notice?: 'existing') => pointAppAt(dir, notice));
  ipcMain.handle('veri:open-project-folder', async () => {
    if (mainWin === null) return null;
    const result = await dialog.showOpenDialog(mainWin, {
      properties: ['openDirectory'],
      title: 'Select a project folder',
    });
    if (result.canceled) return null;
    const dir = result.filePaths[0];
    return dir !== undefined ? pointAppAt(dir) : null;
  });
  // New project (WO-018, SRC-007): the picker comes first — the directory is
  // the only required input — and a folder that already has veri/ is opened,
  // never scaffolded. The open itself moved renderer-side (WO-058, DEC-051):
  // the renderer must run its dirty-buffer guard before anything reloads, so
  // an existing project is reported back instead of opened here.
  ipcMain.handle('veri:new-project-pick', async (): Promise<NewProjectPick> => {
    if (mainWin === null) return null;
    const result = await dialog.showOpenDialog(mainWin, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose a folder for the new project',
      buttonLabel: 'Choose',
    });
    const dir = result.canceled ? undefined : result.filePaths[0];
    if (dir === undefined) return null;
    if (isVeriProject(dir)) return { kind: 'existing', dir };
    return { kind: 'new', dir, name: basename(dir) };
  });
  // Scaffold, then open. Order matters: scaffoldProject throws before
  // pointAppAt runs, so a failed create never touches the MRU list.
  ipcMain.handle('veri:create-project', async (_e, dir: string, demo: boolean): Promise<string | null> => {
    try {
      scaffoldProject(dir, { demo, demoRoot: DEMO_ROOT });
    } catch (err) {
      if (err instanceof ProjectExistsError) return `${dir} already contains a veri/ directory.`;
      return err instanceof Error ? err.message : String(err);
    }
    return pointAppAt(dir);
  });
  // Welcome screen's "Open an existing folder" (SRC-013): one picker, no
  // dialog loop — a bad pick comes back named so the screen can say so inline.
  ipcMain.handle('veri:welcome-open', async (): Promise<WelcomeOpen> => {
    if (mainWin === null) return null;
    const result = await dialog.showOpenDialog(mainWin, {
      properties: ['openDirectory'],
      title: 'Open a Veri project',
      buttonLabel: 'Open',
    });
    const dir = result.canceled ? undefined : result.filePaths[0];
    if (dir === undefined) return null; // cancel returns to the welcome screen, never quits
    if (!isVeriProject(dir)) return { kind: 'not-a-project', dir };
    const err = await pointAppAt(dir);
    return err === null ? { kind: 'opened' } : { kind: 'error', message: err };
  });
}

export type WelcomeOpen =
  | null
  | { kind: 'opened' }
  | { kind: 'not-a-project'; dir: string }
  | { kind: 'error'; message: string };

export type NewProjectPick =
  | null
  | { kind: 'existing'; dir: string }
  | { kind: 'new'; dir: string; name: string };

/**
 * Re-point the whole app at a project directory. Validates before mutating
 * anything so a bad pick (no veri/ inside) leaves projectRoot, the MRU, and
 * the watchers exactly as they were. Returns an error message, or null on
 * success (and on cancel — the renderer only surfaces non-null).
 */
async function pointAppAt(dir: string, notice?: 'existing'): Promise<string | null> {
  if (mainWin === null) return null;
  if (!isVeriProject(dir)) return `Not a Veri project — no veri/ directory inside ${dir}`;
  // REQ-015: a newer or unreadable format is stated, never opened — opening
  // would misrender; refusing leaves projectRoot and the MRU untouched.
  const format = classifyFormat(join(dir, 'veri'));
  if (!isOperableFormat(format)) return `Cannot open this project: ${formatStatement(format)}`;
  projectRoot = dir;
  // WO-051: caches from one project must never serve another — the new
  // project starts cold.
  snapshotBuilder.reset();
  log.info(`project opened: ${dir}`);
  await addProjectToMru(dir);
  watchProject(mainWin);
  // Opening reloads the renderer, so a notice about what just happened has to
  // ride through the reload as a query param rather than as renderer state.
  await mainWin.loadFile(join(here, '..', 'renderer', 'index.html'), {
    query: notice === undefined ? {} : { notice },
  });
  return null;
}

let watchers: ReturnType<typeof watch>[] = [];

function watchProject(win: BrowserWindow): void {
  for (const w of watchers) w.close();
  watchers = [];
  // Launch resolution (WO-027) guarantees a project before any window, but a
  // throwing watch() here would kill createWindow before loadFile — never
  // watch a root that has no veri/.
  if (!isVeriProject(projectRoot)) return;
  let timer: NodeJS.Timeout | undefined;
  const notify = (): void => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!win.isDestroyed()) win.webContents.send('veri:changed');
    }, 150);
  };
  // veri/ recursively, plus the project root (non-recursive) for CLAUDE.md —
  // both feed the context package. Watchers die with the window. .mcp.json
  // events instead feed the agent-connection panel; a change not preceded by
  // one of the panel's own writes is an external edit (REQ-005: re-check and
  // say so, files are the source of truth).
  watchers = [
    watch(join(projectRoot, 'veri'), { recursive: true }, notify),
    watch(projectRoot, (_event, filename) => {
      if (filename === '.mcp.json') {
        const external = Date.now() - mcpSelfWriteAt > 1000;
        if (!win.isDestroyed()) win.webContents.send('veri:mcp-changed', external);
      } else {
        notify();
      }
    }),
  ];
  win.on('closed', () => {
    for (const w of watchers) w.close();
  });
}

async function createWindow(mode: 'project' | 'welcome' = 'project'): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 1560,
    height: 980,
    minWidth: 1080,
    minHeight: 640,
    backgroundColor: '#0F0F11',
    title: 'Veri',
    show: shotPath === undefined,
    webPreferences: {
      preload: join(here, 'preload.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWin = win;

  watchProject(win);

  const query: Record<string, string> = {};
  if (mode === 'welcome') query['welcome'] = '1';
  const view = process.env['VERI_UI_VIEW'];
  const doc = process.env['VERI_UI_DOC'];
  if (view !== undefined) query['view'] = view;
  if (doc !== undefined) query['doc'] = doc;
  await win.loadFile(join(here, '..', 'renderer', 'index.html'), { query });

  if (shotPath !== undefined) {
    // Give fonts and layout a beat to settle before capturing. VERI_UI_EVAL
    // (renderer JS) and VERI_UI_SHOT_DELAY_MS let automated checks poke state
    // (e.g. open the autocomplete) or wait out an external file edit first.
    const evalJs = process.env['VERI_UI_EVAL'];
    if (evalJs !== undefined) {
      await new Promise((r) => setTimeout(r, 600));
      await win.webContents.executeJavaScript(evalJs);
    }
    const delay = Number.parseInt(process.env['VERI_UI_SHOT_DELAY_MS'] ?? '1200', 10);
    await new Promise((r) => setTimeout(r, delay));
    const image = await win.webContents.capturePage();
    await writeFile(shotPath, image.toPNG());
    app.exit(0);
  }

  return win;
}

/**
 * Application menu: the standard macOS roles, plus the WO-031 Help item.
 * "Report an Issue…" opens the browser on a prefilled GitHub issue form —
 * app and macOS version ride along as query params, so a report from the
 * app arrives diagnosable without the user copying versions by hand.
 */
function installMenu(): void {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: 'appMenu' },
      { role: 'fileMenu' },
      { role: 'editMenu' },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
      {
        role: 'help',
        submenu: [
          {
            label: 'Report an Issue…',
            click: () => {
              void shell.openExternal(buildIssueUrl(app.getVersion(), process.getSystemVersion()));
            },
          },
        ],
      },
    ]),
  );
}

/**
 * DEC-027 fallback chain for launches outside a project (Finder/Dock: cwd is
 * `/`): most recent MRU entry that is still a project. No known project means
 * the welcome screen (WO-030, SRC-013) — the bare picker loop is gone from
 * the cold-start path.
 */
async function resolveLaunchRoot(): Promise<string | null> {
  const recent = (await getRecentProjects()).find((p) => isVeriProject(p.dir));
  return recent?.dir ?? null;
}

/** The picker half of the DEC-027 chain, MRU deliberately skipped. */
async function pickProjectDir(): Promise<string | null> {
  for (;;) {
    const pick = await dialog.showOpenDialog({
      title: 'Open a Veri project',
      buttonLabel: 'Open',
      properties: ['openDirectory'],
    });
    const dir = pick.filePaths[0];
    if (pick.canceled || dir === undefined) return null;
    if (isVeriProject(dir)) return dir;
    const { response } = await dialog.showMessageBox({
      type: 'info',
      message: 'Not a Veri project',
      detail: `No veri/ knowledge base inside ${dir}.`,
      buttons: ['Choose Again', 'Quit'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 1) return null;
  }
}

app.whenReady().then(async () => {
  log.info(`app ${app.getVersion()} launched (macOS ${process.getSystemVersion()})`);
  // Packaged builds carry the icon via electron-builder (build/icon.png →
  // .icns); dev runs would show the stock Electron dock icon without this.
  if (!app.isPackaged && process.platform === 'darwin') {
    app.dock?.setIcon(join(here, '..', 'build', 'icon.png'));
  }
  installMenu();
  registerIpc();
  void cleanupLaunchScripts();
  // findProjectRoot's result is unvalidated (explicit args pass through) —
  // never let a non-project launch dir into the MRU.
  let root = isVeriProject(projectRoot) ? projectRoot : await resolveLaunchRoot();
  // REQ-015: a newer or unreadable format is stated, never opened. Straight
  // to the picker afterwards — the MRU may hold the very project just refused.
  while (root !== null) {
    const format = classifyFormat(join(root, 'veri'));
    if (isOperableFormat(format)) break;
    const { response } = await dialog.showMessageBox({
      type: 'info',
      message: 'Cannot open this project',
      detail: formatStatement(format) ?? 'format mismatch',
      buttons: ['Choose Another Project', 'Quit'],
      defaultId: 0,
      cancelId: 1,
    });
    root = response === 1 ? null : await pickProjectDir();
  }
  if (root === null) {
    // Cold start (SRC-013): no known project resolves — the welcome screen,
    // not a picker loop and not a quit. Every action on it leads into the
    // existing create/open flows, which reload this window into the project.
    await createWindow('welcome');
    startUpdater(log);
    return;
  }
  projectRoot = root;
  log.info(`project opened: ${projectRoot}`);
  await addProjectToMru(projectRoot);
  await createWindow();
  startUpdater(log);
});

app.on('will-quit', () => {
  log.info('app quit');
});

app.on('window-all-closed', () => {
  app.quit();
});
