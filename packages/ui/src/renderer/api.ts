import type { ContextPackage, SearchHit } from '@veri/mcp';
import type { Snapshot } from '../lib/snapshot.ts';

/** The preload-exposed bridge (see src/preload.mts). */
export interface VeriApi {
  snapshot(): Promise<Snapshot>;
  context(id: string): Promise<ContextPackage>;
  search(query: string): Promise<SearchHit[]>;
  copyText(text: string): Promise<void>;
  setStatus(id: string, status: string): Promise<void>;
  appendNote(id: string, note: string): Promise<void>;
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
