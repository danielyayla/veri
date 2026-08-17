import { app, dialog } from 'electron';
// electron-updater is CJS; named imports are not reliable under NodeNext ESM.
import updater from 'electron-updater';

const { autoUpdater } = updater;

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

/**
 * Background auto-update per REQ-011: check on launch and every few hours,
 * download silently, then ask — never force a restart. "Later" leaves the
 * update to install on quit (autoInstallOnAppQuit). Every failure path is
 * swallowed: an unreachable feed must behave exactly like being up to date.
 */
export function startUpdater(): void {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('error', () => {});

  const promptedVersions = new Set<string>();
  autoUpdater.on('update-downloaded', (info) => {
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
    autoUpdater.checkForUpdates().catch(() => {});
  };
  // Off the launch path: the window is up before the first check runs.
  setTimeout(check, 10_000);
  setInterval(check, CHECK_INTERVAL_MS);
}
