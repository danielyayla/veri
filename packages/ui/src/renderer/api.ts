import type { ContextPackage, PaletteResult } from '@veri/mcp';
import type { AgentId, AgentInfo } from '../lib/agents.ts';
import type { McpStatus } from '../lib/mcpconfig.ts';
import type { Snapshot } from '../lib/snapshot.ts';

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
  copyText(text: string): Promise<void>;
  setStatus(id: string, status: string): Promise<void>;
  appendNote(id: string, note: string): Promise<void>;
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
  onChanged(cb: () => void): void;
}

declare global {
  interface Window {
    veri: VeriApi;
  }
}

export function api(): VeriApi {
  return window.veri;
}
