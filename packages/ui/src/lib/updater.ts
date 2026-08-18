import { app, dialog } from 'electron';
// electron-updater is CJS; named imports are not reliable under NodeNext ESM.
import updater from 'electron-updater';
import { updaterLogger } from './log.ts';
import type { Logger } from './log.ts';

const { autoUpdater } = updater;

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

/** What the Settings → Updates section shows (WO-036). Failed checks leave
    both fields alone: REQ-011 says an unreachable feed must behave exactly
    like being up to date, and the log is where failures go (DEC-034). */
export interface UpdateStatus {
  /** Set once a background download completes; installs on restart or quit. */
  downloadedVersion: string | null;
  /** Epoch ms of the last check that reached the feed; null before then. */
  lastCheckAt: number | null;
}

const status: UpdateStatus = { downloadedVersion: null, lastCheckAt: null };

export function updateStatus(): UpdateStatus {
  return { ...status };
}

/**
 * Background auto-update per REQ-011: check on launch and every few hours,
 * download silently, then ask — never force a restart. "Later" leaves the
 * update to install on quit (autoInstallOnAppQuit). Every failure path is
 * swallowed in the UI: an unreachable feed must behave exactly like being up
 * to date. The log is where those swallowed outcomes go (WO-031, DEC-034) —
 * it is the only place a failed check is visible at all.
 */
export function startUpdater(log: Logger): void {
  if (!app.isPackaged) return;

  autoUpdater.logger = updaterLogger(log);
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('error', (err) => {
    // One greppable outcome line; the updater's own logger carries the detail.
    log.error(`update check failed: ${err.message.split('\n')[0]}`);
  });

  const promptedVersions = new Set<string>();
  autoUpdater.on('update-downloaded', (info) => {
    status.downloadedVersion = info.version;
    // Interval re-checks re-emit for the same download; ask once per version.
    if (promptedVersions.has(info.version)) return;
    promptedVersions.add(info.version);
    void dialog
      .showMessageBox({
        type: 'info',
        message: `Veri ${info.version} is ready to install`,
        detail:
          'The update was downloaded in the background. Restart now to use it, or keep working — it will install when you quit.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall();
      });
  });

  const check = (): void => {
    autoUpdater
      .checkForUpdates()
      .then(() => {
        status.lastCheckAt = Date.now();
      })
      .catch(() => {});
  };
  // Off the launch path: the window is up before the first check runs.
  setTimeout(check, 10_000);
  setInterval(check, CHECK_INTERVAL_MS);
}
