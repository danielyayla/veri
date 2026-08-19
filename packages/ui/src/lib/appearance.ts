/**
 * The theme preference (WO-060, SRC-032): one app-level value, per machine,
 * stored in userData — never in the project tree, so git, teammates, and
 * context packages never see it.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export type ThemePref = 'system' | 'light' | 'dark';

export function isThemePref(v: unknown): v is ThemePref {
  return v === 'system' || v === 'light' || v === 'dark';
}

const FILE = 'appearance.json';

/** Anything unreadable or unknown falls back to the shipped default: System. */
export async function loadThemePref(configDir: string): Promise<ThemePref> {
  try {
    const raw = JSON.parse(await readFile(join(configDir, FILE), 'utf8')) as { theme?: unknown };
    return isThemePref(raw.theme) ? raw.theme : 'system';
  } catch {
    return 'system';
  }
}

export async function saveThemePref(configDir: string, theme: ThemePref): Promise<void> {
  await mkdir(configDir, { recursive: true });
  await writeFile(join(configDir, FILE), JSON.stringify({ theme }, null, 2));
}
