import type { ApproveResult, CreateResult, DocType, SaveResult } from '@verikb/core';
import type { ContextPackage, PaletteResult } from '@verikb/mcp';
import type { AgentId, AgentInfo } from '../lib/agents.ts';
import type { McpStatus } from '../lib/mcpconfig.ts';
import type { RuntimeProbe } from '../lib/noderuntime.ts';
import type { VerifyResult } from '../lib/verify.ts';
import type { Snapshot } from '../lib/snapshot.ts';
import type { CommitRequest, CommittedSource, InspectRow } from '../lib/intakehost.ts';
import type { WorkspaceState } from '../lib/workspace.ts';

export type { CommitRequest, CommittedSource, InspectRow };

export interface ProjectInfo {
  dir: string;
  name: string;
  accentColor: string;
  docCount: number;
  issueCount: number;
}

/** The preload-exposed bridge (see src/preload.mts). */
export interface VeriApi {
  snapshot(): Promise<Snapshot>;
  context(id: string): Promise<ContextPackage>;
  /** Ranked ⌘K search (WO-013); recents feed the recency boost. */
  paletteSearch(query: string, recents: string[]): Promise<PaletteResult>;
  /** Per-project pins/recents in userData (WO-014) — workspace state, not knowledge. */
  workspaceLoad(): Promise<WorkspaceState>;
  workspaceSave(state: WorkspaceState): Promise<void>;
  copyText(text: string): Promise<void>;
  setStatus(id: string, status: string): Promise<void>;
  /** Raw file text for the editor (WO-022); null when the file is gone. */
  readDoc(file: string): Promise<string | null>;
  /** Guarded verbatim write via core (REQ-009 §4); rejects on the approval
      boundary with the guard's reason as the error message. */
  saveDoc(file: string, text: string): Promise<SaveResult>;
  /** Creation flow (REQ-009 §2): scaffold via core, next free id. */
  createDoc(type: DocType, title: string): Promise<CreateResult>;
  /** Template settings (WO-024): effective body + provenance from core. */
  templateRead(type: DocType): Promise<TemplateInfo>;
  /** Verbatim write of veri/templates/<type>.md, creating the dir if needed. */
  templateWrite(type: DocType, body: string): Promise<void>;
  /** Rewrite the type's file to the built-in default (SRC-009 reset). */
  templateReset(type: DocType): Promise<void>;
  appendNote(id: string, note: string): Promise<void>;
  /** Typed-link editing (WO-056): replace a doc's outbound links wholesale.
      Main refuses unknown targets; core rewrites only the links block. */
  setLinks(id: string, links: { id: string; rel: string }[]): Promise<void>;
  /** The approval act (REQ-008): stamp-and-flip via core's shared write path. */
  approve(id: string): Promise<ApproveResult>;
  /** Return a pending doc with a dated entry under "## Review notes". */
  reviewNote(id: string, note: string): Promise<void>;
  mcpStatus(): Promise<McpStatus>;
  /** Setup and "Replace with Veri's entry" are the same write. */
  mcpSetup(): Promise<void>;
  mcpFixRoot(): Promise<void>;
  /** DEC-031 login-shell probe — what the *agent's* shell will find. */
  runtimeProbe(): Promise<RuntimeProbe>;
  /** LIVE CHECK (WO-030): one spawn, real MCP, success or a named cause. */
  verifyConnection(): Promise<VerifyResult>;
  /** Welcome screen's open-existing picker: one shot, inline result. */
  welcomeOpen(): Promise<WelcomeOpen>;
  /** Settings view facts (WO-036): version, packaging, home, format label. */
  appInfo(): Promise<AppInfo>;
  /** What the background updater has done so far (WO-028 surfaces). */
  updateStatus(): Promise<UpdateStatus>;
  /** Fresh adapter detection (PATH + configs read from disk on every call). */
  agents(): Promise<AgentInfo[]>;
  /** Optionally write the veri entry, then launch; error message or null. */
  agentLaunch(id: AgentId, binPath: string, prompt: string, setup: boolean): Promise<string | null>;
  /** Fires on any .mcp.json change; external=false for the panel's own writes. */
  onMcpChanged(cb: (external: boolean) => void): void;
  listRecentProjects(): Promise<ProjectInfo[]>;
  /** Both resolve to an error message to show the user, or null on success/cancel.
      The `'existing'` notice rides the reload so the reopened window can say the
      folder was opened, not scaffolded (WO-058). */
  switchProject(dir: string, notice?: 'existing'): Promise<string | null>;
  openProjectFolder(): Promise<string | null>;
  /**
   * New project, step 1 (WO-018): native directory picker. A folder that
   * already holds veri/ comes back as `existing` — the renderer switches to
   * it after the dirty-buffer guard (WO-058) — anything else as `new` for
   * the creation sheet.
   */
  newProjectPick(): Promise<NewProjectPick>;
  /** New project, step 2: scaffold `dir` then open it. Error message or null. */
  createProject(dir: string, demo: boolean): Promise<string | null>;
  onChanged(cb: () => void): void;
  /** File import (WO-096): derive what each file would become — writes nothing. */
  importInspect(paths: string[]): Promise<InspectRow[]>;
  /** File the accepted rows through core's intake seam; ids allocate here. */
  importCommit(requests: CommitRequest[]): Promise<CommittedSource[]>;
  /** Native multi-file picker for the Sources panel's "Import files…". */
  pickImportFiles(): Promise<string[] | null>;
  /** OS drag-drop over the window (shell-forwarded, DEC-095): hover with the
      dragged paths, drop with them, cancel when the drag leaves. */
  onDragHover(cb: (paths: string[]) => void): void;
  onDragDrop(cb: (paths: string[]) => void): void;
  onDragCancel(cb: () => void): void;
  /** Theme (WO-060): app-level preference; `dark` is the resolved mode. */
  themeGet(): Promise<ThemeState>;
  themeSet(pref: ThemePref): Promise<ThemeState>;
  /** Fires whenever the resolved mode may have changed (OS flip, explicit set). */
  onThemeChanged(cb: (dark: boolean) => void): void;
}

export type ThemePref = 'system' | 'light' | 'dark';

export interface ThemeState {
  pref: ThemePref;
  dark: boolean;
}

export interface TemplateInfo {
  body: string;
  source: 'project' | 'builtin';
  customized: boolean;
}

/** Static facts for the Settings view (WO-036), one IPC read per launch. */
export interface AppInfo {
  version: string;
  packaged: boolean;
  home: string;
  /** Core's classification of veri/format (REQ-015), ready to display. */
  formatLabel: string;
}

export interface UpdateStatus {
  downloadedVersion: string | null;
  lastCheckAt: number | null;
}

export type NewProjectPick =
  | null
  | { kind: 'existing'; dir: string }
  | { kind: 'new'; dir: string; name: string };

export type WelcomeOpen =
  | null
  | { kind: 'opened' }
  | { kind: 'not-a-project'; dir: string }
  | { kind: 'error'; message: string };

declare global {
  interface Window {
    veri: VeriApi;
  }
}

export function api(): VeriApi {
  return window.veri;
}
