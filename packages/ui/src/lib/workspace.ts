/**
 * Per-project workspace state (WO-014): pins and recents. Workspace state is
 * not knowledge (SRC-005) — it lives in one JSON under Electron userData,
 * keyed by absolute project root, following the DEC-010 MRU precedent. It is
 * never written into veri/.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface WorkspaceState {
  pinned: string[];
  recents: string[];
}

interface WorkspaceFile {
  version: 1;
  projects: Record<string, WorkspaceState>;
}

export const EMPTY_WORKSPACE: WorkspaceState = { pinned: [], recents: [] };

function fileOf(configDir: string): string {
  return join(configDir, 'workspace-state.json');
}

async function readAll(configDir: string): Promise<WorkspaceFile> {
  try {
    const parsed = JSON.parse(await readFile(fileOf(configDir), 'utf-8')) as WorkspaceFile;
    if (parsed.version === 1 && typeof parsed.projects === 'object' && parsed.projects !== null) return parsed;
  } catch {
    // Missing or corrupt file — start clean; workspace state is rebuildable.
  }
  return { version: 1, projects: {} };
}

const clean = (ids: unknown): string[] =>
  Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];

export async function loadWorkspaceState(configDir: string, projectRoot: string): Promise<WorkspaceState> {
  const state = (await readAll(configDir)).projects[projectRoot];
  return state === undefined ? EMPTY_WORKSPACE : { pinned: clean(state.pinned), recents: clean(state.recents) };
}

export async function saveWorkspaceState(configDir: string, projectRoot: string, state: WorkspaceState): Promise<void> {
  const all = await readAll(configDir);
  all.projects[projectRoot] = { pinned: clean(state.pinned), recents: clean(state.recents).slice(0, 10) };
  await mkdir(configDir, { recursive: true });
  await writeFile(fileOf(configDir), JSON.stringify(all, null, 2));
}
