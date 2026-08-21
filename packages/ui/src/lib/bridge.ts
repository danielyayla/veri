/**
 * Updater bridge (WO-073): this Electron line ends at this release. The next
 * Veri is a Tauri app whose updater speaks a different feed (latest.json,
 * minisign-signed archives) that electron-updater cannot install from —
 * Squirrel.Mac only installs Squirrel zips. So the last Electron release
 * watches the *new* feed and, once it exists, offers the user a one-time
 * browser download of the new installer. Installing it replaces Veri.app in
 * place; tauri-updater takes over from there.
 *
 * Only the feed probe is a network call, against the same GitHub Releases
 * host the updater already polls (REQ-011's single network dependency).
 */

/** The tauri-updater manifest the Tauri releases publish. */
export const TAURI_FEED_URL = 'https://github.com/danielyayla/veri/releases/latest/download/latest.json';

/** Where the Download button sends the user — the release page, so they pick
    the artifact for their architecture (per-arch DMGs, REQ-023). */
export const TAURI_DOWNLOAD_URL = 'https://github.com/danielyayla/veri/releases/latest';

/**
 * The version the bridge should offer, or null. Null means: feed absent or
 * unparseable (the Tauri line has not shipped yet — the expected state for
 * this release's whole natural life), or the feed somehow names a version
 * that is not ahead of this one.
 */
export function bridgeTarget(currentVersion: string, feed: unknown): string | null {
  if (typeof feed !== 'object' || feed === null) return null;
  const raw = (feed as Record<string, unknown>)['version'];
  if (typeof raw !== 'string') return null;
  const version = raw.replace(/^v/, '');
  if (!/^\d+\.\d+\.\d+/.test(version)) return null;
  return newer(version, currentVersion) ? version : null;
}

/** a > b on the numeric major.minor.patch prefix. */
function newer(a: string, b: string): boolean {
  const parse = (v: string): number[] => v.split('.').map((n) => Number.parseInt(n, 10));
  const [a0 = 0, a1 = 0, a2 = 0] = parse(a);
  const [b0 = 0, b1 = 0, b2 = 0] = parse(b);
  if (a0 !== b0) return a0 > b0;
  if (a1 !== b1) return a1 > b1;
  return a2 > b2;
}
