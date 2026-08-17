import type { ApproveResult, CreateResult, DocType, SaveResult } from '@veri/core';
import type { ContextPackage, PaletteResult } from '@veri/mcp';
import type { AgentId, AgentInfo } from '../lib/agents.ts';
import type { McpStatus } from '../lib/mcpconfig.ts';
import type { Snapshot } from '../lib/snapshot.ts';
import type { WorkspaceState } from '../lib/workspace.ts';

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
  /** The approval act (REQ-008): stamp-and-flip via core's shared write path. */
  approve(id: string): Promise<ApproveResult>;
  /** Return a pending doc with a dated entry under "## Review notes". */
  reviewNote(id: string, note: string): Promise<void>;
  mcpStatus(): Promise<McpStatus>;
  /** Setup and "Replace with Veri's entry" are the same write. */
  mcpSetup(): Promise<void>;
  mcpFixRoot(): Promise<void>;
  /** Fresh adapter detection (PATH + configs read from disk on every call). */
  agents(): Promise<AgentInfo[]>;
  /** Optionally write the veri entry, then launch; error message or null. */
  agentLaunch(id: AgentId, binPath: string, prompt: string, setup: boolean): Promise<string | null>;
  /** Fires on any .mcp.json change; external=false for the panel's own writes. */
  onMcpChanged(cb: (external: boolean) => void): void;
  listRecentProjects(): Promise<ProjectInfo[]>;
  /** Both resolve to an error message to show the user, or null on success/cancel. */
  switchProject(dir: string): Promise<string | null>;
  openProjectFolder(): Promise<string | null>;
  /**
   * New project, step 1 (WO-018): native directory picker. A folder that
   * already holds veri/ is opened here and reports `opened`; anything else
   * comes back as `new` for the creation sheet.
   */
  newProjectPick(): Promise<NewProjectPick>;
  /** New project, step 2: scaffold `dir` then open it. Error message or null. */
  createProject(dir: string, demo: boolean): Promise<string | null>;
  onChanged(cb: () => void): void;
}

export interface TemplateInfo {
  body: string;
  source: 'project' | 'builtin';
  customized: boolean;
}

export type NewProjectPick =
  | null
  | { kind: 'opened' }
  | { kind: 'error'; message: string }
  | { kind: 'new'; dir: string; name: string };

declare global {
  interface Window {
    veri: VeriApi;
  }
}

export function api(): VeriApi {
  return window.veri;
}
