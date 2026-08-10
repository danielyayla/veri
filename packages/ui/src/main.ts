import { watch } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow, app, clipboard, dialog, ipcMain } from 'electron';
import { assembleContext, searchDocs } from '@veri/mcp';
import { findProjectRoot, isVeriProject } from './lib/root.ts';
import { fixRootArg, mcpStatus, writeVeriEntry } from './lib/mcpconfig.ts';
import { cleanupLaunchScripts, connectAgent, detectAgents, launchAgent } from './lib/agents.ts';
import type { AgentId } from './lib/agents.ts';
import { buildSnapshot } from './lib/snapshot.ts';
import { appendNote, setStatus } from './lib/write.ts';
import type { ProjectInfo } from './renderer/api.ts';

const here = dirname(fileURLToPath(import.meta.url));
let projectRoot = findProjectRoot(process.argv[2], process.cwd());

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

async function getProjectStats(dir: string): Promise<{ docCount: number; issueCount: number }> {
  try {
    const snap = await buildSnapshot(dir);
    return { docCount: snap.documents.length, issueCount: snap.issues.length };
  } catch {
    return { docCount: 0, issueCount: 0 };
  }
}

// Screenshot mode for automated visual verification: render one view headlessly,
// write a PNG, quit. VERI_UI_SHOT=/path.png [VERI_UI_VIEW=board] [VERI_UI_DOC=WO-005]
const shotPath = process.env['VERI_UI_SHOT'];

let mainWin: BrowserWindow | null = null;

function registerIpc(): void {
  ipcMain.handle('veri:snapshot', () => buildSnapshot(projectRoot));
  ipcMain.handle('veri:context', (_e, id: string) => assembleContext(projectRoot, id));
  ipcMain.handle('veri:search', (_e, query: string) => searchDocs(projectRoot, query));
  ipcMain.handle('veri:copy', (_e, text: string) => clipboard.writeText(text));
  ipcMain.handle('veri:set-status', (_e, id: string, status: string) => setStatus(projectRoot, id, status));
  ipcMain.handle('veri:append-note', (_e, id: string, note: string) => appendNote(projectRoot, id, note));
  ipcMain.handle('veri:mcp-status', () => mcpStatus(projectRoot, mcpServerJs));
  ipcMain.handle('veri:mcp-setup', () => mcpWrite(() => writeVeriEntry(projectRoot, mcpServerJs)));
  ipcMain.handle('veri:mcp-fix-root', () => mcpWrite(() => fixRootArg(projectRoot)));
  ipcMain.handle('veri:agents', () => detectAgents(projectRoot));
  // Start agent session (WO-011): optional config write (DEC-011-gated),
  // then spawn the agent in a terminal. Resolves to an error message or null
  // so the picker can stay open and explain a failure.
  ipcMain.handle('veri:agent-launch', async (_e, id: AgentId, binPath: string, prompt: string, setup: boolean) => {
    try {
      if (setup) await mcpWrite(() => connectAgent(projectRoot, mcpServerJs, id));
      await launchAgent(projectRoot, id, binPath, prompt);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  });
  ipcMain.handle('veri:list-recent-projects', async () => {
    const projects = await getRecentProjects();
    const updated = await Promise.all(
      projects.map(async (p) => {
        const stats = await getProjectStats(p.dir);
        return { ...p, docCount: stats.docCount, issueCount: stats.issueCount };
      }),
    );
    return updated;
  });
  ipcMain.handle('veri:switch-project', (_e, dir: string) => pointAppAt(dir));
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
}

/**
 * Re-point the whole app at a project directory. Validates before mutating
 * anything so a bad pick (no veri/ inside) leaves projectRoot, the MRU, and
 * the watchers exactly as they were. Returns an error message, or null on
 * success (and on cancel — the renderer only surfaces non-null).
 */
async function pointAppAt(dir: string): Promise<string | null> {
  if (mainWin === null) return null;
  if (!isVeriProject(dir)) return `Not a Veri project — no veri/ directory inside ${dir}`;
  projectRoot = dir;
  await addProjectToMru(dir);
  watchProject(mainWin);
  await mainWin.loadFile(join(here, '..', 'renderer', 'index.html'));
  return null;
}

let watchers: ReturnType<typeof watch>[] = [];

function watchProject(win: BrowserWindow): void {
  for (const w of watchers) w.close();
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

async function createWindow(): Promise<BrowserWindow> {
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

app.whenReady().then(async () => {
  registerIpc();
  void cleanupLaunchScripts();
  await addProjectToMru(projectRoot);
  await createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
