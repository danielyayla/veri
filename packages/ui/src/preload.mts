import { contextBridge, ipcRenderer } from 'electron';

// The renderer-facing API. Shapes are documented in renderer/api.ts (VeriApi).
contextBridge.exposeInMainWorld('veri', {
  snapshot: () => ipcRenderer.invoke('veri:snapshot'),
  context: (id: string) => ipcRenderer.invoke('veri:context', id),
  paletteSearch: (query: string, recents: string[]) => ipcRenderer.invoke('veri:palette-search', query, recents),
  copyText: (text: string) => ipcRenderer.invoke('veri:copy', text),
  setStatus: (id: string, status: string) => ipcRenderer.invoke('veri:set-status', id, status),
  appendNote: (id: string, note: string) => ipcRenderer.invoke('veri:append-note', id, note),
  mcpStatus: () => ipcRenderer.invoke('veri:mcp-status'),
  mcpSetup: () => ipcRenderer.invoke('veri:mcp-setup'),
  mcpFixRoot: () => ipcRenderer.invoke('veri:mcp-fix-root'),
  agents: () => ipcRenderer.invoke('veri:agents'),
  agentLaunch: (id: string, binPath: string, prompt: string, setup: boolean) =>
    ipcRenderer.invoke('veri:agent-launch', id, binPath, prompt, setup),
  onMcpChanged: (cb: (external: boolean) => void) => {
    ipcRenderer.on('veri:mcp-changed', (_e, external: boolean) => cb(external));
  },
  listRecentProjects: () => ipcRenderer.invoke('veri:list-recent-projects'),
  switchProject: (dir: string) => ipcRenderer.invoke('veri:switch-project', dir),
  openProjectFolder: () => ipcRenderer.invoke('veri:open-project-folder'),
  onChanged: (cb: () => void) => {
    ipcRenderer.on('veri:changed', () => cb());
  },
});
