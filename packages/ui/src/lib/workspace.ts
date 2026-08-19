/**
 * Per-project workspace state (WO-014): pins and recents. Workspace state is
 * not knowledge (SRC-005) — it lives in one JSON under Electron userData,
 * keyed by absolute project root, following the DEC-010 MRU precedent. It is
 * never written into veri/.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** One persisted tab (WO-054, SRC-026): the tab's *current* target and its
    preview flag — never the history stack, which is session-only (SRC-018). */
export interface WorkspaceTab {
  target: string;
  preview: boolean;
}

export interface WorkspaceState {
  pinned: string[];
  recents: string[];
  /** Open tab set (WO-054, SRC-026). Additive and optional — the file
      version stays 1; a file without these fields behaves exactly as
      before they existed. */
  tabs?: WorkspaceTab[];
  active?: number;
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

/** Malformed rows (hand-edits, older writers) drop silently — workspace
    state is rebuildable, so tolerating beats failing. */
const cleanTabs = (tabs: unknown): WorkspaceTab[] | undefined =>
  Array.isArray(tabs)
    ? tabs
        .filter(
          (t): t is WorkspaceTab =>
            typeof t === 'object' &&
            t !== null &&
            typeof (t as WorkspaceTab).target === 'string' &&
            typeof (t as WorkspaceTab).preview === 'boolean',
        )
        .map((t) => ({ target: t.target, preview: t.preview }))
    : undefined;

const cleanActive = (active: unknown): number | undefined =>
  typeof active === 'number' && Number.isInteger(active) && active >= 0 ? active : undefined;

/** Absent optional fields stay absent — a pre-WO-054 entry round-trips
    byte-identical, and version stays 1. */
function cleanState(state: WorkspaceState): WorkspaceState {
  const out: WorkspaceState = { pinned: clean(state.pinned), recents: clean(state.recents) };
  const tabs = cleanTabs(state.tabs);
  if (tabs !== undefined) out.tabs = tabs;
  const active = cleanActive(state.active);
  if (active !== undefined) out.active = active;
  return out;
}

export async function loadWorkspaceState(configDir: string, projectRoot: string): Promise<WorkspaceState> {
  const state = (await readAll(configDir)).projects[projectRoot];
  return state === undefined ? EMPTY_WORKSPACE : cleanState(state);
}

export async function saveWorkspaceState(configDir: string, projectRoot: string, state: WorkspaceState): Promise<void> {
  const all = await readAll(configDir);
  const cleaned = cleanState(state);
  cleaned.recents = cleaned.recents.slice(0, 10);
  all.projects[projectRoot] = cleaned;
  await mkdir(configDir, { recursive: true });
  await writeFile(fileOf(configDir), JSON.stringify(all, null, 2));
}
