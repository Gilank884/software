import { contextBridge, ipcRenderer } from 'electron';

// Secure bridge for IPC
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any APIs you need accessible in the renderer process
  getAppVersion: () => process.versions.electron,
  printTestPage: () => ipcRenderer.send('print-test-page'),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
});
