import { contextBridge, ipcRenderer } from 'electron';

// The renderer-facing API. Shapes are documented in renderer/api.ts (VeriApi).
contextBridge.exposeInMainWorld('veri', {
  snapshot: () => ipcRenderer.invoke('veri:snapshot'),
  context: (id: string) => ipcRenderer.invoke('veri:context', id),
  search: (query: string) => ipcRenderer.invoke('veri:search', query),
  copyText: (text: string) => ipcRenderer.invoke('veri:copy', text),
  setStatus: (id: string, status: string) => ipcRenderer.invoke('veri:set-status', id, status),
  appendNote: (id: string, note: string) => ipcRenderer.invoke('veri:append-note', id, note),
  onChanged: (cb: () => void) => {
    ipcRenderer.on('veri:changed', () => cb());
  },
});
