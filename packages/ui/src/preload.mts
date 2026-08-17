import { contextBridge, ipcRenderer } from 'electron';

// The renderer-facing API. Shapes are documented in renderer/api.ts (VeriApi).
contextBridge.exposeInMainWorld('veri', {
  snapshot: () => ipcRenderer.invoke('veri:snapshot'),
  context: (id: string) => ipcRenderer.invoke('veri:context', id),
  paletteSearch: (query: string, recents: string[]) => ipcRenderer.invoke('veri:palette-search', query, recents),
  workspaceLoad: () => ipcRenderer.invoke('veri:workspace-load'),
  workspaceSave: (state: { pinned: string[]; recents: string[] }) => ipcRenderer.invoke('veri:workspace-save', state),
  copyText: (text: string) => ipcRenderer.invoke('veri:copy', text),
  setStatus: (id: string, status: string) => ipcRenderer.invoke('veri:set-status', id, status),
  readDoc: (file: string) => ipcRenderer.invoke('veri:read-doc', file),
  saveDoc: (file: string, text: string) => ipcRenderer.invoke('veri:save-doc', file, text),
  createDoc: (type: string, title: string) => ipcRenderer.invoke('veri:create-doc', type, title),
  templateRead: (type: string) => ipcRenderer.invoke('veri:template-read', type),
  templateWrite: (type: string, body: string) => ipcRenderer.invoke('veri:template-write', type, body),
  templateReset: (type: string) => ipcRenderer.invoke('veri:template-reset', type),
  appendNote: (id: string, note: string) => ipcRenderer.invoke('veri:append-note', id, note),
  approve: (id: string) => ipcRenderer.invoke('veri:approve', id),
  reviewNote: (id: string, note: string) => ipcRenderer.invoke('veri:review-note', id, note),
  mcpStatus: () => ipcRenderer.invoke('veri:mcp-status'),
  mcpSetup: () => ipcRenderer.invoke('veri:mcp-setup'),
  mcpFixRoot: () => ipcRenderer.invoke('veri:mcp-fix-root'),
  runtimeProbe: () => ipcRenderer.invoke('veri:runtime-probe'),
  verifyConnection: () => ipcRenderer.invoke('veri:verify-connection'),
  welcomeOpen: () => ipcRenderer.invoke('veri:welcome-open'),
  agents: () => ipcRenderer.invoke('veri:agents'),
  agentLaunch: (id: string, binPath: string, prompt: string, setup: boolean) =>
    ipcRenderer.invoke('veri:agent-launch', id, binPath, prompt, setup),
  onMcpChanged: (cb: (external: boolean) => void) => {
    ipcRenderer.on('veri:mcp-changed', (_e, external: boolean) => cb(external));
  },
  listRecentProjects: () => ipcRenderer.invoke('veri:list-recent-projects'),
  switchProject: (dir: string) => ipcRenderer.invoke('veri:switch-project', dir),
  openProjectFolder: () => ipcRenderer.invoke('veri:open-project-folder'),
  newProjectPick: () => ipcRenderer.invoke('veri:new-project-pick'),
  createProject: (dir: string, demo: boolean) => ipcRenderer.invoke('veri:create-project', dir, demo),
  onChanged: (cb: () => void) => {
    ipcRenderer.on('veri:changed', () => cb());
  },
});
