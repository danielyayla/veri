import { watch } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BrowserWindow, app, clipboard, ipcMain } from 'electron';
import { assembleContext, searchDocs } from '@veri/mcp';
import { buildSnapshot } from './lib/snapshot.ts';
import { appendNote, setStatus } from './lib/write.ts';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(process.argv[2] ?? process.cwd());

// Screenshot mode for automated visual verification: render one view headlessly,
// write a PNG, quit. VERI_UI_SHOT=/path.png [VERI_UI_VIEW=board] [VERI_UI_DOC=WO-005]
const shotPath = process.env['VERI_UI_SHOT'];

function registerIpc(): void {
  ipcMain.handle('veri:snapshot', () => buildSnapshot(projectRoot));
  ipcMain.handle('veri:context', (_e, id: string) => assembleContext(projectRoot, id));
  ipcMain.handle('veri:search', (_e, query: string) => searchDocs(projectRoot, query));
  ipcMain.handle('veri:copy', (_e, text: string) => clipboard.writeText(text));
  ipcMain.handle('veri:set-status', (_e, id: string, status: string) => setStatus(projectRoot, id, status));
  ipcMain.handle('veri:append-note', (_e, id: string, note: string) => appendNote(projectRoot, id, note));
}

function watchProject(win: BrowserWindow): void {
  let timer: NodeJS.Timeout | undefined;
  const notify = (): void => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!win.isDestroyed()) win.webContents.send('veri:changed');
    }, 150);
  };
  // veri/ recursively, plus the project root (non-recursive) for CLAUDE.md —
  // both feed the context package. Watchers die with the window.
  const watchers = [
    watch(join(projectRoot, 'veri'), { recursive: true }, notify),
    watch(projectRoot, notify),
  ];
  win.on('closed', () => {
    for (const w of watchers) w.close();
  });
}

async function createWindow(): Promise<void> {
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
}

app.whenReady().then(() => {
  registerIpc();
  void createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
